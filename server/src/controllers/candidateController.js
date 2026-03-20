const asyncHandler = require('../middleware/asyncHandler');
const Candidate = require('../models/Candidate');
const { cloudinary } = require('../config/cloudinary');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const {
  extractCandidatesFromText,
  normalizeSubjectCode,
  normalizeSubjectClass,
  buildSubjectKey,
  readUploadedFileBuffer,
} = require('../utils/candidatePdfParser');

const withTimeout = (promise, timeoutMs, message) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
};

/** Build candidate query from request query params (shared by getCandidates and getCandidateStats) */
function buildCandidateQuery(queryParams) {
  const query = {};

  if (queryParams.search) {
    const escaped = queryParams.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    // Use $and to avoid conflict with academicSessionPlugin's $or on the same query
    query.$and = [
      { $or: [{ name: searchRegex }, { rollNumber: searchRegex }] }
    ];
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  if (queryParams.class) {
    query.class = queryParams.class;
  }

  if (queryParams.schoolCode) {
    query.schoolCode = queryParams.schoolCode;
  } else if (queryParams.schoolName) {
    query.schoolName = queryParams.schoolName;
  }

  if (queryParams.category) {
    query.category = queryParams.category;
  }

  if (queryParams.pwd) {
    query.pwd = queryParams.pwd;
  }

  if (queryParams.subjectCode || queryParams.medium) {
    const subjectMatch = {};
    if (queryParams.subjectCode) subjectMatch.code = queryParams.subjectCode;
    if (queryParams.medium) subjectMatch.medium = queryParams.medium;
    query.subjectCodes = { $elemMatch: subjectMatch };
  }

  return query;
}

// @desc    Get all candidates
// @route   GET /api/candidates
// @access  Private
const getCandidates = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = buildCandidateQuery(req.query);

  const candidates = await Candidate.find(query)
    .populate('subjects', 'name code')
    .populate('createdBy', 'name email')
    .sort({ rollNumber: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Candidate.countDocuments(query);

  res.status(200).json({
    success: true,
    count: candidates.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: candidates
  });
});

// @desc    Get single candidate
// @route   GET /api/candidates/:id
// @access  Private
const mapAnswerSheetToLabel = (answerSheet) => {
  if (!answerSheet || answerSheet === 'none') return null;
  const map = { '32_pages': '32 Pages', '20_pages': '20 Pages', '40_graph': '40 Graph', drawing_sheets: 'Drawing Sheets' };
  return map[answerSheet] || answerSheet;
};

const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .populate('subjects', 'name code class credits answerSheet')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  const candidateData = candidate.toObject();

  try {
    const CBSEDatesheet = require('../models/CBSEDatesheet');
    const SeatingPlanAllocation = require('../models/SeatingPlanAllocation');
    const Room = require('../models/Room');
    const DutyAssignment = require('../models/DutyAssignment');

    const seatingPlanBuilder = require('../utils/seatingPlanBuilder');

    const cbseDatesheet = await CBSEDatesheet.getActive();
    const examDateBySubjectKey = new Map();
    const answerSheetBySubjectKey = new Map();
    const entrySortKeyBySubjectKey = new Map();

    if (cbseDatesheet?.entries?.length) {
      cbseDatesheet.entries.forEach((entry) => {
        const key = buildSubjectKey(entry?.subject?.code, entry?.subject?.class);
        if (!key || key.endsWith('-')) return;

        const examDate = entry?.examDate ? new Date(entry.examDate) : null;
        if (!examDate || Number.isNaN(examDate.getTime())) return;

        const existing = examDateBySubjectKey.get(key);
        if (!existing || examDate < existing) {
          examDateBySubjectKey.set(key, examDate);
          if (entry.answerSheet) answerSheetBySubjectKey.set(key, entry.answerSheet);
          entrySortKeyBySubjectKey.set(key, seatingPlanBuilder.getEntrySortKey(entry));
        }
      });
    }

    if (Array.isArray(candidateData.subjects) && candidateData.subjects.length > 0) {
      const rollNo = String(candidateData.rollNumber || '').trim().toUpperCase();
      const dutyCache = new Map();

      candidateData.subjects = candidateData.subjects
        .map((subject) => {
          const classValue = subject.class || candidateData.class;
          const examDate = examDateBySubjectKey.get(buildSubjectKey(subject.code, classValue));
          return {
            ...subject,
            examDate: examDate ? examDate.toISOString() : null,
          };
        })
        .sort((a, b) => {
          const aTime = a.examDate ? new Date(a.examDate).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.examDate ? new Date(b.examDate).getTime() : Number.POSITIVE_INFINITY;
          if (aTime !== bTime) return aTime - bTime;
          return String(a.code || '').localeCompare(String(b.code || ''));
        });

      for (const subject of candidateData.subjects) {
        const classValue = subject.class || candidateData.class;
        const entryAnswerSheet = answerSheetBySubjectKey.get(buildSubjectKey(subject.code, classValue));
        subject.answerSheetType = mapAnswerSheetToLabel(entryAnswerSheet || subject.answerSheet) || '—';
        subject.serialNumber = '—';
        subject.roomNo = null;
        subject.invigilator1 = null;
        subject.invigilator2 = null;

        if (!subject.examDate || !rollNo) continue;

        const subjectKey = buildSubjectKey(subject.code, classValue);
        const entrySortKey = entrySortKeyBySubjectKey.get(subjectKey);
        if (!entrySortKey) continue;

        const dateNorm = new Date(subject.examDate).toISOString().slice(0, 10);

        const allocation = await SeatingPlanAllocation.findOne({
          rollNo,
          entrySortKey,
        }).lean();

        if (allocation?.roomNo) {
          subject.roomNo = allocation.roomNo;

          const cacheKey = `${dateNorm}::${allocation.roomNo}`;
          if (!dutyCache.has(cacheKey)) {
            // The seating plan stores zero-padded roomNo (e.g. "05") while
            // the Room document may store the unpadded value (e.g. "5").
            // Try both variants so the lookup succeeds either way.
            const allocRoomNo = allocation.roomNo;
            const unpadded = /^\d+$/.test(allocRoomNo) ? String(parseInt(allocRoomNo, 10)) : allocRoomNo;
            const roomQuery = allocRoomNo === unpadded
              ? { roomNo: allocRoomNo, isActive: true }
              : { roomNo: { $in: [allocRoomNo, unpadded] }, isActive: true };
            const room = await Room.findOne(roomQuery).lean();
            let duty = null;
            if (room) {
              duty = await DutyAssignment.findOne({
                examDate: { $gte: new Date(dateNorm), $lt: new Date(dateNorm + 'T23:59:59.999Z') },
                room: room._id,
                isActive: true,
              })
                .populate('functionary', 'name employeeId')
                .populate('functionary2', 'name employeeId')
                .lean();
            }
            dutyCache.set(cacheKey, duty);
          }

          const duty = dutyCache.get(cacheKey);
          if (duty) {
            subject.invigilator1 = duty.functionary
              ? { name: duty.functionary.name, oasisId: duty.functionary.employeeId }
              : null;
            subject.invigilator2 = duty.functionary2
              ? { name: duty.functionary2.name, oasisId: duty.functionary2.employeeId }
              : null;
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to enrich candidate subjects:', error.message);
  }

  res.status(200).json({
    success: true,
    data: candidateData
  });
});

// @desc    Get answer sheet serial numbers for a candidate's enrolled subjects (slow; call after page load)
// @route   GET /api/candidates/:id/subject-serials
// @access  Private
const getCandidateSubjectSerials = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .select('rollNumber')
    .populate('subjects', 'name code class');

  if (!candidate) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  const rollNo = String(candidate.rollNumber || '').trim().toUpperCase();
  if (!rollNo) {
    return res.status(200).json({ success: true, data: { serials: [] } });
  }

  const CBSEDatesheet = require('../models/CBSEDatesheet');
  const seatingPlanBuilder = require('../utils/seatingPlanBuilder');

  const cbseDatesheet = await CBSEDatesheet.getActive();
  const examDateBySubjectKey = new Map();
  const entryIdBySubjectKey = new Map();

  if (cbseDatesheet?.entries?.length) {
    cbseDatesheet.entries.forEach((entry) => {
      const key = buildSubjectKey(entry?.subject?.code, entry?.subject?.class);
      if (!key || key.endsWith('-')) return;
      const examDate = entry?.examDate ? new Date(entry.examDate) : null;
      if (!examDate || Number.isNaN(examDate.getTime())) return;
      const existing = examDateBySubjectKey.get(key);
      if (!existing || examDate < existing) {
        examDateBySubjectKey.set(key, examDate);
        if (entry._id) entryIdBySubjectKey.set(key, entry._id.toString());
      }
    });
  }

  let seatingOptions = {};
  try {
    const CentreDetail = require('../models/CentreDetail');
    const SeatingPlanTemplateSetting = require('../models/SeatingPlanTemplateSetting');
    const [centreDetails, templateDoc] = await Promise.all([
      CentreDetail.findOne({}).sort({ updatedAt: -1 }).lean(),
      SeatingPlanTemplateSetting.findOne({}).sort({ updatedAt: -1 }).lean(),
    ]);
    seatingOptions = {
      centreDetails: centreDetails || null,
      roomAllocationMode: templateDoc?.roomAllocationMode || 'auto',
    };
  } catch (e) {
    console.warn('Subject serials: could not load seating options:', e.message);
  }

  const serials = [];
  const subjects = candidate.subjects || [];
  for (const subject of subjects) {
    const classValue = subject.class || candidate.class;
    const key = buildSubjectKey(subject.code, classValue);
    const examDate = examDateBySubjectKey.get(key);
    const entryId = entryIdBySubjectKey.get(key);
    if (!entryId || !examDate) {
      serials.push({ subjectId: subject._id.toString(), serialNumber: null });
      continue;
    }
    const result = await seatingPlanBuilder.getSerialForCandidateInEntry(entryId, rollNo, seatingOptions);
    serials.push({
      subjectId: subject._id.toString(),
      serialNumber: result?.serialNumber || null,
    });
  }

  res.status(200).json({
    success: true,
    data: { serials },
  });
});

// @desc    Create new candidate
// @route   POST /api/candidates
// @access  Private
const createCandidate = asyncHandler(async (req, res) => {
  // Check if roll number already exists
  const existingCandidate = await Candidate.findByRollNumber(req.body.rollNumber);
  if (existingCandidate) {
    return res.status(400).json({
      success: false,
      message: 'Candidate with this roll number already exists'
    });
  }

  const candidateData = {
    ...req.body,
    createdBy: req.user.id
  };

  const candidate = await Candidate.create(candidateData);

  res.status(201).json({
    success: true,
    data: candidate
  });
});

// @desc    Update candidate
// @route   PUT /api/candidates/:id
// @access  Private
const updateCandidate = asyncHandler(async (req, res) => {
  let candidate = await Candidate.findById(req.params.id);

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  // Check if roll number is being changed and if it already exists
  if (req.body.rollNumber && req.body.rollNumber !== candidate.rollNumber) {
    const existingCandidate = await Candidate.findByRollNumber(req.body.rollNumber);
    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: 'Candidate with this roll number already exists'
      });
    }
  }

  const updateData = {
    ...req.body,
    updatedBy: req.user.id
  };

  if (req.body.subjectCodes) {
    const Subject = require('../models/Subject');
    const allSubjects = await Subject.find({ isActive: true });
    const subjectMap = new Map();
    allSubjects.forEach((s) => {
      const key = `${(s.code || '').toUpperCase()}-${s.class}`;
      subjectMap.set(key, s);
    });
    const candidateClass = (req.body.class || candidate.class || '').toString().trim();
    const linkedSubjects = [];
    const linkedIds = new Set();
    for (const sc of req.body.subjectCodes) {
      const code = (typeof sc === 'string' ? sc : sc.code || '').trim().toUpperCase();
      if (!code) continue;
      const classesToTry = candidateClass ? [candidateClass] : ['10th', '12th'];
      for (const cls of classesToTry) {
        const subject = subjectMap.get(`${code}-${cls}`);
        if (subject && !linkedIds.has(subject._id.toString())) {
          linkedSubjects.push(subject._id);
          linkedIds.add(subject._id.toString());
          break;
        }
      }
    }
    updateData.subjects = linkedSubjects;
  }

  candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('subjects', 'name code');

  res.status(200).json({
    success: true,
    data: candidate
  });
});

