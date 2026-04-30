const asyncHandler = require('../middleware/asyncHandler');
const ExamResult = require('../models/ExamResult');

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

  const academicSession = req.academicSession || null;

  const ops = results.map(({ studentId, marks }) => ({
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
          ...(academicSession ? { academicSession } : {}),
        },
        $setOnInsert: {
          examId,
          studentId,
        },
      },
      upsert: true,
    },
  }));

  await ExamResultModel.bulkWrite(ops);

  res.status(200).json({ success: true, message: 'Results saved successfully.' });
});

module.exports = { getResults, upsertResults };
