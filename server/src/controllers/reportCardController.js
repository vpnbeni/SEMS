const asyncHandler = require('../middleware/asyncHandler');
const { HTTP_STATUS } = require('../utils/constants');
const pdfGenerator = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');
const ExamDefinition = require('../models/ExamDefinition');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const SchoolProfile = require('../models/SchoolProfile');

const GRADE_SCALE = [
  { min: 91, grade: 'A1' },
  { min: 81, grade: 'A2' },
  { min: 71, grade: 'B1' },
  { min: 61, grade: 'B2' },
  { min: 51, grade: 'C1' },
  { min: 41, grade: 'C2' },
  { min: 33, grade: 'D' },
  { min: 0, grade: 'E' },
];

const getGrade = (obtained, maxMarks) => {
  if (!maxMarks || maxMarks <= 0) return '';
  const pct = (obtained / maxMarks) * 100;
  for (const { min, grade } of GRADE_SCALE) {
    if (pct >= min) return grade;
  }
  return 'E';
};

const slugToTitle = (slug) =>
  String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

let cachedCbseLogoDataUri = null;

const getCbseLogoDataUri = () => {
  if (cachedCbseLogoDataUri) return cachedCbseLogoDataUri;

  const logoPath = path.join(__dirname, '../assets/cbse-logo.svg');
  try {
    const logoBuffer = fs.readFileSync(logoPath);
    cachedCbseLogoDataUri = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;
  } catch (_) {
    cachedCbseLogoDataUri = '';
  }

  return cachedCbseLogoDataUri;
};

const buildStudentCard = (student, exam, resultDoc) => {
  const marksMap = resultDoc?.marks instanceof Map
    ? Object.fromEntries(resultDoc.marks)
    : (resultDoc?.marks || {});

  const subjectEntries = Object.entries(marksMap);
  const perSubjectMax = exam.maximumMarks || 0;

  const subjects = subjectEntries.map(([subjectId, obtained]) => {
    const obtainedNum = typeof obtained === 'number' ? obtained : Number(obtained) || 0;
    return {
      name: slugToTitle(subjectId),
      maxMarks: perSubjectMax,
      marksObtained: obtainedNum,
      grade: perSubjectMax > 0 ? getGrade(obtainedNum, perSubjectMax) : '',
    };
  });

  const grandObtained = subjects.reduce((sum, s) => sum + s.marksObtained, 0);
  const grandMax = subjects.length * perSubjectMax;

  const percentage = grandMax > 0 ? ((grandObtained / grandMax) * 100).toFixed(2) : '0.00';
  const overallGrade = grandMax > 0 ? getGrade(grandObtained, grandMax) : '';

  return {
    admNo: student.rollNumber || '',
    name: student.name || '',
    classSection: `${student.class || ''} - ${student.section || ''}`,
    fatherName: student.fatherName || '',
    motherName: student.motherName || '',
    subjects,
    grandObtained,
    grandMax,
    percentage,
    overallGrade,
  };
};

const buildTemplateData = (tenant, exam, studentCards, academicYear, schoolProfile) => ({
  schoolName: schoolProfile?.schoolName || tenant?.name || '',
  schoolCode: schoolProfile?.schoolCode || tenant?.metadata?.schoolCode || '',
  affiliationNo: schoolProfile?.affiliationNo || tenant?.metadata?.affiliationNo || '',
  schoolLogoUrl: schoolProfile?.logoUrl || '',
  cbseLogoDataUri: getCbseLogoDataUri(),
  schoolTagline: schoolProfile?.tagline || '',
  schoolAddress: schoolProfile?.address || '',
  schoolContact: schoolProfile?.contact || '',
  schoolEmail: schoolProfile?.email || '',
  examTitle: exam.name ? `${exam.name}${academicYear ? ` (${academicYear})` : ''}` : '',
  students: studentCards,
});

// GET /report-card/single?examId=&studentId=
exports.generateSingle = asyncHandler(async (req, res) => {
  const { examId, studentId } = req.query;

  if (!examId || !studentId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'examId and studentId are required.',
    });
  }

  const ExamDefinitionModel = req.models?.ExamDefinition || ExamDefinition;
  const StudentModel = req.models?.Student || Student;
  const ExamResultModel = req.models?.ExamResult || ExamResult;
  const SchoolProfileModel = req.models?.SchoolProfile || SchoolProfile;

  const [exam, student, resultDoc, schoolProfile] = await Promise.all([
    ExamDefinitionModel.findById(examId).lean(),
    StudentModel.findById(studentId).select('rollNumber name class section fatherName motherName').lean(),
    ExamResultModel.findOne({ examId, studentId }).lean(),
    SchoolProfileModel.findOne({}).lean(),
  ]);

  if (!exam) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Exam not found.' });
  }
  if (!student) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Student not found.' });
  }

  const academicYear = req.academicSession ? String(req.academicSession).replace('_', '-') : '';
  const card = buildStudentCard(student, exam, resultDoc);
  const templateData = buildTemplateData(req.tenant, exam, [card], academicYear, schoolProfile);

  const pdfBuffer = await pdfGenerator.generatePDF('report-card', templateData);

  const safeName = String(student.name || 'student').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `report-card_${safeName}_${String(exam.code || examId)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(HTTP_STATUS.OK).send(pdfBuffer);
});

// GET /report-card/bulk?examId=&class=&section=
exports.generateBulk = asyncHandler(async (req, res) => {
  const { examId } = req.query;
  const className = req.query.class;
  const section = req.query.section;

  if (!examId || !className || !section) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'examId, class, and section are required.',
    });
  }

  const ExamDefinitionModel = req.models?.ExamDefinition || ExamDefinition;
  const StudentModel = req.models?.Student || Student;
  const ExamResultModel = req.models?.ExamResult || ExamResult;
  const SchoolProfileModel = req.models?.SchoolProfile || SchoolProfile;

  const [exam, students, results, schoolProfile] = await Promise.all([
    ExamDefinitionModel.findById(examId).lean(),
    StudentModel.find({ class: className, section, isActive: true })
      .select('rollNumber name class section fatherName motherName')
      .sort({ rollNumber: 1 })
      .lean(),
    ExamResultModel.find({ examId, class: className, section }).lean(),
    SchoolProfileModel.findOne({}).lean(),
  ]);

  if (!exam) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Exam not found.' });
  }

  if (!students.length) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'No students found for this class and section.',
    });
  }

  const resultsByStudentId = {};
  for (const r of results) {
    resultsByStudentId[String(r.studentId)] = r;
  }

  const academicYear = req.academicSession ? String(req.academicSession).replace('_', '-') : '';
  const cards = students.map((s) => buildStudentCard(s, exam, resultsByStudentId[String(s._id)]));
  const templateData = buildTemplateData(req.tenant, exam, cards, academicYear, schoolProfile);

  const pdfBuffer = await pdfGenerator.generatePDF('report-card', templateData);

  const filename = `report-cards_${String(exam.code || examId)}_${className}-${section}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(HTTP_STATUS.OK).send(pdfBuffer);
});
