const asyncHandler = require('../middleware/asyncHandler')
const { HTTP_STATUS } = require('../utils/constants')
const pdfGenerator = require('../utils/pdfGenerator')
const { ensureTenantActiveDatesheet } = require('../services/cbseDatesheetRolloutService')
const { mergePackingDispatchIntoCentreDetails } = require('../services/masterPackingDispatchService')

const normalizeSubjectCode = (code) =>
  String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\((?:E|H)\)$/i, '')

const normalizeSubjectClass = (classValue) => {
  const normalized = String(classValue || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

  if (!normalized) return ''
  if (normalized === '10' || normalized === '10th') return '10th'
  if (normalized === '12' || normalized === '12th') return '12th'
  return normalized
}

const formatExamDate = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const normalizeMultiline = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

// @desc    Generate dispatch slip PDF for a centre datesheet entry (A4 with two halves)
// @route   GET /api/dispatch/slip/:entryId/pdf
// @access  Private
exports.downloadDispatchSlipPdf = asyncHandler(async (req, res) => {
  const entryId = String(req.params.entryId || '').trim()
  if (!entryId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Entry id is required' })
  }

  const destination = String(req.query.destination || 'CBSE Regional Office').trim()

  const CBSEDatesheet = req.models?.CBSEDatesheet || require('../models/CBSEDatesheet')
  const Subject = req.models?.Subject || require('../models/Subject')
  const Candidate = req.models?.Candidate || require('../models/Candidate')
  const CentreDetail = req.models?.CentreDetail || require('../models/CentreDetail')

  const { datesheet: cbseDatesheet } = await ensureTenantActiveDatesheet(CBSEDatesheet)
  if (!cbseDatesheet?.entries?.length) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'No CBSE datesheet found. Please import a CBSE datesheet first.',
    })
  }

  const entry = cbseDatesheet.entries.find((e) => String(e?._id) === entryId)
  if (!entry) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Datesheet entry not found',
    })
  }

  const subjectCode = normalizeSubjectCode(entry?.subject?.code)
  const classValue = normalizeSubjectClass(entry?.subject?.class)
  const subjectName = String(entry?.subject?.name || '').trim()
  const examDate = entry?.examDate ? new Date(entry.examDate) : null

  if (!subjectCode || !classValue || !examDate || Number.isNaN(examDate.getTime())) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid datesheet entry (missing subject code/class/exam date)',
    })
  }

  // Count candidates for this subject+class via Subject master linkage.
  const subjectDoc = await Subject.findOne({ code: subjectCode, class: classValue, isActive: true })
    .select('_id')
    .lean()

  const candidateCount = subjectDoc?._id
    ? await Candidate.countDocuments({
        $or: [{ status: 'active' }, { status: { $exists: false } }],
        subjects: subjectDoc._id,
      })
    : 0

  const centreDetailsRaw = await CentreDetail.findOne({}).sort({ updatedAt: -1 }).lean()
  const centreDetails = await mergePackingDispatchIntoCentreDetails(centreDetailsRaw)
  const centreNo = String(centreDetails?.centreNo || centreDetails?.centreSchoolCode || '').trim()
  const centreName = String(centreDetails?.centreName || '').trim()
  const insuredAmount = String(centreDetails?.dispatchSlipInsuredAmount || '1000').trim()
  const toAddressLines = normalizeMultiline(centreDetails?.dispatchSlipToAddress)
  const fromAddressLines = normalizeMultiline(centreDetails?.dispatchSlipFromAddress)

  const answerSheetTypeRaw = String(entry?.answerSheet || '').trim()
  const answerSheetType = answerSheetTypeRaw ? answerSheetTypeRaw.replace(/_/g, ' ') : ''

  const templateData = {
    centreNo: centreNo || '—',
    centreName: centreName || '—',
    subjectCode,
    subjectName,
    classValue,
    examDate: formatExamDate(examDate),
    totalSheets: candidateCount,
    answerSheetType,
    insuredAmount: insuredAmount || '—',
    toAddressLines,
    fromAddressLines: fromAddressLines.length
      ? fromAddressLines
      : normalizeMultiline([centreName, `School Code: ${String(centreDetails?.centreSchoolCode || '').trim()}`].filter(Boolean).join('\n')),
  }

  const pdfBuffer = await pdfGenerator.generatePDF('dispatch-slip', templateData)

  const safeDate = examDate.toISOString().slice(0, 10)
  const filename = `dispatch-slip_${safeDate}_${subjectCode}_${classValue}.pdf`

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  return res.status(HTTP_STATUS.OK).send(pdfBuffer)
})