// @desc    Delete candidate
// @route   DELETE /api/candidates/:id
// @access  Private
const deleteCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  // Delete associated cloudinary image if exists
  if (candidate.importedFrom && candidate.importedFrom.cloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(candidate.importedFrom.cloudinaryPublicId);
    } catch (error) {
      console.error('Error deleting cloudinary file:', error);
    }
  }

  await candidate.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Candidate deleted successfully'
  });
});

// @desc    Import candidates from PDF
// @route   POST /api/candidates/import
// @access  Private
const importCandidatesFromPDF = asyncHandler(async (req, res) => {
  console.log('Import request received');
  console.log('Files:', req.files);

  if (!req.files || !req.files.pdf) {
    console.log('No PDF file in request');
    return res.status(400).json({
      success: false,
      message: 'Please upload a PDF file'
    });
  }

  const pdfFile = req.files.pdf;
  console.log('PDF file details:', { name: pdfFile.name, size: pdfFile.size, mimetype: pdfFile.mimetype });

  // Validate file type
  if (!pdfFile.mimetype || !pdfFile.mimetype.includes('pdf')) {
    console.log('Invalid file type:', pdfFile.mimetype);
    return res.status(400).json({
      success: false,
      message: 'Please upload a valid PDF file'
    });
  }

  try {
    const CandidateModel = req.models?.Candidate || Candidate;
    const SubjectModel = req.models?.Subject || require('../models/Subject');
    console.log('Starting PDF processing...');

    console.log('Reading PDF file...');
    const pdfBuffer = readUploadedFileBuffer(pdfFile);
    console.log('Parsing PDF content...');
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;
    console.log('PDF parsed, text length:', pdfText.length);

    // Extract candidate information from PDF text
    console.log('Extracting candidates...');
    const candidates = extractCandidatesFromText(pdfText);
    console.log('Extracted candidates:', candidates.length);

    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidate data found in the PDF. Please check the format.'
      });
    }

    // Optional archival upload. Do not fail import if this fails.
    let cloudinaryResult = null;
    try {
      const uploadInput = pdfFile.tempFilePath || pdfBuffer;
      console.log('Uploading to Cloudinary (best-effort)...');
      cloudinaryResult = await withTimeout(
        cloudinary.uploader.upload(uploadInput, {
          resource_type: 'raw',
          folder: 'candidates/pdfs',
          public_id: `candidate_list_${Date.now()}`
        }),
        8000,
        'Cloudinary upload timed out'
      );
      console.log('Cloudinary upload complete');
    } catch (uploadError) {
      console.warn('Cloudinary upload skipped:', uploadError.message);
    }

    // Process and save candidates
    console.log('Processing candidates for database...');
    const savedCandidates = [];
    const errors = [];

    // Get all roll numbers to check for duplicates in one query
    const rollNumbers = candidates.map(c => c.rollNumber).filter(Boolean);
    const existingCandidates = await CandidateModel.find({
      rollNumber: { $in: rollNumbers }
    }).select('rollNumber schoolCode schoolName');
    const existingByRollNo = new Map(existingCandidates.map(c => [c.rollNumber, c]));
    const existingRollNumbers = new Set(existingCandidates.map(c => c.rollNumber));

    console.log('Found existing candidates:', existingRollNumbers.size);

    // Fix school codes on existing candidates whose schoolCode was incorrectly stored
    // (e.g. parsed from CENTRE: line instead of SCHOOL: line during a previous import)
    const schoolCodeFixes = [];
    for (const candidateData of candidates) {
      const existing = existingByRollNo.get(candidateData.rollNumber);
      if (!existing) continue;
      if (candidateData.schoolCode && existing.schoolCode !== candidateData.schoolCode) {
        schoolCodeFixes.push({
          updateOne: {
            filter: { rollNumber: candidateData.rollNumber },
            update: { $set: { schoolCode: candidateData.schoolCode, schoolName: candidateData.schoolName } },
          },
        });
      }
    }
    if (schoolCodeFixes.length > 0) {
      await CandidateModel.bulkWrite(schoolCodeFixes, { ordered: false });
      console.log(`Fixed school codes for ${schoolCodeFixes.length} existing candidates`);
    }

    // Prepare candidates for bulk insert
    const candidatesToInsert = [];

    for (const candidateData of candidates) {
      if (existingRollNumbers.has(candidateData.rollNumber)) {
        errors.push({
          rollNumber: candidateData.rollNumber,
          error: 'Candidate already exists'
        });
        continue;
      }

      // Add import metadata
      candidateData.importedFrom = {
        fileName: pdfFile.name,
        uploadDate: new Date(),
        cloudinaryUrl: cloudinaryResult?.secure_url || null,
        cloudinaryPublicId: cloudinaryResult?.public_id || null
      };
      candidateData.createdBy = req.user?.id || null;

      candidatesToInsert.push(candidateData);
    }

    // Bulk insert candidates
    if (candidatesToInsert.length > 0) {
      console.log('Inserting', candidatesToInsert.length, 'candidates...');
      try {
        const insertedCandidates = await CandidateModel.insertMany(candidatesToInsert, {
          ordered: false // Continue on error
        });
        savedCandidates.push(...insertedCandidates);
        console.log('Successfully inserted:', insertedCandidates.length);
      } catch (error) {
        // Handle bulk insert errors
        if (error.writeErrors) {
          error.writeErrors.forEach(err => {
            errors.push({
              rollNumber: err?.err?.op?.rollNumber || err?.op?.rollNumber || 'Unknown',
              error: err?.err?.errmsg || err?.err?.message || err?.message || 'Bulk insert error'
            });
          });
          // Add successfully inserted documents
          if (error.insertedDocs) {
            savedCandidates.push(...error.insertedDocs);
          }
        } else {
          console.error('Bulk insert error:', error);
        }
      }
    }

        // Automatically create and link subjects for imported candidates (best-effort)
    let linkedCount = 0;
    let createdSubjectsCount = 0;
    if (savedCandidates.length > 0) {
      try {
        console.log('Linking subjects for imported candidates...');

        // Get all existing subjects for reference
        const subjects = await SubjectModel.find({ isActive: true });
        const subjectMap = new Map();
        subjects.forEach(subject => {
          const key = `${subject.code}-${subject.class}`;
          subjectMap.set(key, subject);
        });

        // Collect unique code+class pairs that have no matching Subject yet
        const missingSubjects = new Map(); // key -> { code, class }
        for (const candidate of savedCandidates) {
          if (!candidate.subjectCodes || !candidate.class) continue;
          for (const subjectCode of candidate.subjectCodes) {
            const code = (subjectCode.code || '').toString().trim().toUpperCase();
            if (!code) continue;
            const key = `${code}-${candidate.class}`;
            if (!subjectMap.has(key) && !missingSubjects.has(key)) {
              missingSubjects.set(key, { code, class: candidate.class });
            }
          }
        }

        // Auto-create stub subjects for any missing code+class pairs
        if (missingSubjects.size > 0) {
          const stubs = Array.from(missingSubjects.values()).map(({ code, class: cls }) => ({
            code,
            class: cls,
            name: `Subject ${code}`,
            duration: 3,
            answerSheet: 'none',
            isActive: true,
          }));
          console.log(`Auto-creating ${stubs.length} stub subjects...`);
          try {
            const inserted = await SubjectModel.insertMany(stubs, { ordered: false });
            createdSubjectsCount = inserted.length;
          } catch (insertErr) {
            // ordered: false — partial inserts are fine; duplicate-key errors are expected on re-import
            createdSubjectsCount = insertErr.insertedDocs ? insertErr.insertedDocs.length : 0;
          }
          // Refresh the subject map with newly created stubs
          const updatedSubjects = await SubjectModel.find({ isActive: true });
          subjectMap.clear();
          updatedSubjects.forEach(subject => {
            subjectMap.set(`${subject.code}-${subject.class}`, subject);
          });
          console.log(`Created ${createdSubjectsCount} stub subjects, subject map refreshed`);
        }

        // Link subjects for each candidate
        for (const candidate of savedCandidates) {
          if (candidate.subjectCodes && candidate.subjectCodes.length > 0) {
            const linkedSubjects = [];

            for (const subjectCode of candidate.subjectCodes) {
              const code = (subjectCode.code || '').toString().trim().toUpperCase();
              if (!code) continue;
              const key = `${code}-${candidate.class}`;
              const subject = subjectMap.get(key);

              if (subject) {
                linkedSubjects.push(subject._id);
              }
            }

            if (linkedSubjects.length > 0) {
              candidate.subjects = linkedSubjects;
              await candidate.save();
              linkedCount++;
            }
          }
        }

        console.log(`Linked subjects for ${linkedCount}/${savedCandidates.length} candidates`);
      } catch (linkError) {
        console.error('Subject linking skipped due to error:', linkError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${savedCandidates.length} candidates`,
      data: {
        imported: savedCandidates.length,
        errors: errors.length,
        candidates: savedCandidates,
        errorDetails: errors,
        linkedSubjects: linkedCount,
        createdSubjects: createdSubjectsCount,
        pdfUrl: cloudinaryResult?.secure_url || null
      }
    });

  } catch (error) {
    console.error('PDF import error:', error);
    res.status(500).json({
      success: false,
      message: `Error processing PDF file: ${error.message}`,
      error: error.message
    });
  } finally {
    if (pdfFile.tempFilePath && fs.existsSync(pdfFile.tempFilePath)) {
      fs.unlinkSync(pdfFile.tempFilePath);
    }
  }
});

// @desc    Get candidates statistics (supports same filter params as getCandidates)
// @route   GET /api/candidates/stats
// @access  Private
const getCandidateStats = asyncHandler(async (req, res) => {
  const baseQuery = buildCandidateQuery(req.query);

  const stats = await Promise.all([
    Candidate.countDocuments(baseQuery),
    Candidate.countDocuments({ ...baseQuery, class: '10th' }),
    Candidate.countDocuments({ ...baseQuery, class: '12th' }),
    Candidate.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Candidate.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalCandidates: stats[0],
      class10th: stats[1],
      class12th: stats[2],
      byCourse: stats[3],
      byDepartment: stats[4]
    }
  });
});

// @desc    Remove a specific subject code from all candidates of a given class
// @route   DELETE /api/candidates/subject-code
// @access  Private/Admin
const removeSubjectCodeFromCandidates = asyncHandler(async (req, res) => {
  const { subjectCode, class: classLevel, cascadeCleanup } = req.body;

  if (!subjectCode || !classLevel) {
    return res.status(400).json({
      success: false,
      message: 'subjectCode and class are required',
    });
  }

  const normalizedCode = normalizeSubjectCode(subjectCode);
  const normalizedClass = normalizeSubjectClass(classLevel);

  const CandidateModel = req.models?.Candidate || Candidate;
  const SubjectModel = req.models?.Subject || require('../models/Subject');

  // Find candidates that have this subject code
  const affectedCandidates = await CandidateModel.find({
    class: normalizedClass,
    'subjectCodes.code': normalizedCode,
  });

  if (affectedCandidates.length === 0) {
    return res.status(404).json({
      success: false,
      message: `No candidates found with subject code ${normalizedCode} in class ${normalizedClass}`,
    });
  }

  // Find the Subject document to get its ObjectId
  const subjectDoc = await SubjectModel.findOne({
    code: normalizedCode,
    class: normalizedClass,
  });

  const rollNumbers = affectedCandidates.map((c) => c.rollNumber);

  // Pull the subject code from subjectCodes array
  await CandidateModel.updateMany(
    { class: normalizedClass, 'subjectCodes.code': normalizedCode },
    { $pull: { subjectCodes: { code: normalizedCode } } }
  );

  // Pull the Subject ObjectId from subjects array if the Subject doc exists
  if (subjectDoc) {
    await CandidateModel.updateMany(
      { class: normalizedClass, subjects: subjectDoc._id },
      { $pull: { subjects: subjectDoc._id } }
    );
  }

  // Cascade cleanup: remove seating plan allocations for this subject
  let cleanedAllocations = 0;
  if (cascadeCleanup) {
    const SeatingPlanAllocation =
      req.models?.SeatingPlanAllocation ||
      require('../models/SeatingPlanAllocation');
    const result = await SeatingPlanAllocation.deleteMany({
      subjectCode: normalizedCode,
      className: normalizedClass,
    });
    cleanedAllocations = result.deletedCount || 0;
  }

  res.status(200).json({
    success: true,
    message: `Removed subject code ${normalizedCode} from ${affectedCandidates.length} candidate(s)`,
    data: {
      affectedCandidates: affectedCandidates.length,
      rollNumbers,
      cleanedAllocations,
      subjectCode: normalizedCode,
      class: normalizedClass,
    },
  });
});

module.exports = {
  getCandidates,
  getCandidate,
  getCandidateSubjectSerials,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  importCandidatesFromPDF,
  getCandidateStats,
  removeSubjectCodeFromCandidates
};

