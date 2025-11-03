const asyncHandler = require('../middleware/asyncHandler');
const Subject = require('../models/Subject');
const { generateResponse, getPaginationParams, buildPaginationResponse } = require('../utils/helpers');
const pdf = require('pdf-parse')
const { fromPath: pdfToPic } = require('pdf2pic')
const Tesseract = require('tesseract.js')
const os = require('os')
const { uploadToCloudinary } = require('../config/cloudinary')
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

// @desc    Delete subject (permanent)
// @route   DELETE /api/subjects/:id
// @access  Private
const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id)
  if (!subject) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, 'Subject not found')
    )
  }

  await Subject.deleteOne({ _id: subject._id })

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.DELETED)
  )
})

module.exports = {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject
};

// @desc    Delete ALL subjects (permanent)
// @route   DELETE /api/subjects
// @access  Private (admin)
const deleteAllSubjects = asyncHandler(async (req, res) => {
  const result = await Subject.deleteMany({})
  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'All subjects permanently deleted', { deletedCount: result.deletedCount })
  )
})

module.exports.deleteAllSubjects = deleteAllSubjects

// --- Import subjects from PDF ---
const normalize = (s) => {
  let out = (s || '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[|]/g, ' ')
    .replace(/O/g, '0')
    .toUpperCase()
  out = out.replace(/\s+/g, ' ').trim()
  return out
}

// @desc    Import subjects from PDF; store PDF to Cloudinary
// @route   POST /api/subjects/import-pdf
// @access  Private
module.exports.importSubjectsFromPdf = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(generateResponse(false, 'PDF file is required'))
  }
  const file = req.files.file

  // Upload original PDF to Cloudinary (raw)
  let uploadedUrl = null
  try {
    const up = await uploadToCloudinary(file.tempFilePath, 'subjects/pdfs', `subjects_${Date.now()}`)
    uploadedUrl = up.url
  } catch (e) {
    // Non-fatal; continue parsing
  }

  let text = ''
  try {
    const data = await pdf(file)
    text = data.text
  } catch (e) {}

  if (!text || text.trim().length < 10) {
    try {
      const converter = pdfToPic(file.tempFilePath, { density: 200, format: 'png', savePath: os.tmpdir() })
      const pages = []
      for (let p = 1; p <= 5; p++) {
        const result = await converter(p, { responseType: 'image' })
        if (!result || !result.path) break
        const { data } = await Tesseract.recognize(result.path, 'eng', { logger: () => {} })
        if (data && data.text) pages.push(data.text)
      }
      text = pages.join('\n')
    } catch (e) {}
  }

  if (!text || text.trim().length < 10) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(generateResponse(false, 'Could not read PDF text'))
  }

  const lines = text.split(/\r?\n/).map(normalize).filter(Boolean)
  const subjectsFound = []
  // Match either "CODE NAME" or "NAME CODE"
  const codeName = /(\b\d{2,4}\b)\s+([A-Z][A-Z0-9 .,&/\-]{3,})/
  const nameCode = /([A-Z][A-Z0-9 .,&/\-]{3,})\s+(\b\d{2,4}\b)/

  for (const ln of lines) {
    let m = ln.match(codeName)
    if (m) {
      subjectsFound.push({ code: m[1], name: m[2] })
      continue
    }
    m = ln.match(nameCode)
    if (m) {
      subjectsFound.push({ code: m[2], name: m[1] })
    }
  }

  // Deduplicate by code
  const dedup = new Map()
  for (const s of subjectsFound) {
    if (!dedup.has(s.code)) dedup.set(s.code, s)
  }

  const toInsert = []
  for (const s of dedup.values()) {
    const exists = await Subject.findOne({ code: s.code }).lean()
    if (!exists) {
      toInsert.push({ name: s.name, code: s.code, class: '12th', duration: 3, isActive: true })
    }
  }

  if (toInsert.length) {
    await Subject.insertMany(toInsert)
  }

  return res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Subjects imported', { inserted: toInsert.length, storedPdfUrl: uploadedUrl })
  )
})
