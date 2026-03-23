const asyncHandler = require('../middleware/asyncHandler');
const OnboardingSession = require('../models/OnboardingSession');
const { extractCandidatesFromText, readUploadedFileBuffer } = require('../utils/candidatePdfParser');
const form66Parser = require('../utils/form66Parser');
const { parseAttendanceSheetPdf } = require('../utils/attendanceSheetParser');
const { generateOnboardingReport } = require('../utils/onboardingValidator');
const pdfParse = require('pdf-parse');
const { cloudinary } = require('../config/cloudinary');
const { attendanceQueue, isAttendanceQueueEnabled } = require('../queues/attendanceQueue');
const { Job } = require('bullmq');

/**
 * Get current onboarding session status
 */
const getOnboardingStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const OnboardingSessionModel = req.models?.OnboardingSession || OnboardingSession;

  const session = await OnboardingSessionModel.findOne({ userId })
    .sort({ createdAt: -1 })
    .limit(1);

  if (!session) {
    return res.json({
      success: true,
      hasSession: false,
      isComplete: false
    });
  }

  const isComplete = !!session.completedAt;

  res.json({
    success: true,
    hasSession: true,
    isComplete,
    session
  });
});

/**
 * Start new onboarding session
 */
const startOnboarding = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { sessionType = 'initial' } = req.body;
  const OnboardingSessionModel = req.models?.OnboardingSession || OnboardingSession;

  const session = new OnboardingSessionModel({
    userId,
    sessionType,
    steps: {
      candidateImportX: { status: 'pending' },
      candidateImportXII: { status: 'pending' },
      form66UploadX: { status: 'pending' },
      form66UploadXII: { status: 'pending' },
      attendanceUploadX: { status: 'pending' },
      attendanceUploadXII: { status: 'pending' }
    },
    validationReport: {
      overallStatus: 'valid'
    }
  });

  await session.save();

  res.status(201).json({
    success: true,
    message: 'Onboarding session started',
    session
  });
});

/**
 * Complete a step in the onboarding process
 */
const completeStep = asyncHandler(async (req, res) => {
  const { stepNumber } = req.params;
  const userId = req.user._id;
  const OnboardingSessionModel = req.models?.OnboardingSession || OnboardingSession;

  // Get active session
  const session = await OnboardingSessionModel.findOne({
    userId,
    completedAt: null
  }).sort({ createdAt: -1 });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'No active onboarding session found'
    });
  }

  // Map step numbers to step names
  const stepMap = {
    '1': 'candidateImportX',
    '2': 'candidateImportXII',
    '3': 'form66UploadX',
    '4': 'form66UploadXII',
    '5': 'attendanceUploadX',
    '6': 'attendanceUploadXII'
  };

  const stepName = stepMap[stepNumber];
  if (!stepName) {
    return res.status(400).json({
      success: false,
      message: 'Invalid step number'
    });
  }

  // Process based on step type
  let result;
  if (stepName.startsWith('candidateImport')) {
    result = await processCandidateImport(req, stepName);
  } else if (stepName.startsWith('form66Upload')) {
    result = await processForm66Upload(req, stepName);
  } else if (stepName.startsWith('attendanceUpload')) {
    result = await processAttendanceUpload(req, stepName);
  }

  // Update session step
  session.steps[stepName] = {
    status: 'completed',
    completedAt: new Date(),
    recordCount: result.recordCount,
    fileUrl: result.fileUrl,
    validationWarnings: result.warnings || []
  };

  await session.save();

  res.json({
    success: true,
    message: `Step ${stepNumber} completed`,
    session,
    result
  });
});

/**
 * Process candidate import (Steps 1 & 2)
 *
 * Class conventions:
 *   candidatePdfParser returns class as '10th' / '12th'
 *   Candidate schema enum:  ['10th', '12th', '']
 *   Subject  schema enum:   ['10th', '12th']        (STUDENT_CLASSES constant)
 *   Form66   schema enum:   ['X', 'XII']
 *
 * So for Candidate / Subject operations use candidateClass ('10th'/'12th').
 * For Form66 operations use classType ('X'/'XII').
 */
