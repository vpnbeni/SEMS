const asyncHandler = require('../middleware/asyncHandler');
const { HTTP_STATUS } = require('../utils/constants');
const pdfGenerator = require('../utils/pdfGenerator');
const ExamDefinition = require('../models/ExamDefinition');
const Student = require('../models/Student');
const SchoolProfile = require('../models/SchoolProfile');
const TimetableState = require('../models/TimetableState');

const formatExamDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return raw;
};

const toBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const collectSubjectsForClass = (timetableState, className, section) => {
  const classKey = String(className || '').trim().toLowerCase();
  const sectionKey = String(section || '').trim().toLowerCase();
  const names = new Set();

  (timetableState?.classes || []).forEach((row) => {
    if (String(row.className || '').trim().toLowerCase() !== classKey) return;
    if (sectionKey && String(row.section || '').trim().toLowerCase() !== sectionKey) return;
    (row.subjects || []).forEach((subjectName) => {
      const trimmed = String(subjectName || '').trim();
      if (trimmed) names.add(trimmed);
    });
  });

  if (names.size === 0) {
    (timetableState?.classes || []).forEach((row) => {
      if (String(row.className || '').trim().toLowerCase() !== classKey) return;
      (row.subjects || []).forEach((subjectName) => {
        const trimmed = String(subjectName || '').trim();
        if (trimmed) names.add(trimmed);
      });
    });
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

const parseDesign = (source = {}) => {
  const columns = source.columns || {};
  const signatures = source.signatures || {};
  const headerFields = source.headerFields || {};
  const extraMarkColumns = Math.min(8, Math.max(0, Number.parseInt(source.extraMarkColumns, 10) || 0));
  const extraMarks = Array.from({ length: extraMarkColumns }, (_, index) => `Marks ${index + 1}`);

  return {
    title: String(source.title || 'Award List').trim() || 'Award List',
    pageSize: String(source.pageSize || '').toLowerCase() === 'legal' ? 'legal' : 'A4',
    orientation: source.orientation === 'portrait' ? 'portrait' : 'landscape',
    copiesPerSheet: Number(source.copiesPerSheet) === 2 ? 2 : 1,
    showHeader: toBoolean(source.showHeader, true),
    showSchoolLogo: toBoolean(source.showSchoolLogo, false),
    showSchoolAddress: toBoolean(source.showSchoolAddress, true),
    showInfoRow: toBoolean(source.showInfoRow, true),
    showMaxMarks: toBoolean(source.showMaxMarks, true),
    headerFields: {
      class: toBoolean(headerFields.class, true),
      section: toBoolean(headerFields.section, true),
      exam: toBoolean(headerFields.exam, true),
      date: toBoolean(headerFields.date, true),
      subject: toBoolean(headerFields.subject, true),
      mm: toBoolean(headerFields.mm, true),
    },
    columns: {
      srNo: toBoolean(columns.srNo, true),
      rollNumber: toBoolean(columns.rollNumber, true),
      rollNo: toBoolean(columns.rollNo, true),
      name: toBoolean(columns.name, true),
      fatherName: toBoolean(columns.fatherName, false),
      subjects: toBoolean(columns.subjects, true),
      total: toBoolean(columns.total, true),
      grade: toBoolean(columns.grade, false),
      checkerSign: toBoolean(columns.checkerSign, true),
    },
    signatures: {
      subjectTeacher: toBoolean(signatures.subjectTeacher, true),
      hod: toBoolean(signatures.hod, true),
      examIncharge: toBoolean(signatures.examIncharge, true),
      principal: toBoolean(signatures.principal, true),
    },
    extraMarks,
    extraMarkColumns,
  };
};

const toPersistableDesign = (design) => ({
  title: design.title,
  pageSize: design.pageSize,
  orientation: design.orientation,
  copiesPerSheet: design.copiesPerSheet,
  showHeader: design.showHeader,
  showSchoolLogo: design.showSchoolLogo,
  showSchoolAddress: design.showSchoolAddress,
  showInfoRow: design.showInfoRow,
  showMaxMarks: design.showMaxMarks,
  headerFields: design.headerFields,
  columns: design.columns,
  signatures: design.signatures,
  extraMarkColumns: design.extraMarkColumns,
});

const loadSavedDesign = async (SchoolProfileModel) => {
  const profile = await SchoolProfileModel.findOne({}).select('awardListDesign').lean();
  return parseDesign(profile?.awardListDesign || {});
};

const getAwardListDesign = asyncHandler(async (req, res) => {
  const SchoolProfileModel = req.models?.SchoolProfile || SchoolProfile;
  const design = await loadSavedDesign(SchoolProfileModel);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: toPersistableDesign(design),
  });
});

