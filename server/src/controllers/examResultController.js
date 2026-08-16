const asyncHandler = require('../middleware/asyncHandler');
const ExamResult = require('../models/ExamResult');
const ExamDefinition = require('../models/ExamDefinition');

const getResults = asyncHandler(async (req, res) => {
  const ExamResultModel = req.models?.ExamResult || ExamResult;
  const { examId, class: className, section } = req.query;

  if (!examId || !className || !section) {
    return res.status(400).json({
      success: false,
      message: 'examId, class, and section are required.',
    });
  }

  const rows = await ExamResultModel.find({
    examId,
    class: className,
    section,
  }).lean();

  const data = rows.map((row) => ({
    studentId: row.studentId,
    marks: row.marks instanceof Map ? Object.fromEntries(row.marks) : (row.marks || {}),
    absent: Boolean(row.absent),
    absentSubjects: Array.isArray(row.absentSubjects) ? row.absentSubjects.map(String) : [],
  }));

  res.status(200).json({ success: true, data });
});

const upsertResults = asyncHandler(async (req, res) => {
  const ExamResultModel = req.models?.ExamResult || ExamResult;
  const { examId, class: className, section, results } = req.body;

  if (!examId || !className || !section) {
    return res.status(400).json({
      success: false,
      message: 'examId, class, and section are required.',
    });
  }

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'results must be a non-empty array.',
    });
  }

  const ExamDefinitionModel = req.models?.ExamDefinition || ExamDefinition;
  const exam = await ExamDefinitionModel.findById(examId).select('maximumMarks code name').lean();
  if (!exam) {
    return res.status(404).json({ success: false, message: 'Exam not found.' });
  }

  const maxMarks = Number(exam.maximumMarks);
  if (Number.isFinite(maxMarks) && maxMarks > 0) {
    for (const row of results) {
      if (row?.absent) continue;
      const absentSet = new Set(
        Array.isArray(row?.absentSubjects) ? row.absentSubjects.map((id) => String(id)) : []
      );
      const marks = row?.marks && typeof row.marks === 'object' ? row.marks : {};
      for (const [subject, value] of Object.entries(marks)) {
        if (absentSet.has(String(subject))) continue;
        if (value === null || value === undefined || value === '') continue;
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid marks for ${subject}.`,
          });
        }
        if (num > maxMarks) {
          return res.status(400).json({
            success: false,
            message: `Marks cannot exceed M.M. ${maxMarks} for ${exam.code || exam.name || 'this exam'}.`,
          });
        }
      }
    }
  }

  const academicSession = req.academicSession || null;

  const ops = results.map(({ studentId, marks, absent, absentSubjects }) => {
    const subjects = Array.isArray(absentSubjects)
      ? [...new Set(absentSubjects.map((id) => String(id).trim()).filter(Boolean))]
      : [];
    return {
    updateOne: {
      filter: {
        examId,
        studentId,
        ...(academicSession ? { academicSession } : {}),
      },
      update: {
        $set: {
          class: className,
          section,
          marks: marks || {},
          absent: Boolean(absent),
          absentSubjects: subjects,
          ...(academicSession ? { academicSession } : {}),
        },
        $setOnInsert: {
          examId,
          studentId,
        },
      },
      upsert: true,
    },
  };
  });

  await ExamResultModel.bulkWrite(ops);

  res.status(200).json({ success: true, message: 'Results saved successfully.' });
});

module.exports = { getResults, upsertResults };