async function processCandidateImport(req, stepName) {
  // classType drives Form66 & step key ('X' | 'XII')
  const classType = stepName.includes('XII') ? 'XII' : 'X';
  // candidateClass is the value stored in Candidate.class ('10th' | '12th')
  const candidateClass = classType === 'X' ? '10th' : '12th';

  if (!req.files || !req.files.pdf) {
    throw new Error('Please upload a PDF file');
  }

  const pdfFile = req.files.pdf;
  const CandidateModel = req.models?.Candidate;
  const SubjectModel = req.models?.Subject;

  // Parse PDF — parser already returns class as '10th' / '12th', no conversion needed
  const pdfBuffer = readUploadedFileBuffer(pdfFile);
  const pdfData = await pdfParse(pdfBuffer);
  const rawCandidates = extractCandidatesFromText(pdfData.text);

  // Filter by class using the schema-correct value ('10th' | '12th')
  const classCandidates = rawCandidates.filter(c => c.class === candidateClass);

  if (classCandidates.length === 0) {
    const classDist = rawCandidates.reduce((acc, c) => {
      acc[c.class || 'unknown'] = (acc[c.class || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    throw new Error(
      `No Class ${classType} candidates found in PDF. ` +
      `Found ${rawCandidates.length} total candidates with classes: ${JSON.stringify(classDist)}`
    );
  }

  // Upload original PDF to Cloudinary for audit trail
  let cloudinaryResult = null;
  try {
    const uploadInput = pdfFile.tempFilePath || pdfBuffer;
    cloudinaryResult = await cloudinary.uploader.upload(uploadInput, {
      resource_type: 'raw',
      folder: 'onboarding/candidates',
      public_id: `candidates_${classType}_${Date.now()}`
    });
  } catch (error) {
    console.warn('[onboarding] Cloudinary upload failed:', error.message);
  }

  // Build importedFrom metadata (mirrors candidateController.importCandidatesFromPDF)
  const importedFrom = {
    fileName: pdfFile.name || pdfFile.originalname || `candidates_${classType}.pdf`,
    uploadDate: new Date(),
    cloudinaryUrl: cloudinaryResult?.secure_url || null,
    cloudinaryPublicId: cloudinaryResult?.public_id || null,
  };

  // Skip duplicates by roll number
  const rollNumbers = classCandidates.map(c => c.rollNumber);
  const existingCandidates = await CandidateModel.find({ rollNumber: { $in: rollNumbers } });
  const existingRollNumbers = new Set(existingCandidates.map(c => c.rollNumber));

  const newCandidates = classCandidates
    .filter(c => !existingRollNumbers.has(c.rollNumber))
    .map(c => ({ ...c, importedFrom }));

  // Insert new candidates; ordered:false lets Mongo continue past duplicates
  let savedCandidates = [];
  if (newCandidates.length > 0) {
    try {
      const inserted = await CandidateModel.insertMany(newCandidates, { ordered: false });
      savedCandidates = inserted;
    } catch (insertErr) {
      if (insertErr.code === 11000 || insertErr.name === 'BulkWriteError') {
        savedCandidates = insertErr.insertedDocs || [];
      } else {
        throw insertErr;
      }
    }
  }

  // ─── Subject linking ────────────────────────────────────────────────────────
  // Without this step, candidate.subjects (ObjectId refs) stays empty and the
  // entire app — seating plans, Form 66, dashboard counts — shows no data.
  // Mirrors candidateController.importCandidatesFromPDF (lines 603-687).
  if (savedCandidates.length > 0 && SubjectModel) {
    try {
      // Fetch existing subjects; Subject.class also uses '10th'/'12th'
      const allSubjects = await SubjectModel.find({ isActive: true });
      const subjectMap = new Map();
      allSubjects.forEach(s => subjectMap.set(`${s.code}-${s.class}`, s));

      // Auto-create stub Subject records for any code+class not yet in the DB
      const missingSubjects = new Map();
      for (const candidate of savedCandidates) {
        if (!candidate.subjectCodes || !candidate.class) continue;
        for (const sc of candidate.subjectCodes) {
          const code = (sc.code || '').toString().trim().toUpperCase();
          if (!code) continue;
          const key = `${code}-${candidate.class}`;  // e.g. '041-10th'
          if (!subjectMap.has(key) && !missingSubjects.has(key)) {
            missingSubjects.set(key, { code, class: candidate.class });
          }
        }
      }

      if (missingSubjects.size > 0) {
        const stubs = Array.from(missingSubjects.values()).map(({ code, class: cls }) => ({
          code,
          class: cls,           // '10th' or '12th' — matches Subject schema enum
          name: `Subject ${code}`,
          duration: 3,
          answerSheet: 'none',
          isActive: true,
        }));
        try {
          await SubjectModel.insertMany(stubs, { ordered: false });
        } catch { /* partial inserts are fine — duplicates expected on reimport */ }

        // Refresh map with newly created stubs
        const refreshed = await SubjectModel.find({ isActive: true });
        subjectMap.clear();
        refreshed.forEach(s => subjectMap.set(`${s.code}-${s.class}`, s));
      }

      // Resolve subjectCodes (strings) → subjects (ObjectId refs) and save
      let linkedCount = 0;
      for (const candidate of savedCandidates) {
        if (!candidate.subjectCodes || candidate.subjectCodes.length === 0) continue;
        const linkedSubjects = [];
        for (const sc of candidate.subjectCodes) {
          const code = (sc.code || '').toString().trim().toUpperCase();
          if (!code) continue;
          const subject = subjectMap.get(`${code}-${candidate.class}`);
          if (subject) linkedSubjects.push(subject._id);
        }
        if (linkedSubjects.length > 0) {
          candidate.subjects = linkedSubjects;
          await candidate.save();
          linkedCount++;
        }
      }
      console.log(`[onboarding] Linked subjects for ${linkedCount}/${savedCandidates.length} candidates (Class ${classType})`);
    } catch (linkErr) {
      // Non-fatal — candidates are in DB, just without subject links
      console.error('[onboarding] Subject linking failed:', linkErr.message);
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  return {
    recordCount: classCandidates.length,
    fileUrl: cloudinaryResult?.secure_url || null,
    imported: savedCandidates.length,
    skipped: classCandidates.length - savedCandidates.length,
    warnings: []
  };
}

/**
 * Process Form 66 upload (Steps 3 & 4)
 *
 * Form66 schema stores class as 'X' / 'XII' — classType is correct for these queries.
 * Candidate schema stores class as '10th' / '12th' — use candidateClass for candidate queries.
 */
async function processForm66Upload(req, stepName) {
  const classType = stepName.includes('XII') ? 'XII' : 'X';
  const candidateClass = classType === 'X' ? '10th' : '12th';

  if (!req.files || !req.files.txt) {
    throw new Error('Please upload a TXT file');
  }

  const txtFile = req.files.txt;
  const Form66Model = req.models?.Form66;
  const Form66UploadModel = req.models?.Form66Upload;
  const CandidateModel = req.models?.Candidate;

  // Parse Form 66 text file
  const txtBuffer = readUploadedFileBuffer(txtFile);
  const txtContent = txtBuffer.toString('utf-8');
  const rawForm66Records = form66Parser.parseTextFile(txtContent);

  // Normalise: parser stores a single rollNo per record; expose it as rollNumbers[] so
  // downstream validators (which iterate record.rollNumbers) work correctly.
  const form66Records = rawForm66Records.map(r => ({
    ...r,
    rollNumber: r.rollNo,                       // align with candidate field name
    rollNumbers: r.rollNumbers ?? [r.rollNo],   // array expected by form66Validator
  }));

  // Filter by class — Form66 parser emits 'X' / 'XII' so classType is correct here
  const classRecords = form66Records.filter(r => r.class === classType);

  if (classRecords.length === 0) {
    throw new Error(`No Class ${classType} records found in Form 66`);
  }

  // Upload original file to Cloudinary for audit trail
  let cloudinaryResult = null;
  try {
    const uploadInput = txtFile.tempFilePath || txtBuffer;
    cloudinaryResult = await cloudinary.uploader.upload(uploadInput, {
      resource_type: 'raw',
      folder: 'onboarding/form66',
      public_id: `form66_${classType}_${Date.now()}`
    });
  } catch (error) {
    console.warn('[onboarding] Cloudinary upload failed:', error.message);
  }

  // Validate Form 66 roll numbers against imported candidates
  // Candidate.class is '10th'/'12th' so use candidateClass for this query
  const candidates = await CandidateModel.find({ class: candidateClass });
  const { validateForm66AgainstCandidates } = require('../utils/form66Validator');
  const validation = validateForm66AgainstCandidates(classRecords, candidates);

  // Replace existing Form 66 records for this class
  await Form66Model.deleteMany({ class: classType });
  if (classRecords.length > 0) {
    await Form66Model.insertMany(classRecords, { ordered: false });
  }

  // Create Form66Upload audit record (mirrors form66Controller behaviour)
  if (Form66UploadModel) {
    try {
      await Form66UploadModel.create({
        originalFileName: txtFile.name || txtFile.originalname || `form66_${classType}.txt`,
        originalFileUrl: cloudinaryResult?.secure_url || null,
        originalFilePublicId: cloudinaryResult?.public_id || null,
        recordCount: classRecords.length,
        dateCount: new Set(classRecords.map(r => r.examDate?.toString()).filter(Boolean)).size,
        uploadedClasses: [classType],
        status: 'completed',
      });
    } catch (uploadRecordErr) {
      // Non-fatal — the Form66 records are already saved
      console.warn('[onboarding] Form66Upload record creation failed:', uploadRecordErr.message);
    }
  }

  return {
    recordCount: classRecords.length,
    fileUrl: cloudinaryResult?.secure_url || null,
    warnings: validation.isValid ? [] : [
      `${validation.totalMismatches} validation issues found`
    ],
    validation
  };
}

/**
 * Process attendance sheet upload (Steps 5 & 6)
 *
 * CBSE attendance sheets are typically consolidated tabular PDFs, not one-per-page
 * photo documents, so the photo extractor may return 0 results. This step is
 * intentionally non-blocking — 0 photos produces a warning, not an error.
 */
async function processAttendanceUpload(req, stepName) {
  const classType = stepName.includes('XII') ? 'XII' : 'X';
  const candidateClass = classType === 'X' ? '10th' : '12th';

  if (!req.files || !req.files.pdf) {
    throw new Error('Please upload a PDF file');
  }

  const pdfFile = req.files.pdf;
  const CandidateModel = req.models?.Candidate;

  // Attempt to extract per-candidate photos from the PDF
  const pdfBuffer = readUploadedFileBuffer(pdfFile);
  const { data: photoRecords, errors: parseErrors } = await parseAttendanceSheetPdf(pdfBuffer);

  // Candidate.class is '10th'/'12th' — use candidateClass here
  const candidates = await CandidateModel.find({ class: candidateClass });
  const candidateRollNumbers = new Set(candidates.map(c => c.rollNumber.toUpperCase()));

  const classPhotoRecords = (photoRecords || []).filter(r =>
    candidateRollNumbers.has((r.rollNumber || '').toUpperCase())
  );

  const warnings = [];

  if (parseErrors && parseErrors.length > 0) {
    warnings.push(`PDF parse issues on ${parseErrors.length} page(s): ${parseErrors.slice(0, 3).join('; ')}`);
  }

  if (classPhotoRecords.length === 0) {
    warnings.push(
      `No embedded photos found for Class ${classType} candidates. ` +
      `The attendance sheet has been recorded but no photos were extracted. ` +
      `This is normal if the PDF is a tabular attendance list rather than a photo sheet.`
    );
    // Step completes successfully with a warning — does not block onboarding
    return { recordCount: 0, fileUrl: null, uploaded: 0, warnings };
  }

  // Upload each extracted photo to Cloudinary and link to the matching candidate
  let uploadedCount = 0;
  for (const record of classPhotoRecords) {
    try {
      const photoUpload = await cloudinary.uploader.upload(
        `data:${record.mimeType};base64,${record.imageBuffer.toString('base64')}`,
        {
          folder: 'onboarding/attendance',
          public_id: `photo_${record.rollNumber}_${Date.now()}`
        }
      );

      await CandidateModel.findOneAndUpdate(
        { rollNumber: record.rollNumber.toUpperCase() },
        {
          $set: {
            photoUrl: photoUpload.secure_url,
            photoPublicId: photoUpload.public_id
          }
        }
      );

      uploadedCount++;
    } catch (error) {
      warnings.push(`Failed to process photo for ${record.rollNumber}: ${error.message}`);
    }
  }

  return {
    recordCount: classPhotoRecords.length,
    fileUrl: null,
    uploaded: uploadedCount,
    warnings
  };
}

/**
 * Get validation report
 */
const getValidationReport = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const OnboardingSessionModel = req.models?.OnboardingSession || OnboardingSession;
  const CandidateModel = req.models?.Candidate;
  const Form66Model = req.models?.Form66;

  const session = await OnboardingSessionModel.findOne({
    userId,
    completedAt: null
  }).sort({ createdAt: -1 });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'No active onboarding session found'
    });
  }

  // Candidate.class uses '10th'/'12th'; Form66.class uses 'X'/'XII'
  const candidatesX   = await CandidateModel.find({ class: '10th' });
  const candidatesXII = await CandidateModel.find({ class: '12th' });
  const form66RecordsX   = await Form66Model.find({ class: 'X' });
  const form66RecordsXII = await Form66Model.find({ class: 'XII' });

  // Generate comprehensive cross-validation report
  const report = generateOnboardingReport({
    candidatesX,
    candidatesXII,
    form66RecordsX,
    form66RecordsXII,
    attendanceRecordsX: [],
    attendanceRecordsXII: []
  });

  // Persist report summary back onto the session document
  session.validationReport = {
    candidateCountX: candidatesX.length,
    candidateCountXII: candidatesXII.length,
    form66MismatchesX: report.classX?.form66Validation?.rollNumberMismatches || [],
    form66MismatchesXII: report.classXII?.form66Validation?.rollNumberMismatches || [],
    attendanceMismatchesX: [],
    attendanceMismatchesXII: [],
    overallStatus: report.overallStatus
  };

  await session.save();

  res.json({
    success: true,
    report,
    session
  });
});

/**
 * Complete onboarding
 */
const completeOnboarding = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const OnboardingSessionModel = req.models?.OnboardingSession || OnboardingSession;

  const session = await OnboardingSessionModel.findOne({
    userId,
    completedAt: null
  }).sort({ createdAt: -1 });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'No active onboarding session found'
    });
  }

  session.completedAt = new Date();
  await session.save();

  res.json({
    success: true,
    message: 'Onboarding completed successfully',
    session
  });
});

