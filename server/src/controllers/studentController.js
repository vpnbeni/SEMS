const asyncHandler = require('../middleware/asyncHandler');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { generateResponse, buildPaginationResponse } = require('../utils/helpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS, STUDENT_GENDERS } = require('../utils/constants');
const ExcelJS = require('exceljs');
const path = require('path');
const fsSync = require('fs');
const fs = fsSync.promises;
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId, uploadDocumentToCloudinary, deleteRawFromCloudinary } = require('../config/cloudinary');
const SchoolProfile = require('../models/SchoolProfile');
const {
  reassignClassSections,
  backfillClassRollNumbersIfNeeded,
} = require('../utils/assignClassRollNumbers');

const STUDENT_TEMPLATE_COLUMNS = [
  { key: 'rollNumber', label: 'ADMISSION NO', required: true, aliases: ['ROLL NUMBER'] },
  { key: 'name', label: 'STUDENT NAME', required: true },
  // Keep SECTION right next to CLASS for import template usability.
  { key: 'class', label: 'CLASS', required: true },
  { key: 'section', label: 'SECTION', required: true },
  { key: 'fatherName', label: 'FATHER NAME', required: true },
  { key: 'dateOfBirth', label: 'DATE OF BIRTH', required: true },
  { key: 'gender', label: 'GENDER', required: true },
  { key: 'category', label: 'CATEGORY', required: true },
  { key: 'phone', label: 'MOBILE NUMBER', required: false, aliases: ['STUDENT PHONE'] },
  { key: 'penNumber', label: 'PEN NUMBER', required: false },
];

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return normalizeString(value.text);
  }
  return String(value).trim();
};

const escapeCsvCell = (value) => {
  const stringValue = normalizeString(value).replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
};

const hasAnyNonEmptyValue = (rowValues) => (
  Object.values(rowValues).some((value) => normalizeString(value) !== '')
);

const parseCsvBuffer = (buffer) => {
  const rows = [];
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  let currentCell = '';
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && char === ',') {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (!insideQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = '';
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const getOrdinalSuffix = (value) => {
  const remainderTen = value % 10;
  const remainderHundred = value % 100;
  if (remainderTen === 1 && remainderHundred !== 11) return 'st';
  if (remainderTen === 2 && remainderHundred !== 12) return 'nd';
  if (remainderTen === 3 && remainderHundred !== 13) return 'rd';
  return 'th';
};

const normalizeClassValue = (value) => {
  const raw = normalizeString(value);
  if (!raw) return '';

  const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
  if (normalized === '10' || normalized === '10th' || normalized === 'x' || normalized === 'class 10') return '10th';
  if (normalized === '12' || normalized === '12th' || normalized === 'xii' || normalized === 'class 12') return '12th';

  const numericMatch = normalized.match(/^(?:class\s+)?(\d+)(?:st|nd|rd|th)?$/i);
  if (numericMatch) {
    const classNumber = Number.parseInt(numericMatch[1], 10);
    if (Number.isFinite(classNumber) && classNumber > 0) {
      return `${classNumber}${getOrdinalSuffix(classNumber)}`;
    }
  }

  return raw;
};

const normalizeGenderValue = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return 'Unspecified';
  if (['boy', 'male', 'm'].includes(normalized)) return 'Boy';
  if (['girl', 'female', 'f'].includes(normalized)) return 'Girl';
  if (['other', 'o'].includes(normalized)) return 'Other';
  if (['unspecified', 'na', 'n/a', ''].includes(normalized)) return 'Unspecified';
  return normalizeString(value);
};

const normalizeCategoryValue = (value) => {
  const normalized = normalizeString(value).toUpperCase();
  const categoryMap = {
    GENERAL: 'General',
    OBC: 'OBC',
    SC: 'SC',
    ST: 'ST',
    EWS: 'EWS',
  };
  return categoryMap[normalized] || normalizeString(value);
};

const normalizeSectionValue = (value) => normalizeString(value).replace(/\s+/g, ' ');
const escapeRegexValue = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeSectionKey = (value) => normalizeSectionValue(value).toLowerCase();

const buildClassSectionMatrixLookup = (stateDoc) => {
  const matrixClasses = Array.isArray(stateDoc?.matrixClasses) ? stateDoc.matrixClasses : [];
  const matrixSections = Array.isArray(stateDoc?.matrixSections) ? stateDoc.matrixSections : [];
  const matrixSelection = stateDoc?.matrixSelection || {};

  const sectionNameById = new Map(
    matrixSections
      .map((section) => [String(section?.id || '').trim(), normalizeSectionValue(section?.name)])
      .filter(([id, name]) => id && name)
  );

  const sectionsByClass = new Map();
  matrixClasses.forEach((item) => {
    const classId = String(item?.id || '').trim();
    const className = normalizeString(item?.name);
    if (!classId || !className) return;

    const selectedSectionMap = matrixSelection[classId] || {};
    const sectionNames = Object.entries(selectedSectionMap)
      .filter(([, checked]) => Boolean(checked))
      .map(([sectionId]) => sectionNameById.get(String(sectionId).trim()) || '')
      .map((name) => normalizeSectionValue(name))
      .filter(Boolean);

    sectionsByClass.set(className, sectionNames);
  });

  return sectionsByClass;
};

const getClassSectionLookupFromRequest = async (req) => {
  const TimetableStateModel = req.models?.TimetableState;
  if (!TimetableStateModel) return new Map();

  const latestTimetableState = await TimetableStateModel.findOne({})
    .sort({ updatedAt: -1 })
    .select('matrixClasses matrixSections matrixSelection')
    .lean();

  return buildClassSectionMatrixLookup(latestTimetableState);
};

const resolveSectionAgainstMatrix = ({ className, section, classSectionLookup }) => {
  const normalizedClass = normalizeString(className);
  const normalizedSection = normalizeSectionValue(section);
  const allowedSections = classSectionLookup.get(normalizedClass) || [];

  if (allowedSections.length === 0) {
    return { section: normalizedSection, error: null };
  }

  const sectionByKey = new Map(allowedSections.map((item) => [normalizeSectionKey(item), item]));
  const matched = sectionByKey.get(normalizeSectionKey(normalizedSection));
  if (!matched) {
    return {
      section: normalizedSection,
      error: `Section "${normalizedSection}" is not configured for class "${normalizedClass}" in Class Section Matrix.`
    };
  }

  return { section: matched, error: null };
};

const syncLinkedStudentRecords = async (req, previousStudent, updatedStudent) => {
  const CandidateModel = req.models?.Candidate;
  const Form66Model = req.models?.Form66;

  const previousRollNumber = normalizeString(previousStudent?.rollNumber).toUpperCase();
  const nextRollNumber = normalizeString(updatedStudent?.rollNumber).toUpperCase();
  if (!previousRollNumber || !nextRollNumber) return;

  const commonUpdate = {
    name: normalizeString(updatedStudent?.name),
    class: normalizeString(updatedStudent?.class),
    fatherName: normalizeString(updatedStudent?.fatherName),
    motherName: normalizeString(updatedStudent?.motherName),
    category: normalizeString(updatedStudent?.category),
    dateOfBirth: updatedStudent?.dateOfBirth || null,
  };

  if (CandidateModel) {
    const candidateDoc = await CandidateModel.findOne({ rollNumber: previousRollNumber });
    if (candidateDoc) {
      candidateDoc.rollNumber = nextRollNumber;
      candidateDoc.name = commonUpdate.name;
      candidateDoc.class = commonUpdate.class;
      candidateDoc.fatherName = commonUpdate.fatherName;
      candidateDoc.motherName = commonUpdate.motherName;
      candidateDoc.category = commonUpdate.category;
      candidateDoc.dateOfBirth = commonUpdate.dateOfBirth;
      await candidateDoc.save();
    }
  }

  if (Form66Model) {
    const form66Filter = previousRollNumber === nextRollNumber
      ? { rollNo: nextRollNumber }
      : { rollNo: { $in: [previousRollNumber, nextRollNumber] } };

    await Form66Model.updateMany(
      form66Filter,
      {
        $set: {
          rollNo: nextRollNumber,
          candidateName: commonUpdate.name,
          class: commonUpdate.class,
          fatherName: commonUpdate.fatherName,
          motherName: commonUpdate.motherName,
          category: commonUpdate.category,
          dateOfBirth: commonUpdate.dateOfBirth,
        }
      }
    );
  }
};

const normalizeDateValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const normalized = normalizeString(value);
  if (!normalized) return '';

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return normalized;
};

