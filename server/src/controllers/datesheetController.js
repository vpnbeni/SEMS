const fs = require('fs')
const pdf = require('pdf-parse')
const { fromPath: pdfToPic } = require('pdf2pic')
const Tesseract = require('tesseract.js')
const os = require('os')
const asyncHandler = require('../middleware/asyncHandler')
const { generateResponse, HTTP_STATUS } = require('../utils/constants')

// Helper: map month names to numbers
const MONTHS = {
  JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5,
  JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11,
}

// Parse a line like: "10:30 AM - 01:30 PM 041 MATHEMATICS STANDARD"
function parseTimeAndSubject(line) {
  const timeRegex = /(\d{1,2}:\d{2})\s*(AM|PM)\s*[\-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)\s+(\d{2,4})\s+([A-Z0-9 &/\-]+)$/i
  const m = line.match(timeRegex)
  if (!m) return null
  return {
    startTime: `${m[1].toUpperCase()} ${m[2].toUpperCase()}`.trim(),
    endTime: `${m[3].toUpperCase()} ${m[4].toUpperCase()}`.trim(),
    subjectCode: m[5],
    subjectName: m[6].trim(),
  }
}

// Parse a header line like: "TUESDAY 17TH FEBRUARY, 2026"
function parseDateHeader(line) {
  const headerRegex = /(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+(\d{1,2})(?:ST|ND|RD|TH|TM|™)?\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[,\s]+(\d{4})/i
  const m = line.match(headerRegex)
  if (!m) return null
  const day = parseInt(m[2], 10)
  const month = MONTHS[m[3].toUpperCase()]
  const year = parseInt(m[4], 10)
  return { dateISO: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10), dayName: m[1].toUpperCase() }
}