/**
 * Queue both attendance PDFs for background processing (replaces Steps 5 & 6).
 *
 * Accepts: multipart/form-data with fields `pdfX` (Class X) and `pdfXII` (Class XII).
 * Returns immediately with { jobId } — the heavy work runs in attendanceWorker.
 */
const queueAttendanceUpload = asyncHandler(async (req, res) => {
  if (!isAttendanceQueueEnabled || !attendanceQueue) {
    return res.status(503).json({
      success: false,
      message:
        'Attendance background processing is unavailable. Configure Redis and set REDIS_URL or ATTENDANCE_QUEUE_ENABLED=true.',
    });
  }

  const userId = req.user._id;
  const tenantDbName = req.tenant?.dbName;
  const OnboardingSessionModel = req.models?.OnboardingSession || OnboardingSession;

  if (!tenantDbName) {
    return res.status(400).json({ success: false, message: 'Tenant context not available' });
  }

  if (!req.files?.pdfX || !req.files?.pdfXII) {
    return res.status(400).json({
      success: false,
      message: 'Please upload both Class X (pdfX) and Class XII (pdfXII) attendance PDFs',
    });
  }

  const session = await OnboardingSessionModel.findOne({
    userId,
    completedAt: null,
  }).sort({ createdAt: -1 });

  if (!session) {
    return res.status(404).json({ success: false, message: 'No active onboarding session found' });
  }

  // Pass temp file paths directly to the worker — no Cloudinary upload in the request cycle.
  // express-fileupload is configured with useTempFiles: true so tempFilePath is always set.
  const pdfXFile = req.files.pdfX;
  const pdfXIIFile = req.files.pdfXII;

  if (!pdfXFile.tempFilePath || !pdfXIIFile.tempFilePath) {
    return res.status(500).json({
      success: false,
      message: 'Temp file paths not available. Ensure useTempFiles is enabled in express-fileupload config.',
    });
  }

  const job = await attendanceQueue.add('process-attendance', {
    tenantDbName,
    sessionId: session._id.toString(),
    userId: userId.toString(),
    classXTempPath: pdfXFile.tempFilePath,
    classXIITempPath: pdfXIIFile.tempFilePath,
    userEmail: req.user.email || null,
  });

  res.json({
    success: true,
    jobId: job.id,
    status: 'queued',
    message: 'Attendance sheets queued for background processing. You can safely navigate away.',
  });
});

/**
 * Poll the status and progress of a queued attendance job.
 * GET /onboarding/jobs/:jobId/status
 */
const getJobStatus = asyncHandler(async (req, res) => {
  if (!isAttendanceQueueEnabled || !attendanceQueue) {
    return res.status(503).json({
      success: false,
      message:
        'Attendance background processing is unavailable. Configure Redis and set REDIS_URL or ATTENDANCE_QUEUE_ENABLED=true.',
    });
  }

  const { jobId } = req.params;

  const job = await Job.fromId(attendanceQueue, jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found or has expired' });
  }

  const state = await job.getState();

  res.json({
    success: true,
    jobId: job.id,
    state,
    progress: job.progress ?? null,
    result: state === 'completed' ? job.returnvalue : null,
    failedReason: state === 'failed' ? job.failedReason : null,
  });
});

/**
 * Get onboarding history
 */
const getOnboardingHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const OnboardingSessionModel = req.models?.OnboardingSession || OnboardingSession;

  const sessions = await OnboardingSessionModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    sessions
  });
});

module.exports = {
  getOnboardingStatus,
  startOnboarding,
  completeStep,
  getValidationReport,
  completeOnboarding,
  getOnboardingHistory,
  queueAttendanceUpload,
  getJobStatus,
};
