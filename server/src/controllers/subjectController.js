const asyncHandler = require('../middleware/asyncHandler');
const Subject = require('../models/Subject');
const { generateResponse, getPaginationParams, buildPaginationResponse } = require('../utils/helpers');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../utils/constants');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
const getSubjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req);
  const { isActive } = req.query;

  // Build filter object
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  // Get total count for pagination
  const totalCount = await Subject.countDocuments(filter);

  // Get subjects with pagination
  const subjects = await Subject.find(filter)
    .select('_id name code class duration isActive')
    .sort('name')
    .skip(skip)
    .limit(limit)
    .lean();

  // Build pagination response
  const response = buildPaginationResponse(subjects, totalCount, page, limit);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, response.data, response.pagination)
  );
});

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
const getSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Subject not found')
    );
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, subject)
  );
});

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private
const createSubject = asyncHandler(async (req, res) => {
  // Check if subject code already exists
  const existingCode = await Subject.findOne({ code: req.body.code });
  if (existingCode) {
    return res.status(HTTP_STATUS.CONFLICT).json(
      generateResponse(false, 'Subject with this code already exists')
    );
  }

  const subject = await Subject.create(req.body);

  res.status(HTTP_STATUS.CREATED).json(
    generateResponse(true, SUCCESS_MESSAGES.CREATED, subject)
  );
});

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private
const updateSubject = asyncHandler(async (req, res) => {
  let subject = await Subject.findById(req.params.id);

  if (!subject) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Subject not found')
    );
  }

  // Check for code conflicts (exclude current subject)
  if (req.body.code && req.body.code !== subject.code) {
    const existingCode = await Subject.findOne({ 
      code: req.body.code,
      _id: { $ne: req.params.id }
    });
    if (existingCode) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Subject with this code already exists')
      );
    }
  }

  subject = await Subject.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.UPDATED, subject)
  );
});

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private
const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Subject not found')
    );
  }

  // Soft delete - set isActive to false
  subject.isActive = false;
  await subject.save();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.DELETED)
  );
});

module.exports = {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject
};