// POST /api/datesheets/import-pdf
exports.importFromPdf = asyncHandler(async (req, res) => {
  console.log('=== Datesheet PDF Import Started ===')
  
  if (!req.files || !req.files.file) {
    console.log('❌ No file uploaded')
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'PDF file is required' })
  }

  const file = req.files.file
  console.log('📄 File received:', {
    name: file.name,
    size: file.size,
    mimetype: file.mimetype,
    tempPath: file.tempFilePath
  })
  
  // Validate file type
  if (!file.mimetype || !file.mimetype.includes('pdf')) {
    console.log('❌ Invalid file type:', file.mimetype)
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      message: 'Invalid file type. Please upload a PDF file.' 
    })
  }

  // Check if temp file exists
  if (!fs.existsSync(file.tempFilePath)) {
    console.error('❌ Temp file does not exist:', file.tempFilePath)
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      message: 'Uploaded file not found. Please try again.' 
    })
  }

  let buffer
  try {
    buffer = fs.readFileSync(file.tempFilePath)
    console.log('✅ File read successfully, size:', buffer.length, 'bytes')
  } catch (err) {
    console.error('❌ Error reading PDF file:', err)
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      message: 'Failed to read PDF file' 
    })
  }

  let text
  try {
    console.log('🔍 Parsing PDF...')
    const data = await pdf(buffer)
    text = data.text
    console.log('✅ PDF parsed successfully')
    console.log('📊 Pages:', data.numpages)
    console.log('📊 Text length:', text.length)
    console.log('📊 Has text:', text.trim().length > 0)
    if (text.length > 0) {
      console.log('📝 First 500 characters:', text.substring(0, 500))
    }
  } catch (err) {
    console.error('❌ Error parsing PDF:', err.message)
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      message: 'Failed to parse PDF. Ensure the PDF is not corrupted or password-protected.' 
    })
  }

  // If no or too little text, try OCR fallback (for scanned/image PDFs)
  let ocrAttempted = false
  if (!text || text.trim().length < 20) {
    console.log('PDF has little or no text. Attempting OCR...')
    ocrAttempted = true
    try {
      const convert = pdfToPic(file.tempFilePath, {
        density: 200,
        format: 'png',
        width: 1600,
        height: 2260,
        saveFilename: `ds_${Date.now()}`,
        savePath: os.tmpdir(),
      })

      // Convert first 5-10 pages max to keep time in check
      const ocrPages = []
      for (let page = 1; page <= 10; page++) {
        try {
          console.log(`Processing page ${page} with OCR...`)
          const result = await convert(page, { responseType: 'image' })
          if (!result || !result.path) {
            console.log(`No more pages to process (stopped at page ${page})`)
            break
          }
          const { data: ocr } = await Tesseract.recognize(result.path, 'eng', { logger: () => {} })
          if (ocr && ocr.text) {
            ocrPages.push(ocr.text)
            console.log(`Page ${page} OCR completed, text length: ${ocr.text.length}`)
          }
        } catch (e) {
          console.error(`OCR failed for page ${page}:`, e.message)
          break
        }
      }
      text = ocrPages.join('\n')
      console.log(`OCR completed. Total text length: ${text.length}`)
      
      if (!text || text.trim().length < 20) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'PDF appears to be a scanned image but OCR produced no readable text. Please ensure the scan is clear and high quality, or use a text-based PDF.',
          debug: {
            ocrAttempted: true,
            ocrPagesProcessed: ocrPages.length,
            textLength: text.length
          }
        })
      }
    } catch (e) {
      console.error('OCR error:', e.message)
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'PDF has no selectable text and OCR is unavailable. Please use a text-based PDF or install OCR prerequisites (Ghostscript & GraphicsMagick).',
        debug: {
          ocrAttempted: true,
          ocrError: e.message
        }
      })
    }
  }

  // Normalize and parse
  const normalize = (s) => {
    let out = s
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[|]/g, ' ')
      .replace(/O/g, '0')
      .replace(/I/g, '1')
      .toUpperCase()
    // Fix spaced AM/PM from OCR (A M -> AM)
    out = out.replace(/A\s*M/g, 'AM').replace(/P\s*M/g, 'PM')
    // Fix spaced time like 10 : 30 -> 10:30
    out = out.replace(/(\d{1,2})\s*:\s*(\d{2})/g, '$1:$2')
    // Fix 10.30 -> 10:30
    out = out.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2')
    // Collapse excess whitespace
    out = out.replace(/\s+/g, ' ').trim()
    return out
  }

  const rawLines = text.split(/\r?\n/) || []
  const lines = rawLines.map(normalize).filter(Boolean)
  const entries = []
  let currentDate = null
  let currentDayName = null
  let currentStartTime = null
  let currentEndTime = null
  let currentCode = null

  const timeOnlyRegex = /(\d{1,2}:\d{2})\s*(AM|PM)\s*[\-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)/
  const codeNameRegex = /^([0-9]{2,4})\s+([A-Z0-9 .,&/\-]+)$/
  const codeOnlyRegex = /^([0-9]{2,4})$/
  const nameOnlyRegex = /^([A-Z][A-Z0-9 .,&/\-]{3,})$/

  for (const line of lines) {
    const header = parseDateHeader(line)
    if (header) {
      currentDate = header.dateISO
      currentDayName = header.dayName
      currentStartTime = null
      currentEndTime = null
      continue
    }

    // Case 1: whole row contains time + code + name
    const both = parseTimeAndSubject(line)
    if (both && currentDate) {
      entries.push({
        date: currentDate,
        day: currentDayName,
        startTime: both.startTime,
        endTime: both.endTime,
        subjectCode: both.subjectCode,
        subjectName: both.subjectName,
      })
      continue
    }

    // Case 2: this line only has time; remember it
    const t = line.match(timeOnlyRegex)
    if (t) {
      currentStartTime = `${t[1]} ${t[2]}`
      currentEndTime = `${t[3]} ${t[4]}`
      continue
    }

    // Case 3: this line contains code + subject, use last seen time
    const cn = line.match(codeNameRegex)
    if (cn && currentDate && currentStartTime && currentEndTime) {
      entries.push({
        date: currentDate,
        day: currentDayName,
        startTime: currentStartTime,
        endTime: currentEndTime,
        subjectCode: cn[1],
        subjectName: cn[2].trim(),
      })
      continue
    }

    // Code-only line (e.g., 041)
    const co = line.match(codeOnlyRegex)
    if (co) {
      currentCode = co[1]
      continue
    }
    // Name-only line, if we have time and code
    const no = line.match(nameOnlyRegex)
    if (no && currentCode && currentDate && currentStartTime && currentEndTime) {
      entries.push({
        date: currentDate,
        day: currentDayName,
        startTime: currentStartTime,
        endTime: currentEndTime,
        subjectCode: currentCode,
        subjectName: no[1].trim(),
      })
      currentCode = null
      continue
    }
  }

  if (entries.length === 0) {
    const normalizedLines = rawLines.map(normalize).filter(Boolean)
    const sample = normalizedLines.slice(0, 20)
    console.log('No entries found. Sample lines:', sample)
    console.log('Total lines processed:', lines.length)
    
    let errorMessage = 'Could not detect any datesheet rows. '
    if (text.trim().length === 0) {
      errorMessage += 'The PDF appears to be empty or contains only images. '
    } else if (ocrAttempted) {
      errorMessage += 'OCR was used but the text format does not match the expected datesheet format. '
    } else {
      errorMessage += 'The PDF text format does not match the expected datesheet format. '
    }
    errorMessage += 'See the troubleshooting guide for help.'
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: errorMessage,
      sample,
      debug: {
        totalLines: lines.length,
        textLength: text.length,
        hasText: text.trim().length > 0,
        ocrAttempted
      }
    })
  }

  console.log(`Successfully parsed ${entries.length} datesheet entries`)
  return res.status(HTTP_STATUS.OK).json({ 
    success: true, 
    message: 'Datesheet parsed successfully', 
    data: { entries, count: entries.length } 
  })
})



