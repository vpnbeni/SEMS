const asyncHandler = require('../middleware/asyncHandler');
const ExamCircular = require('../models/ExamCircular');

const listCirculars = asyncHandler(async (req, res) => {
  const CircularModel = req.models?.ExamCircular || ExamCircular;
  const circulars = await CircularModel.find({ isActive: true }).sort({ updatedAt: -1 }).lean();

  res.status(200).json({
    success: true,
    data: circulars,
  });
});

const createCircular = asyncHandler(async (req, res) => {
  const CircularModel = req.models?.ExamCircular || ExamCircular;
  const title = String(req.body?.title || '').trim();
  const content = String(req.body?.content || '').trim();

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required.',
    });
  }

  const created = await CircularModel.create({
    title,
    content,
    status: 'draft',
    ...(req.academicSession ? { academicSession: req.academicSession } : {}),
  });

  res.status(201).json({
    success: true,
    message: 'Circular drafted successfully.',
    data: created,
  });
});

const updateCircular = asyncHandler(async (req, res) => {
  const CircularModel = req.models?.ExamCircular || ExamCircular;
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'title')) {
    updates.title = String(req.body.title || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'content')) {
    updates.content = String(req.body.content || '').trim();
  }

  if (updates.title === '' || updates.content === '') {
    return res.status(400).json({
      success: false,
      message: 'Title and content cannot be empty.',
    });
  }

  const updated = await CircularModel.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    updates,
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return res.status(404).json({
      success: false,
      message: 'Circular not found.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Circular updated successfully.',
    data: updated,
  });
});

const publishCircular = asyncHandler(async (req, res) => {
  const CircularModel = req.models?.ExamCircular || ExamCircular;
  const circular = await CircularModel.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    { status: 'published', publishedAt: new Date() },
    { new: true, runValidators: true }
  ).lean();

  if (!circular) {
    return res.status(404).json({
      success: false,
      message: 'Circular not found.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Circular published successfully.',
    data: circular,
  });
});

const deleteCircular = asyncHandler(async (req, res) => {
  const CircularModel = req.models?.ExamCircular || ExamCircular;
  const deleted = await CircularModel.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    { isActive: false },
    { new: true }
  ).lean();

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Circular not found.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Circular deleted successfully.',
  });
});

module.exports = {
  listCirculars,
  createCircular,
  updateCircular,
  publishCircular,
  deleteCircular,
};