const optionalText = (value) => {
  const normalized = normalizeString(value);
  return normalized ? normalized : undefined;
};

const isValidDateString = (value) => {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const buildGeneratedImportRollNumber = (rowNumber) => {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IMP${timestampPart}${rowNumber}${randomPart}`;
};

const getAllowedLabelsForColumn = (column) => [column.label, ...(column.aliases || [])];

// @desc    Get all students
// @route   GET /api/students
// @access  Private
const getStudents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit), 10) || 100));
  const skip = (page - 1) * limit;
  const { 
    search, 
    class: className, 
    section, 
    subject, 
    isActive, 
    category,
    sort = '-createdAt' 
  } = req.query;

  // Build filter object
  const filter = {};

  if (search) {
    // Keep search $or nested so it does not collide with academic-session $or.
    filter.$and = [
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
          { fatherName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      },
    ];
  }

  if (className) {
    filter.class = { $regex: `^${escapeRegexValue(String(className).trim())}$`, $options: 'i' };
  }

  if (section) {
    filter.section = { $regex: `^${escapeRegexValue(normalizeSectionValue(section))}$`, $options: 'i' };
  }

  if (subject) {
    filter.subjects = subject;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  if (category) {
    filter.category = category;
  }

  // Get total count for pagination
  const StudentModel = req.models?.Student || Student;
  await backfillClassRollNumbersIfNeeded(req.models?.SchoolProfile || SchoolProfile, StudentModel);
  const totalCount = await Student.countDocuments(filter);

  // Execute query with pagination
  const students = await Student.find(filter)
    .populate('subjects', 'name code type')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const { pagination } = buildPaginationResponse(students, totalCount, page, limit);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, {
      students,
      pagination
    })
  );
});

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('subjects', 'name code type description');

  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, student)
  );
});

// @desc    Create new student
// @route   POST /api/students
// @access  Private
const createStudent = asyncHandler(async (req, res) => {
  const {
    rollNumber,
    name,
    email,
    phone,
    penNumber,
    class: className,
    section,
    gender,
    subjects,
    fatherName,
    motherName,
    guardianPhone,
    address,
    dateOfBirth,
    admissionDate,
    aadharNumber,
    category,
    religion,
    nationality,
    previousSchool,
    medicalInfo,
    notes
  } = req.body;
  const normalizedEmail = optionalText(email)?.toLowerCase();
  const classSectionLookup = await getClassSectionLookupFromRequest(req);
  const resolvedSection = resolveSectionAgainstMatrix({
    className,
    section,
    classSectionLookup
  });
  if (resolvedSection.error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, resolvedSection.error)
    );
  }

  // Check if roll number already exists
  const existingStudent = await Student.findOne({ rollNumber });
  if (existingStudent) {
    return res.status(HTTP_STATUS.CONFLICT).json(
      generateResponse(false, 'Student with this roll number already exists')
    );
  }

  // Check if email exists (if provided)
  if (normalizedEmail) {
    const existingEmail = await Student.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Student with this email already exists')
      );
    }
  }

  // Validate subjects exist
  if (subjects && subjects.length > 0) {
    const validSubjects = await Subject.find({ _id: { $in: subjects } });
    if (validSubjects.length !== subjects.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, 'One or more subjects are invalid')
      );
    }
  }

  // Create student
  const student = await Student.create({
    rollNumber,
    name,
    email: normalizedEmail,
    phone: optionalText(phone),
    penNumber: optionalText(penNumber),
    class: className,
    section: resolvedSection.section,
    gender: normalizeGenderValue(gender),
    subjects: subjects || [],
    fatherName,
    motherName,
    guardianPhone,
    address,
    dateOfBirth,
    admissionDate,
    aadharNumber: optionalText(aadharNumber),
    category,
    religion: optionalText(religion),
    nationality: optionalText(nationality) || 'Indian',
    previousSchool,
    medicalInfo,
    notes: optionalText(notes)
  });

  // Populate subjects before sending response
  await student.populate('subjects', 'name code type');
  await reassignClassSections(req.models?.Student || Student, [
    { className: student.class, section: student.section },
  ]);
  const numberedStudent = await Student.findById(student._id).populate('subjects', 'name code type');

  res.status(HTTP_STATUS.CREATED).json(
    generateResponse(true, SUCCESS_MESSAGES.CREATED, numberedStudent)
  );
});

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  const classSectionLookup = await getClassSectionLookupFromRequest(req);

  // Check if student exists
  const existingStudent = await Student.findById(id);
  if (!existingStudent) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  // Check if roll number is being changed and if it already exists
  if (updateData.rollNumber && updateData.rollNumber !== existingStudent.rollNumber) {
    const duplicateRollNumber = await Student.findOne({ 
      rollNumber: updateData.rollNumber,
      _id: { $ne: id }
    });
    if (duplicateRollNumber) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Student with this roll number already exists')
      );
    }
  }

  // Check if email is being changed and if it already exists
  const normalizedUpdateEmail = optionalText(updateData.email)?.toLowerCase();
  if (normalizedUpdateEmail && normalizedUpdateEmail !== existingStudent.email) {
    const duplicateEmail = await Student.findOne({ 
      email: normalizedUpdateEmail,
      _id: { $ne: id }
    });
    if (duplicateEmail) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Student with this email already exists')
      );
    }
  }

  // Validate subjects if being updated
  if (updateData.subjects && updateData.subjects.length > 0) {
    const validSubjects = await Subject.find({ _id: { $in: updateData.subjects } });
    if (validSubjects.length !== updateData.subjects.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, 'One or more subjects are invalid')
      );
    }
  }

  // Normalize and validate section text against class-section matrix if configured.
  if (updateData.section) {
    const classNameForValidation = normalizeString(updateData.class || existingStudent.class);
    const resolvedSection = resolveSectionAgainstMatrix({
      className: classNameForValidation,
      section: updateData.section,
      classSectionLookup
    });
    if (resolvedSection.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, resolvedSection.error)
      );
    }
    updateData.section = resolvedSection.section;
  }

  if ('email' in updateData) updateData.email = normalizedUpdateEmail;
  if ('phone' in updateData) updateData.phone = optionalText(updateData.phone);
  if ('penNumber' in updateData) updateData.penNumber = optionalText(updateData.penNumber);
  if ('aadharNumber' in updateData) updateData.aadharNumber = optionalText(updateData.aadharNumber);
  if ('religion' in updateData) updateData.religion = optionalText(updateData.religion);
  if ('nationality' in updateData) updateData.nationality = optionalText(updateData.nationality) || 'Indian';
  if ('notes' in updateData) updateData.notes = optionalText(updateData.notes);
  if ('gender' in updateData) updateData.gender = normalizeGenderValue(updateData.gender);
  delete updateData.classRollNo;
  if (updateData.isActive === false) {
    updateData.classRollNo = null;
  }

  const previousClass = existingStudent.class;
  const previousSection = existingStudent.section;

  // Update student
  const student = await Student.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('subjects', 'name code type');

  await syncLinkedStudentRecords(req, existingStudent, student);
  await reassignClassSections(req.models?.Student || Student, [
    { className: previousClass, section: previousSection },
    { className: student.class, section: student.section },
  ]);
  const numberedStudent = await Student.findById(student._id).populate('subjects', 'name code type');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.UPDATED, numberedStudent)
  );
});

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  // Delete associated documents from Cloudinary if any
  if (student.documents && student.documents.length > 0) {
    for (const doc of student.documents) {
      if (doc.cloudinaryPublicId) {
        try {
          await deleteRawFromCloudinary(doc.cloudinaryPublicId);
        } catch (error) {
          console.error(`Failed to delete document from Cloudinary: ${doc.cloudinaryPublicId}`, error);
        }
      }
    }
  }

  // Delete profile image from Cloudinary if exists
  if (student.profileImage) {
    const publicId = extractPublicId(student.profileImage);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
        console.log(`Deleted profile image from Cloudinary: ${publicId}`);
      } catch (error) {
        console.error(`Failed to delete profile image from Cloudinary: ${publicId}`, error);
      }
    }
  }

  const className = student.class;
  const section = student.section;
  await student.deleteOne();
  await reassignClassSections(req.models?.Student || Student, [{ className, section }]);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.DELETED)
  );
});

// @desc    Get students by class
// @route   GET /api/students/class/:className
// @access  Private
const getStudentsByClass = asyncHandler(async (req, res) => {
  const { className } = req.params;
  const { section, isActive = true } = req.query;

  const filter = { 
    class: className,
    isActive: isActive === 'true'
  };

  if (section) {
    filter.section = { $regex: `^${escapeRegexValue(normalizeSectionValue(section))}$`, $options: 'i' };
  }

  const students = await Student.find(filter)
    .populate('subjects', 'name code type')
    .sort('section rollNumber')
    .lean();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, students)
  );
});

// @desc    Get students by class and section
// @route   GET /api/students/class/:className/section/:section
// @access  Private
const getStudentsByClassSection = asyncHandler(async (req, res) => {
  const { className, section } = req.params;
  const { isActive = true } = req.query;

  const students = await Student.find({ 
    class: className,
    section: { $regex: `^${escapeRegexValue(normalizeSectionValue(section))}$`, $options: 'i' },
    isActive: isActive === 'true'
  })
    .populate('subjects', 'name code type')
    .sort('rollNumber')
    .lean();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, students)
  );
});

// @desc    Get students by subject
// @route   GET /api/students/subject/:subjectId
// @access  Private
const getStudentsBySubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { class: className, section, isActive = true } = req.query;

  const filter = { 
    subjects: subjectId,
    isActive: isActive === 'true'
  };

  if (className) {
    filter.class = className;
  }

  if (section) {
    filter.section = { $regex: `^${escapeRegexValue(normalizeSectionValue(section))}$`, $options: 'i' };
  }

  const students = await Student.find(filter)
    .populate('subjects', 'name code type')
    .sort('class section rollNumber')
    .lean();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, students)
  );
});

// @desc    Assign subjects to student
// @route   POST /api/students/:id/subjects
// @access  Private
const assignSubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subjectIds } = req.body;

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  // Validate subjects exist
  const validSubjects = await Subject.find({ _id: { $in: subjectIds } });
  if (validSubjects.length !== subjectIds.length) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'One or more subjects are invalid')
    );
  }

  await student.assignSubjects(subjectIds);
  await student.populate('subjects', 'name code type');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Subjects assigned successfully', student)
  );
});

// @desc    Remove subjects from student
// @route   DELETE /api/students/:id/subjects
// @access  Private
const removeSubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subjectIds } = req.body;

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  await student.removeSubjects(subjectIds);
  await student.populate('subjects', 'name code type');

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Subjects removed successfully', student)
  );
});

// @desc    Get student statistics
// @route   GET /api/students/stats
// @access  Private
const getStudentStats = asyncHandler(async (req, res) => {
  const stats = await Student.getStats({
    className: req.query.class,
    section: req.query.section,
  });

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Student statistics fetched successfully', stats)
  );
});

// @desc    Generate next roll number
// @route   GET /api/students/next-roll-number
// @access  Private
const getNextRollNumber = asyncHandler(async (req, res) => {
  const { class: className, section } = req.query;

  if (!className || !section) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Class and section are required')
    );
  }

  // Get the latest student in the class and section
  const latestStudent = await Student.findOne({
    class: className,
    section: { $regex: `^${escapeRegexValue(normalizeSectionValue(section))}$`, $options: 'i' }
  }).sort({ rollNumber: -1 });

  let nextRollNumber;
  if (latestStudent) {
    // Extract number from roll number and increment
    const match = latestStudent.rollNumber.match(/(\d+)$/);
    if (match) {
      const currentNumber = parseInt(match[1]);
      const nextNumber = currentNumber + 1;
      const prefix = latestStudent.rollNumber.replace(/\d+$/, '');
      nextRollNumber = `${prefix}${nextNumber.toString().padStart(match[1].length, '0')}`;
    } else {
      // If no number found, create new format
      nextRollNumber = `${className}${normalizeSectionValue(section).replace(/\s+/g, '').toUpperCase()}001`;
    }
  } else {
    // First student in this class and section
    nextRollNumber = `${className}${normalizeSectionValue(section).replace(/\s+/g, '').toUpperCase()}001`;
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Next roll number generated successfully', { rollNumber: nextRollNumber })
  );
});

// @desc    Bulk create students
// @route   POST /api/students/bulk
// @access  Private
const bulkCreateStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;
  const classSectionLookup = await getClassSectionLookupFromRequest(req);

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Students array is required')
    );
  }

  const results = {
    successful: [],
    failed: [],
    total: students.length
  };

  for (let i = 0; i < students.length; i++) {
    try {
      const studentData = students[i];
      studentData.email = optionalText(studentData.email)?.toLowerCase();
      studentData.phone = optionalText(studentData.phone);
      studentData.penNumber = optionalText(studentData.penNumber);
      studentData.aadharNumber = optionalText(studentData.aadharNumber);
      studentData.religion = optionalText(studentData.religion);
      studentData.nationality = optionalText(studentData.nationality) || 'Indian';
      studentData.notes = optionalText(studentData.notes);
      
      // Check for duplicate roll number
      const existingStudent = await Student.findOne({ rollNumber: studentData.rollNumber });
      if (existingStudent) {
        results.failed.push({
          index: i,
          data: studentData,
          error: 'Student with this roll number already exists'
        });
        continue;
      }

      // Check for duplicate email if provided
      if (studentData.email) {
        const existingEmail = await Student.findOne({ email: studentData.email });
        if (existingEmail) {
          results.failed.push({
            index: i,
            data: studentData,
            error: 'Student with this email already exists'
          });
          continue;
        }
      }

      // Normalize section text.
      if (studentData.section) {
        const resolvedSection = resolveSectionAgainstMatrix({
          className: studentData.class,
          section: studentData.section,
          classSectionLookup
        });
        if (resolvedSection.error) {
          results.failed.push({
            index: i,
            data: studentData,
            error: resolvedSection.error
          });
          continue;
        }
        studentData.section = resolvedSection.section;
      }

      if (studentData.gender && !STUDENT_GENDERS.includes(studentData.gender)) {
        studentData.gender = normalizeGenderValue(studentData.gender);
      }

      // Create student
      const student = await Student.create(studentData);
      results.successful.push(student);

    } catch (error) {
      results.failed.push({
        index: i,
        data: students[i],
        error: error.message
      });
    }
  }

  const statusCode = results.failed.length === 0 ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
  const message = results.failed.length === 0 
    ? 'All students created successfully' 
    : `${results.successful.length} students created, ${results.failed.length} failed`;

  await reassignClassSections(
    req.models?.Student || Student,
    results.successful.map((row) => ({ className: row.class, section: row.section }))
  );

  res.status(statusCode).json(
    generateResponse(true, message, results)
  );
});

// @desc    Download students import template
// @route   GET /api/students/import-template
// @access  Private
const downloadStudentImportTemplate = asyncHandler(async (req, res) => {
  const headers = STUDENT_TEMPLATE_COLUMNS.map((column) => column.label);
  const format = String(req.query.format || 'xlsx').toLowerCase();

  if (format === 'csv') {
    const csvContent = `${headers.map((header) => escapeCsvCell(header)).join(',')}\n`;
    const fileName = `students_template_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(HTTP_STATUS.OK).send(csvContent);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');
  worksheet.addRow(headers);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.columns = headers.map((header) => ({
    width: Math.max(18, Math.min(28, header.length + 4))
  }));

  const sampleRow = [
    '3361',
    'Aarav Sharma',
    '10th',
    'A',
    'Rajesh Sharma',
    '2010-04-15',
    'Boy',
    'General',
    '9123456789',
    '123456789012',
  ];
  worksheet.addRow(sampleRow);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `students_template_${new Date().toISOString().split('T')[0]}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(HTTP_STATUS.OK).send(Buffer.from(buffer));
});

// @desc    Upload students from import template
// @route   POST /api/students/import-template/upload
// @access  Private
const uploadStudentsFromTemplate = asyncHandler(async (req, res) => {
  const StudentModel = req.models?.Student || Student;
  const TimetableStateModel = req.models?.TimetableState;

  if (!req.files || !req.files.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'No file uploaded. Please upload a .csv or .xlsx file.')
    );
  }

  const file = req.files.file;
  const fileName = String(file.name || '').toLowerCase();
  const isXlsx = fileName.endsWith('.xlsx');
  const isCsv = fileName.endsWith('.csv');

  if (!isXlsx && !isCsv) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Only .csv or .xlsx files are supported for import.')
    );
  }

  const fileBuffer = file?.tempFilePath && fsSync.existsSync(file.tempFilePath)
    ? fsSync.readFileSync(file.tempFilePath)
    : file.data;

  const expectedHeaders = STUDENT_TEMPLATE_COLUMNS.map((column) => column.label);
  const headerToKey = new Map(
    STUDENT_TEMPLATE_COLUMNS.flatMap((column) =>
      getAllowedLabelsForColumn(column).map((label) => [label, column.key])
    )
  );

  let receivedHeaders = [];
  let dataRows = [];

  try {
    if (isCsv) {
      const rows = parseCsvBuffer(fileBuffer);
      if (!rows.length) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          generateResponse(false, 'CSV file is empty.')
        );
      }
      receivedHeaders = STUDENT_TEMPLATE_COLUMNS.map((_, index) => normalizeString(rows[0]?.[index]));
      dataRows = rows.slice(1).map((cells, index) => ({
        rowNumber: index + 2,
        valueAt: (cellIndex) => cells[cellIndex] || ''
      }));
    } else {
      const workbook = new ExcelJS.Workbook();
      try {
        await workbook.xlsx.load(fileBuffer);
      } catch (_error) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          generateResponse(false, 'Invalid or unsupported Excel file.')
        );
      }

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          generateResponse(false, 'Excel file has no worksheets.')
        );
      }

      const headerRow = worksheet.getRow(1);
      receivedHeaders = STUDENT_TEMPLATE_COLUMNS.map((_, index) => normalizeString(headerRow.getCell(index + 1).value));
      dataRows = Array.from({ length: Math.max(0, worksheet.rowCount - 1) }, (_, index) => ({
        rowNumber: index + 2,
        valueAt: (cellIndex) => worksheet.getRow(index + 2).getCell(cellIndex + 1).value
      }));
    }
  } finally {
    if (file?.tempFilePath && fsSync.existsSync(file.tempFilePath)) {
      fsSync.unlinkSync(file.tempFilePath);
    }
  }

  const headersAreValid = expectedHeaders.length === receivedHeaders.length
    && STUDENT_TEMPLATE_COLUMNS.every((column, index) =>
      getAllowedLabelsForColumn(column).includes(receivedHeaders[index])
    );

  if (!headersAreValid) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Template headers do not match. Please use the downloaded template without changing headers.',
      data: {
        expectedHeaders,
        receivedHeaders
      }
    });
  }

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: []
  };

  const generatedRollNumbersInRequest = new Set();
  const importTasks = [];
  const importGroups = [];
  const requestAcademicSession = normalizeString(req.academicSession);
  let classSectionLookup = new Map();

  if (TimetableStateModel) {
    const latestTimetableState = await TimetableStateModel.findOne({})
      .sort({ updatedAt: -1 })
      .select('matrixClasses matrixSections matrixSelection')
      .lean();
    classSectionLookup = buildClassSectionMatrixLookup(latestTimetableState);
  }

  const existingStudents = await StudentModel.find({})
    .select('rollNumber')
    .lean();
  const existingRollNumbers = new Set(
    existingStudents
      .map((student) => String(student.rollNumber || '').trim().toUpperCase())
      .filter(Boolean)
  );

  for (const { rowNumber, valueAt } of dataRows) {
    const rowData = {};
    receivedHeaders.forEach((header, cellIndex) => {
      const key = headerToKey.get(header);
      rowData[key] = valueAt(cellIndex);
    });

    if (!hasAnyNonEmptyValue(rowData)) {
      results.skipped += 1;
      continue;
    }

    const normalizedRow = {
      rollNumber: normalizeString(rowData.rollNumber).replace(/\s+/g, '').toUpperCase(),
      name: normalizeString(rowData.name),
      gender: normalizeGenderValue(rowData.gender),
      class: normalizeClassValue(rowData.class),
      section: normalizeSectionValue(rowData.section),
      fatherName: normalizeString(rowData.fatherName),
      motherName: normalizeString(rowData.motherName),
      guardianPhone: normalizeString(rowData.guardianPhone).replace(/\D/g, ''),
      dateOfBirth: normalizeDateValue(rowData.dateOfBirth),
      admissionDate: normalizeDateValue(rowData.admissionDate),
      category: normalizeCategoryValue(rowData.category),
      email: optionalText(normalizeString(rowData.email).toLowerCase()),
      phone: optionalText(normalizeString(rowData.phone).replace(/\D/g, '')),
      penNumber: optionalText(rowData.penNumber),
      aadharNumber: optionalText(normalizeString(rowData.aadharNumber).replace(/\D/g, '')),
      religion: optionalText(rowData.religion),
      nationality: optionalText(rowData.nationality) || 'Indian',
      notes: optionalText(rowData.notes),
      address: {
        street: normalizeString(rowData.street),
        city: normalizeString(rowData.city),
        state: normalizeString(rowData.state),
        pincode: normalizeString(rowData.pincode).replace(/\D/g, ''),
      },
      subjects: [],
      isActive: true,
      academicSession: requestAcademicSession || undefined,
    };

    // Allow blank cells in import by applying minimal defaults for required fields.
    const fallbackNotes = [];
    let rollNumberAutoFilled = false;
    if (!normalizedRow.rollNumber) {
      normalizedRow.rollNumber = buildGeneratedImportRollNumber(rowNumber);
      while (
        existingRollNumbers.has(normalizedRow.rollNumber) ||
        generatedRollNumbersInRequest.has(normalizedRow.rollNumber)
      ) {
        normalizedRow.rollNumber = buildGeneratedImportRollNumber(rowNumber);
      }
      rollNumberAutoFilled = true;
      fallbackNotes.push('roll number');
    }
    if (normalizedRow.rollNumber.length > 20) {
      normalizedRow.rollNumber = normalizedRow.rollNumber.slice(0, 20);
      fallbackNotes.push('roll number length');
    }
    if (!rollNumberAutoFilled && (
      existingRollNumbers.has(normalizedRow.rollNumber) ||
      generatedRollNumbersInRequest.has(normalizedRow.rollNumber)
    )) {
      results.skipped += 1;
      continue;
    }
    generatedRollNumbersInRequest.add(normalizedRow.rollNumber);
    if (!normalizedRow.name) {
      normalizedRow.name = `Student ${normalizedRow.rollNumber}`;
      fallbackNotes.push('name');
    }
    if (normalizedRow.name.length > 100) {
      normalizedRow.name = normalizedRow.name.slice(0, 100);
      fallbackNotes.push('name length');
    }
    if (!normalizedRow.class) {
      results.errors.push({
        row: rowNumber,
        message: 'Class is required.'
      });
      continue;
    }
    const allowedSections = classSectionLookup.get(normalizedRow.class) || [];
    const allowedSectionByKey = new Map(
      allowedSections.map((sectionName) => [normalizeSectionKey(sectionName), sectionName])
    );
    const normalizedSectionInput = normalizeSectionKey(normalizedRow.section);
    const matchedSectionFromMatrix = allowedSectionByKey.get(normalizedSectionInput);

    if (allowedSections.length > 0) {
      if (!normalizedSectionInput) {
        normalizedRow.section = allowedSections[0];
        fallbackNotes.push('section');
      } else if (matchedSectionFromMatrix) {
        normalizedRow.section = matchedSectionFromMatrix;
      } else {
        results.errors.push({
          row: rowNumber,
          message: `Section "${normalizedRow.section}" is not configured for class "${normalizedRow.class}" in Class Section Matrix.`
        });
        continue;
      }
    } else if (!normalizedSectionInput) {
      results.errors.push({
        row: rowNumber,
        message: `Section is required. Configure sections in Class Section Matrix for class "${normalizedRow.class}".`
      });
      continue;
    } else {
      normalizedRow.section = normalizeSectionValue(normalizedRow.section);
    }
    if (!normalizedRow.fatherName) {
      normalizedRow.fatherName = 'Unknown';
      fallbackNotes.push('father name');
    }
    if (normalizedRow.fatherName.length > 100) {
      normalizedRow.fatherName = normalizedRow.fatherName.slice(0, 100);
      fallbackNotes.push('father name length');
    }
    if (!normalizedRow.motherName) {
      normalizedRow.motherName = 'Unknown';
      fallbackNotes.push('mother name');
    }
    if (normalizedRow.motherName.length > 100) {
      normalizedRow.motherName = normalizedRow.motherName.slice(0, 100);
      fallbackNotes.push('mother name length');
    }
    if (!normalizedRow.guardianPhone) {
      normalizedRow.guardianPhone = '6000000000';
      fallbackNotes.push('guardian phone');
    }
    if (!normalizedRow.dateOfBirth) {
      normalizedRow.dateOfBirth = '2000-01-01';
      fallbackNotes.push('date of birth');
    }
    if (!normalizedRow.admissionDate) {
      normalizedRow.admissionDate = new Date().toISOString().slice(0, 10);
      fallbackNotes.push('admission date');
    }
    if (!normalizedRow.category) {
      normalizedRow.category = 'General';
      fallbackNotes.push('category');
    }
    if (!['General', 'OBC', 'SC', 'ST', 'EWS'].includes(normalizedRow.category)) {
      normalizedRow.category = 'General';
      fallbackNotes.push('invalid category');
    }
    if (!normalizedRow.address.street) {
      normalizedRow.address.street = 'Not Provided';
      fallbackNotes.push('street');
    }
    if (!normalizedRow.address.city) {
      normalizedRow.address.city = 'Not Provided';
      fallbackNotes.push('city');
    }
    if (!normalizedRow.address.state) {
      normalizedRow.address.state = 'Not Provided';
      fallbackNotes.push('state');
    }
    if (!normalizedRow.address.pincode) {
      normalizedRow.address.pincode = '000000';
      fallbackNotes.push('pincode');
    }

    if (normalizedRow.class.length > 50) {
      normalizedRow.class = normalizedRow.class.slice(0, 50);
      fallbackNotes.push('class length');
    }

    if (!STUDENT_GENDERS.includes(normalizedRow.gender)) {
      normalizedRow.gender = 'Unspecified';
      fallbackNotes.push('invalid gender');
    }
    if (!/^[6-9]\d{9}$/.test(normalizedRow.guardianPhone)) {
      normalizedRow.guardianPhone = '6000000000';
      fallbackNotes.push('invalid guardian phone');
    }
    if (!/^\d{6}$/.test(normalizedRow.address.pincode)) {
      normalizedRow.address.pincode = '000000';
      fallbackNotes.push('invalid pincode');
    }
    if (normalizedRow.phone && !/^[6-9]\d{9}$/.test(normalizedRow.phone)) {
      normalizedRow.phone = undefined;
      fallbackNotes.push('invalid phone');
    }
    if (normalizedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRow.email)) {
      normalizedRow.email = undefined;
      fallbackNotes.push('invalid email');
    }
    if (normalizedRow.aadharNumber && !/^\d{12}$/.test(normalizedRow.aadharNumber)) {
      normalizedRow.aadharNumber = undefined;
      fallbackNotes.push('invalid aadhar');
    }
    if (!isValidDateString(normalizedRow.dateOfBirth)) {
      normalizedRow.dateOfBirth = '2000-01-01';
      fallbackNotes.push('invalid date of birth');
    }
    if (!isValidDateString(normalizedRow.admissionDate)) {
      normalizedRow.admissionDate = new Date().toISOString().slice(0, 10);
      fallbackNotes.push('invalid admission date');
    }
    if (normalizedRow.penNumber && normalizedRow.penNumber.length > 50) {
      normalizedRow.penNumber = normalizedRow.penNumber.slice(0, 50);
      fallbackNotes.push('pen number length');
    }
    if (normalizedRow.religion && normalizedRow.religion.length > 30) {
      normalizedRow.religion = normalizedRow.religion.slice(0, 30);
      fallbackNotes.push('religion length');
    }
    if (normalizedRow.nationality && normalizedRow.nationality.length > 30) {
      normalizedRow.nationality = normalizedRow.nationality.slice(0, 30);
      fallbackNotes.push('nationality length');
    }
    if (normalizedRow.notes && normalizedRow.notes.length > 1000) {
      normalizedRow.notes = normalizedRow.notes.slice(0, 1000);
      fallbackNotes.push('notes length');
    }
    if (normalizedRow.address.street.length > 200) {
      normalizedRow.address.street = normalizedRow.address.street.slice(0, 200);
      fallbackNotes.push('street length');
    }
    if (normalizedRow.address.city.length > 50) {
      normalizedRow.address.city = normalizedRow.address.city.slice(0, 50);
      fallbackNotes.push('city length');
    }
    if (normalizedRow.address.state.length > 50) {
      normalizedRow.address.state = normalizedRow.address.state.slice(0, 50);
      fallbackNotes.push('state length');
    }

    if (fallbackNotes.length > 0) {
      results.warnings.push({
        row: rowNumber,
        message: `Auto-filled/normalized: ${fallbackNotes.join(', ')}`
      });
    }

    importTasks.push(
      (async () => {
        try {
          await StudentModel.create(normalizedRow);
          results.created += 1;
          importGroups.push({ className: normalizedRow.class, section: normalizedRow.section });
        } catch (error) {
          if (error?.code === 11000) {
            results.skipped += 1;
            return;
          }

          results.errors.push({
            row: rowNumber,
            message: error.message || 'Failed to import student from this row.'
          });
        }
      })()
    );
  }

  if (importTasks.length > 0) {
    await Promise.allSettled(importTasks);
    await reassignClassSections(StudentModel, importGroups);
  }

  return res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Student template import completed', results)
  );
});

// @desc    Upload student document
// @route   POST /api/students/:id/documents
// @access  Private
const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  if (!req.files || !req.files.document) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Document file is required')
    );
  }

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  const file = req.files.document;
  const fileExtension = path.extname(file.name);
  const fileName = `${student.rollNumber}_${type}_${Date.now()}${fileExtension}`;

  // Upload to Cloudinary (use temp file or buffer)
  const fileInput = file.tempFilePath || file.data;
  const { url, publicId } = await uploadDocumentToCloudinary(
    fileInput,
    'student-documents',
    null
  );

  const documentData = {
    type,
    filename: fileName,
    originalName: file.name,
    path: url,
    cloudinaryPublicId: publicId
  };

  await student.addDocument(documentData);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Document uploaded successfully', student)
  );
});

// @desc    Delete student document
// @route   DELETE /api/students/:id/documents/:docId
// @access  Private
const deleteDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  const document = student.documents.id(docId);
  if (!document) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Document not found')
    );
  }

  // Delete from Cloudinary if stored there
  if (document.cloudinaryPublicId) {
    try {
      await deleteRawFromCloudinary(document.cloudinaryPublicId);
    } catch (error) {
      console.error(`Failed to delete from Cloudinary: ${document.cloudinaryPublicId}`, error);
    }
  }

  // Remove document from student
  await student.removeDocument(docId);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Document deleted successfully', student)
  );
});

// @desc    Upload student profile image
// @route   POST /api/students/:id/profile-image
// @access  Private
const uploadProfileImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.files || !req.files.profileImage) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Profile image file is required')
    );
  }

  const student = await Student.findById(id);
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.NOT_FOUND)
    );
  }

  const file = req.files.profileImage;
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed')
    );
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'File size must be less than 5MB')
    );
  }

  try {
    // Delete old profile image from Cloudinary if exists
    if (student.profileImage) {
      const oldPublicId = extractPublicId(student.profileImage);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
          console.log(`Deleted old profile image: ${oldPublicId}`);
        } catch (error) {
          console.error(`Failed to delete old profile image from Cloudinary: ${oldPublicId}`, error);
        }
      }
    }

    // Upload to Cloudinary
    // Use the temporary file path from express-fileupload
    const publicId = `student_${student.rollNumber}_${Date.now()}`;
    const uploadResult = await uploadToCloudinary(
      file.tempFilePath,
      'students/profiles',
      publicId
    );

    // Update student profile image with Cloudinary URL
    student.profileImage = uploadResult.url;
    await student.save();

    // Clean up temporary file
    try {
      await fs.unlink(file.tempFilePath);
    } catch (error) {
      console.error('Failed to delete temporary file:', error);
    }

    res.status(HTTP_STATUS.OK).json(
      generateResponse(true, 'Profile image uploaded successfully', student)
    );
  } catch (error) {
    console.error('Profile image upload error:', error);
    
    // Clean up temporary file in case of error
    try {
      if (file.tempFilePath) {
        await fs.unlink(file.tempFilePath);
      }
    } catch (cleanupError) {
      console.error('Failed to delete temporary file:', cleanupError);
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      generateResponse(false, error.message || 'Failed to upload profile image')
    );
  }
});

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
  getStudentsByClassSection,
  getStudentsBySubject,
  assignSubjects,
  removeSubjects,
  getStudentStats,
  getNextRollNumber,
  bulkCreateStudents,
  downloadStudentImportTemplate,
  uploadStudentsFromTemplate,
  uploadDocument,
  deleteDocument,
  uploadProfileImage
};