// GET /api/datesheets - Get all datesheets
exports.getAllDatesheets = asyncHandler(async (req, res) => {
  const DateSheet = require('../models/DateSheet')
  const { class: className, examType, status, academicYear } = req.query

  const query = { isActive: true }
  
  if (className) query.class = className
  if (examType) query.examType = examType
  if (status) query.status = status
  if (academicYear) query.academicYear = academicYear

  const datesheets = await DateSheet.find(query)
    .populate('createdBy', 'name email')
    .populate('publishedBy', 'name email')
    .sort({ createdAt: -1 })

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Datesheets retrieved successfully',
    data: { datesheets, count: datesheets.length }
  })
})

// GET /api/datesheets/:id - Get datesheet by ID
exports.getDatesheetById = asyncHandler(async (req, res) => {
  const DateSheet = require('../models/DateSheet')
  const { id } = req.params

  const datesheet = await DateSheet.findOne({ _id: id, isActive: true })
    .populate('createdBy', 'name email')
    .populate('publishedBy', 'name email')
    .populate('subjects.subject')

  if (!datesheet) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Datesheet not found'
    })
  }

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Datesheet retrieved successfully',
    data: { datesheet }
  })
})

// POST /api/datesheets - Create new datesheet
exports.createDatesheet = asyncHandler(async (req, res) => {
  const DateSheet = require('../models/DateSheet')
  const { title, examType, class: className, academicYear, startDate, endDate, generalInstructions } = req.body

  // Validate required fields
  if (!title || !examType || !className || !academicYear || !startDate || !endDate) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Missing required fields'
    })
  }

  // Validate date range
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'End date must be after or equal to start date'
    })
  }

  // Create datesheet
  const datesheet = await DateSheet.create({
    title,
    examType,
    class: className,
    academicYear,
    startDate,
    endDate,
    generalInstructions: generalInstructions || [],
    createdBy: req.user._id,
    subjects: []
  })

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Datesheet created successfully',
    data: { datesheet }
  })
})

// PUT /api/datesheets/:id - Update datesheet
exports.updateDatesheet = asyncHandler(async (req, res) => {
  const DateSheet = require('../models/DateSheet')
  const { id } = req.params
  const { title, examType, class: className, academicYear, startDate, endDate, generalInstructions, subjects } = req.body

  const datesheet = await DateSheet.findOne({ _id: id, isActive: true })

  if (!datesheet) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Datesheet not found'
    })
  }

  // Don't allow editing published datesheets
  if (datesheet.status === 'published') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Cannot edit published datesheet'
    })
  }

  // Update fields
  if (title) datesheet.title = title
  if (examType) datesheet.examType = examType
  if (className) datesheet.class = className
  if (academicYear) datesheet.academicYear = academicYear
  if (startDate) datesheet.startDate = startDate
  if (endDate) datesheet.endDate = endDate
  if (generalInstructions) datesheet.generalInstructions = generalInstructions

  // Replace subjects if provided
  if (Array.isArray(subjects)) {
    // Normalize
    datesheet.subjects = subjects.map((s) => ({
      subject: s.subject,
      examDate: s.examDate,
      timeSlot: { start: s.timeSlot?.start || s.start, end: s.timeSlot?.end || s.end },
      duration: s.duration || 180,
      instructions: s.instructions || '',
      isOptional: !!s.isOptional,
    }))
  }

  datesheet.lastModifiedBy = req.user._id
  await datesheet.save()

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Datesheet updated successfully',
    data: { datesheet }
  })
})

// DELETE /api/datesheets/:id - Delete datesheet (soft delete)
exports.deleteDatesheet = asyncHandler(async (req, res) => {
  const DateSheet = require('../models/DateSheet')
  const { id } = req.params

  const datesheet = await DateSheet.findOne({ _id: id, isActive: true })

  if (!datesheet) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Datesheet not found'
    })
  }

  // Soft delete
  datesheet.isActive = false
  await datesheet.save()

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Datesheet deleted successfully'
  })
})

// POST /api/datesheets/:id/publish - Publish datesheet
exports.publishDatesheet = asyncHandler(async (req, res) => {
  const DateSheet = require('../models/DateSheet')
  const { id } = req.params

  const datesheet = await DateSheet.findOne({ _id: id, isActive: true })

  if (!datesheet) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Datesheet not found'
    })
  }

  if (datesheet.status === 'published') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Datesheet is already published'
    })
  }

  // Validate that datesheet has subjects
  if (!datesheet.subjects || datesheet.subjects.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Cannot publish datesheet without subjects'
    })
  }

  datesheet.status = 'published'
  datesheet.publishedDate = new Date()
  datesheet.publishedBy = req.user._id
  await datesheet.save()

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Datesheet published successfully',
    data: { datesheet }
  })
})
