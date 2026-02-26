const asyncHandler = require('../middleware/asyncHandler');
const Candidate = require('../models/Candidate');
const { cloudinary } = require('../config/cloudinary');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const readUploadedFileBuffer = (file) => {
  if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
    return fs.readFileSync(file.tempFilePath);
  }

  if (file?.data && Buffer.isBuffer(file.data) && file.data.length > 0) {
    return file.data;
  }

  throw new Error('Uploaded file is empty or unavailable');
};

const withTimeout = (promise, timeoutMs, message) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
};

const normalizeSubjectCode = (code) =>
  String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\((?:E|H)\)$/i, '');

const normalizeSubjectClass = (classValue) => {
  const normalized = String(classValue || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (!normalized) return '';
  if (normalized === '10' || normalized === '10th') return '10th';
  if (normalized === '12' || normalized === '12th') return '12th';
  return normalized;
};

const buildSubjectKey = (code, classValue) =>
  `${normalizeSubjectCode(code)}-${normalizeSubjectClass(classValue)}`;

/** Build candidate query from request query params (shared by getCandidates and getCandidateStats) */
function buildCandidateQuery(queryParams) {
  const query = {};

  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, 'i');
    query.$or = [
      { name: searchRegex },
      { rollNumber: searchRegex }
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

    const cbseDatesheet = await CBSEDatesheet.getActive();
    const examDateBySubjectKey = new Map();
    const answerSheetBySubjectKey = new Map();

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

        const examDate = new Date(subject.examDate);
        const dateNorm = examDate.toISOString().slice(0, 10);
        const classNum = String(subject.class || candidateData.class || '').replace(/th$/i, '');
        const subjectCode = normalizeSubjectCode(subject.code);
        const entrySortKey = `${dateNorm}::${String(classNum).padStart(2, '0')}::${subjectCode}`;

        const allocation = await SeatingPlanAllocation.findOne({
          rollNo,
          entrySortKey,
        }).lean();

        if (allocation?.roomNo) {
          subject.roomNo = allocation.roomNo;

          const cacheKey = `${dateNorm}::${allocation.roomNo}`;
          if (!dutyCache.has(cacheKey)) {
            const room = await Room.findOne({ roomNo: allocation.roomNo, isActive: true }).lean();
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

        // Automatically link subjects for imported candidates (best-effort)
    let linkedCount = 0;
    if (savedCandidates.length > 0) {
      try {
        console.log('Linking subjects for imported candidates...');
        
        // Get all subjects for reference
        const subjects = await SubjectModel.find({ isActive: true });
        const subjectMap = new Map();
        subjects.forEach(subject => {
          const key = `${subject.code}-${subject.class}`;
          subjectMap.set(key, subject);
        });
        
        // Link subjects for each candidate
        for (const candidate of savedCandidates) {
          if (candidate.subjectCodes && candidate.subjectCodes.length > 0) {
            const linkedSubjects = [];
            
            for (const subjectCode of candidate.subjectCodes) {
              const key = `${subjectCode.code}-${candidate.class}`;
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

// Helper function to extract candidate data from PDF text
const extractCandidatesFromText = (text) => {
  const candidates = [];
  const lines = text.split('\n').map(line => line.trim());

  // Roll number patterns:
  // 1) Alphanumeric with separator (e.g., "CS2021001 John Doe")
  // 2) Compact numeric CBSE line (e.g., "31194811AARTI") — 8 digits followed immediately by
  //    a letter (name starts right after). Must NOT match pure-digit lines like "184002041".
  const rollNumberPatternWithSpace = /^([A-Z]{1,5}\d{4,12})\s+(.+)$/i;
  const rollNumberPatternCompact = /^(\d{8})([A-Za-z].*)$/;
  const isRollNumberLine = (value) =>
    rollNumberPatternWithSpace.test(value) || rollNumberPatternCompact.test(value);

  // Pattern for date of birth (DD.MM.YYYY)
  const dobPattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;

  // Pattern for school line with code — SCHOOL: only, NOT CENTRE:
  // CENTRE line is the exam centre header and must not be treated as candidate school.
  const schoolPattern = /^SCHOOL\s*[:：-]\s*(\d+)\s+(.+)$/i;

  // Pattern for class/examination type (handles both full and abbreviated forms)
  const classPattern = /(?:SENIOR\s+SEC(?:ONDARY)?|SECONDARY)\s+(?:SCH|SCHOOL)\s+(?:CERT\s+)?EXAMINATION/i;

  // Track current school name, code, and class
  let currentSchoolName = '';
  let currentSchoolCode = '';
  let currentClass = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line contains class/examination information
    const classMatch = line.match(classPattern);
    if (classMatch) {
      const examType = classMatch[0].toUpperCase();
      // Check for SENIOR SEC/SECONDARY first (12th), then SECONDARY (10th)
      if (examType.includes('SENIOR')) {
        currentClass = '12th';
      } else if (examType.includes('SECONDARY')) {
        currentClass = '10th';
      }
      console.log('Found class:', currentClass, 'from line:', line);
      continue;
    }

    // Check if this line contains school/centre information
    const schoolMatch = line.match(schoolPattern);
    if (schoolMatch) {
      currentSchoolCode = schoolMatch[1].trim();
      currentSchoolName = schoolMatch[2].trim();
      console.log('Found school:', currentSchoolCode, '-', currentSchoolName);
      continue;
    }

    // Check if line starts with a roll number
    const rollMatch = line.match(rollNumberPatternCompact) || line.match(rollNumberPatternWithSpace);
    if (rollMatch) {
      const rollNumber = rollMatch[1];
      let candidateName = rollMatch[2].trim();

      // Skip header rows or invalid entries
      if (!candidateName || candidateName.length < 2 || line.includes('Roll No')) {
        continue;
      }

      // Detect case where the PDF packs subject-codes+DOB on the roll number line with no name,
      // e.g. "18400204108608740212.06.2011" → roll=18400204, "name"=108608740212.06.2011
      // The "name" will match \d{6,30} followed by DD.MM.YYYY — it is not a real name.
      let inlineSubjectDigits = null;
      let inlineDob = null;
      const inlinePacked = candidateName.match(/^(\d{6,30})(\d{2}\.\d{2}\.\d{4})$/);
      if (inlinePacked) {
        inlineSubjectDigits = inlinePacked[1];
        inlineDob = inlinePacked[2];
        candidateName = ''; // name will be read from next line
      }

      // Extract FLC if present (single letter followed by space at start of name)
      let flc = '';
      if (!inlinePacked && candidateName.length > 2 && /^[A-Z]\s/.test(candidateName)) {
        flc = candidateName[0];
        candidateName = candidateName.substring(2).trim();
      }

      const candidate = {
        rollNumber: rollNumber,
        name: candidateName,
        flc: flc,
        schoolName: currentSchoolName,
        schoolCode: currentSchoolCode,
        class: currentClass,
        status: 'active',
        subjectCodes: []
      };

      // Parse the next lines for additional information
      let lineOffset = 1;

      // When the roll-number line itself contained packed subject codes+DOB (no name on that line),
      // the very next line is the candidate name, not the mother name.
      if (inlinePacked) {
        if (i + lineOffset < lines.length) {
          const nameFromNextLine = lines[i + lineOffset].trim();
          if (nameFromNextLine && !isRollNumberLine(nameFromNextLine) && !/^\d/.test(nameFromNextLine)) {
            candidate.name = nameFromNextLine;
          }
          lineOffset++;
        }
      }

      // Line i+1 (or i+2 if inlinePacked): Mother Name
      if (i + lineOffset < lines.length) {
        const motherName = lines[i + lineOffset].trim();
        if (motherName && !isRollNumberLine(motherName) && motherName.length > 1) {
          candidate.motherName = motherName;
        }
        lineOffset++;
      }

      // Line i+2 (or i+3 if inlinePacked): Father Name
      if (i + lineOffset < lines.length) {
        const fatherName = lines[i + lineOffset].trim();
        if (fatherName && !isRollNumberLine(fatherName) && fatherName.length > 1) {
          candidate.fatherName = fatherName;
        }
        lineOffset++;
      }

      // Check next line - could be Sex (M/F/G) or an extra surname line
      // If it's not Sex, skip it and check the next line
      if (i + lineOffset < lines.length) {
        const nextLine = lines[i + lineOffset].trim();
        if (nextLine && /^[MFG]$/.test(nextLine)) {
          // This is Sex
          candidate.sex = nextLine;
          lineOffset++;
        } else if (nextLine && nextLine.length > 1 && nextLine.length < 30 && !/^\d/.test(nextLine)) {
          // This might be an extra surname/family name line - skip it
          lineOffset++;
          // Now check for Sex again
          if (i + lineOffset < lines.length) {
            const sex = lines[i + lineOffset].trim();
            if (sex && /^[MFG]$/.test(sex)) {
              candidate.sex = sex;
              lineOffset++;
            }
          }
        } else {
          lineOffset++;
        }
      }

      // Line i+4: Category (G/C/S/NA)
      if (i + lineOffset < lines.length) {
        const category = lines[i + lineOffset].trim();
        if (category && /^[GCS]$/.test(category)) {
          candidate.category = category;
        } else if (category === 'NA') {
          candidate.category = '';
        }
        lineOffset++;
      }

      // Line i+5: PwD (NA or code)
      if (i + lineOffset < lines.length) {
        const pwd = lines[i + lineOffset].trim();
        if (pwd && pwd !== 'NA' && pwd.length <= 5) {
          candidate.pwd = pwd;
        }
        lineOffset++;
      }

      // Lines i+6 onwards: Subject codes and mediums
      // First line after PwD contains first 3 subject codes concatenated (e.g., "184002041")
      // Then alternating: code, medium, code, medium...
      const subjectCodes = [];
      const addGroupedSubjectCodes = (digits) => {
        if (!digits || digits.length < 3) return;
        // Truncate to nearest multiple of 3 to avoid partial codes
        const usable = digits.substring(0, digits.length - (digits.length % 3));
        for (let k = 0; k < usable.length; k += 3) {
          subjectCodes.push({ code: usable.substring(k, k + 3), medium: '' });
        }
      };
      const addDenseSubjectCodes = (digits) => {
        if (!digits || digits.length < 6) return false;
        let normalized = digits;
        const remainder = normalized.length % 3;
        if (remainder !== 0) {
          normalized = normalized.substring(0, normalized.length - remainder);
        }
        if (normalized.length < 6 || normalized.length % 3 !== 0) return false;
        addGroupedSubjectCodes(normalized);
        return true;
      };
      const setDobFromString = (value) => {
        const dobMatch = value.match(dobPattern);
        if (!dobMatch) return false;
        const day = dobMatch[1];
        const month = dobMatch[2];
        const year = dobMatch[3];
        candidate.dateOfBirth = new Date(`${year}-${month}-${day}`);
        return true;
      };

      if (inlinePacked) {
        // Subject codes and DOB were already on the roll number line — apply them directly.
        addGroupedSubjectCodes(inlineSubjectDigits);
        setDobFromString(inlineDob);
      } else if (i + lineOffset < lines.length) {
        const firstSubjectLine = lines[i + lineOffset].trim();
        const combinedCodesAndDob = firstSubjectLine.match(/^(\d{6,30})(\d{2}\.\d{2}\.\d{4})$/);

        // Some rows pack all subject codes and DOB into one line:
        // e.g., 18400204108608740212.06.2011
        const combinedDigits = combinedCodesAndDob?.[1];
        const combinedDob = combinedCodesAndDob?.[2];
        if (combinedDigits && combinedDob && combinedDigits.length >= 6) {
          addGroupedSubjectCodes(combinedDigits);
          setDobFromString(combinedDob);
          lineOffset++;
        }

        // Check if this line contains concatenated subject codes (9 digits = 3 codes)
        else if (/^\d{9}$/.test(firstSubjectLine)) {
          // Extract first 3 subject codes
          subjectCodes.push({ code: firstSubjectLine.substring(0, 3), medium: '' });
          subjectCodes.push({ code: firstSubjectLine.substring(3, 6), medium: '' });
          subjectCodes.push({ code: firstSubjectLine.substring(6, 9), medium: '' });
          lineOffset++;

          // Next line might be medium for the 3rd subject
          if (i + lineOffset < lines.length) {
            const medLine = lines[i + lineOffset].trim();
            if (/^[0-9]$/.test(medLine)) {
              subjectCodes[2].medium = medLine;
              lineOffset++;
            }
          }
        }
        // Handle generic grouped codes line (e.g., 6, 12, 15, 18 digits)
        else if (/^\d{6,30}$/.test(firstSubjectLine)) {
          addDenseSubjectCodes(firstSubjectLine);
          lineOffset++;
        }

        // Continue extracting remaining subject codes (alternating code, medium)
        for (let j = 0; j < 15 && i + lineOffset + j < lines.length; j++) {
          const currentLine = lines[i + lineOffset + j].trim();
          // Match a line that is subject code(s) packed with DOB, e.g. "40231.07.2010" (3 digits + DOB)
          // or "402184031.07.2010" (6+ digits + DOB). Minimum 3 digits before DOB.
          const currentCombinedCodesAndDob = currentLine.match(/^(\d{3,24})(\d{2}\.\d{2}\.\d{4})$/);

          if (currentCombinedCodesAndDob) {
            // Only add as subject codes if digit count is multiple of 3
            if (currentCombinedCodesAndDob[1].length % 3 === 0) {
              addGroupedSubjectCodes(currentCombinedCodesAndDob[1]);
            }
            setDobFromString(currentCombinedCodesAndDob[2]);
            break;
          }

          // Check if this is the date of birth line
          if (setDobFromString(currentLine)) {
            break;
          }

          // Grouped subject codes in a single line
          if (/^\d{6,30}$/.test(currentLine)) {
            addDenseSubjectCodes(currentLine);
            continue;
          }

          // Check if this is a 3-digit subject code
          if (/^\d{3}$/.test(currentLine)) {
            const code = currentLine;
            // Next line might be the medium
            let medium = '';
            if (i + lineOffset + j + 1 < lines.length) {
              const nextLine = lines[i + lineOffset + j + 1].trim();
              if (/^[0-9]$/.test(nextLine)) {
                medium = nextLine;
                j++; // Skip the medium line in next iteration
              }
            }
            subjectCodes.push({ code: code, medium: medium });
            continue;
          }

          // Skip single-digit medium lines that were not consumed by a preceding code
          // (can occur when the first 3-code block's last medium was not pre-consumed)
          if (/^[0-9]$/.test(currentLine)) {
            continue;
          }

          // Stop if we hit another roll number or dash
          if (isRollNumberLine(currentLine) || currentLine === '-') {
            break;
          }
        }
      }

      candidate.subjectCodes = subjectCodes;

      candidates.push(candidate);
    }
  }

  return candidates;
};

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

module.exports = {
  getCandidates,
  getCandidate,
  getCandidateSubjectSerials,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  importCandidatesFromPDF,
  getCandidateStats
};

