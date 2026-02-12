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

// @desc    Get all candidates
// @route   GET /api/candidates
// @access  Private
const getCandidates = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { name: searchRegex },
      { rollNumber: searchRegex }
    ];
  }

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by class
  if (req.query.class) {
    query.class = req.query.class;
  }

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
const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .populate('subjects', 'name code credits')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!candidate) {
    return res.status(404).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  res.status(200).json({
    success: true,
    data: candidate
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
    }).select('rollNumber');
    const existingRollNumbers = new Set(existingCandidates.map(c => c.rollNumber));

    console.log('Found existing candidates:', existingRollNumbers.size);

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
  // 2) Compact numeric CBSE line (e.g., "12345678JOHN DOE")
  const rollNumberPatternWithSpace = /^([A-Z]{1,5}\d{4,12})\s+(.+)$/i;
  const rollNumberPatternCompact = /^(\d{8})(.+)$/;
  const isRollNumberLine = (value) =>
    rollNumberPatternWithSpace.test(value) || rollNumberPatternCompact.test(value);

  // Pattern for date of birth (DD.MM.YYYY)
  const dobPattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;

  // Pattern for school/centre line with code
  const schoolPattern = /(?:CENTRE|SCHOOL)\s*[:：-]\s*(\d+)\s+(.+?)(?:ROHTAK|$)/i;

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

      // Extract FLC if present (single letter followed by space at start of name)
      let flc = '';
      if (candidateName.length > 2 && /^[A-Z]\s/.test(candidateName)) {
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

      // Line i+1: Mother Name
      if (i + lineOffset < lines.length) {
        const motherName = lines[i + lineOffset].trim();
        if (motherName && !isRollNumberLine(motherName) && motherName.length > 1) {
          candidate.motherName = motherName;
        }
        lineOffset++;
      }

      // Line i+2: Father Name
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
        if (!digits || digits.length % 3 !== 0) return;
        for (let k = 0; k < digits.length; k += 3) {
          subjectCodes.push({ code: digits.substring(k, k + 3), medium: '' });
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

      if (i + lineOffset < lines.length) {
        const firstSubjectLine = lines[i + lineOffset].trim();
        const combinedCodesAndDob = firstSubjectLine.match(/^(\d{6,24})(\d{2}\.\d{2}\.\d{4})$/);

        // Some rows pack all subject codes and DOB into one line:
        // e.g., 18400204108608740212.06.2011
        if (combinedCodesAndDob && combinedCodesAndDob[1].length % 3 === 0) {
          addGroupedSubjectCodes(combinedCodesAndDob[1]);
          setDobFromString(combinedCodesAndDob[2]);
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
          const currentCombinedCodesAndDob = currentLine.match(/^(\d{6,24})(\d{2}\.\d{2}\.\d{4})$/);

          if (currentCombinedCodesAndDob && currentCombinedCodesAndDob[1].length % 3 === 0) {
            addGroupedSubjectCodes(currentCombinedCodesAndDob[1]);
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

// @desc    Get candidates statistics
// @route   GET /api/candidates/stats
// @access  Private
const getCandidateStats = asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    Candidate.countDocuments({}),
    Candidate.countDocuments({ class: '10th' }),
    Candidate.countDocuments({ class: '12th' }),
    Candidate.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Candidate.aggregate([
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
  createCandidate,
  updateCandidate,
  deleteCandidate,
  importCandidatesFromPDF,
  getCandidateStats
};