const saveAwardListDesign = asyncHandler(async (req, res) => {
  const SchoolProfileModel = req.models?.SchoolProfile || SchoolProfile;
  const design = toPersistableDesign(parseDesign(req.body?.design || req.body || {}));
  await SchoolProfileModel.findOneAndUpdate(
    {},
    { $set: { awardListDesign: design } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Award list format saved.',
    data: design,
  });
});

const generateAwardList = asyncHandler(async (req, res) => {
  const payload = req.method === 'POST' ? req.body || {} : req.query || {};
  const examDate = formatExamDate(payload.examDate || payload.date);
  const subjectName = String(payload.subject || payload.subjectName || '').trim();
  const SchoolProfileModel = req.models?.SchoolProfile || SchoolProfile;
  const design = payload.design
    ? parseDesign(payload.design)
    : await loadSavedDesign(SchoolProfileModel);

  if (!examId || !className || !section) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'examId, class, and section are required.',
    });
  }

  const ExamDefinitionModel = req.models?.ExamDefinition || ExamDefinition;
  const StudentModel = req.models?.Student || Student;
  const TimetableStateModel = req.models?.TimetableState || TimetableState;

  const [exam, schoolProfile, timetableState, students] = await Promise.all([
    ExamDefinitionModel.findById(examId).lean(),
    SchoolProfileModel.findOne({}).lean(),
    TimetableStateModel.findOne({}).sort({ updatedAt: -1 }).select('classes').lean(),
    StudentModel.find({
      class: { $regex: `^${escapeRegexValue(className)}$`, $options: 'i' },
      section: { $regex: `^${escapeRegexValue(section)}$`, $options: 'i' },
      isActive: true,
    })
      .select('rollNumber classRollNo name class section fatherName')
      .sort({ classRollNo: 1, name: 1 })
      .lean(),
  ]);

  if (!exam) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Exam not found.' });
  }

  if (!students.length) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: `No students found for class ${className}, section ${section}.`,
    });
  }

  const classSubjects = collectSubjectsForClass(timetableState, className, section);
  const subjects = design.columns.subjects
    ? (classSubjects.length > 0 ? classSubjects : ['Marks'])
    : [];
  const academicYear = req.academicSession ? String(req.academicSession).replace('_', '-') : '';
  const maxMarks = Number(exam.maximumMarks) || 0;
  const signatureLabels = [
    design.signatures.subjectTeacher ? 'Subject Teacher' : null,
    design.signatures.hod ? 'HOD' : null,
    design.signatures.examIncharge ? 'Exam Incharge' : null,
    design.signatures.principal ? 'Principal' : null,
  ].filter(Boolean);

  const templateData = {
    schoolName: schoolProfile?.schoolName || req.tenant?.name || '',
    schoolCode: schoolProfile?.schoolCode || req.tenant?.metadata?.schoolCode || '',
    affiliationNo: schoolProfile?.affiliationNo || req.tenant?.metadata?.affiliationNo || '',
    schoolLogoUrl: design.showSchoolLogo ? (schoolProfile?.logoUrl || '') : '',
    schoolAddress: schoolProfile?.address || '',
    examName: exam.name || '',
    examCode: exam.code || '',
    examDate,
    subjectName,
    academicYear,
    className,
    section,
    maxMarks: design.showMaxMarks ? maxMarks : 0,
    headerMaxMarks: design.headerFields.mm ? (maxMarks || '') : '',
    subjects,
    extraMarks: design.extraMarks,
    students: students.map((student, index) => ({
      srNo: index + 1,
      rollNumber: student.rollNumber || '',
      classRollNo: student.classRollNo || '',
      name: student.name || '',
      fatherName: student.fatherName || '',
    })),
    studentCount: students.length,
    design,
    pageSize: design.pageSize === 'legal' ? 'legal' : 'A4',
    twoUp: design.copiesPerSheet === 2,
    copies: design.copiesPerSheet === 2 ? [{}, {}] : [{}],
    signatureLabels,
    showSignatures: signatureLabels.length > 0,
  };

  const pdfBuffer = await pdfGenerator.generatePDF('award-list', templateData);
  const filename = `award-list_${String(exam.code || 'exam')}_${className}-${section}.pdf`.replace(/\s+/g, '_');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(HTTP_STATUS.OK).send(pdfBuffer);
});

module.exports = { generateAwardList, getAwardListDesign, saveAwardListDesign };
