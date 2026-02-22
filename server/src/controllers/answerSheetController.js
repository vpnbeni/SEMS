const AnswerSheet = require('../models/AnswerSheet')
const AnswerSheetsParser = require('../utils/answerSheetsParser')
const AnswerSheetsExcelParser = require('../utils/answerSheetsExcelParser')
const { ANSWER_SHEET_TYPES } = require('../utils/answerSheetTypes')
const pdfGenerator = require('../utils/pdfGenerator')
const seatingPlanBuilder = require('../utils/seatingPlanBuilder')
const cloudinary = require('cloudinary').v2
const fs = require('fs')
const path = require('path')

const ACTIVE_CANDIDATE_FILTER = {
  $or: [{ status: 'active' }, { status: { $exists: false } }],
}

const calculateTotalFromSerialRange = (serialFrom, serialTo) => {
  if (!serialFrom || !serialTo) return null

  const from = parseInt(String(serialFrom).replace(/\D/g, ''), 10)
  const to = parseInt(String(serialTo).replace(/\D/g, ''), 10)

  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null
  return to - from + 1
}

const syncAnswerSheetTotals = async () => {
  const sheets = await AnswerSheet.find({ isActive: true })
    .select('_id serialFrom serialTo total used discarded')

  const updates = []

  sheets.forEach(sheet => {
    const recalculatedTotal = calculateTotalFromSerialRange(sheet.serialFrom, sheet.serialTo)
    if (recalculatedTotal === null || recalculatedTotal === sheet.total) return

    const consumed = (sheet.used || 0) + (sheet.discarded || 0)
    if (consumed > recalculatedTotal) {
      console.warn(
        `Skipping total sync for sheet ${sheet._id}: consumed (${consumed}) exceeds recalculated total (${recalculatedTotal})`
      )
      return
    }

    updates.push({
      updateOne: {
        filter: { _id: sheet._id },
        update: { $set: { total: recalculatedTotal } }
      }
    })
  })

  if (updates.length > 0) {
    await AnswerSheet.bulkWrite(updates)
  }

  return updates.length
}

const getExpectedDatesheetAnswerSheetType = (answerSheet) => {
  let expectedAnswerSheetType = null

  if (answerSheet.answerSheetType === 'Main' || answerSheet.answerSheetType === 'Supplementary') {
    if (answerSheet.pages === 32) {
      expectedAnswerSheetType = '32_pages'
    } else if (answerSheet.pages === 20) {
      expectedAnswerSheetType = '20_pages'
    }
  } else if (answerSheet.answerSheetType === 'Graph') {
    expectedAnswerSheetType = '40_graph'
  } else if (answerSheet.answerSheetType === 'Drawing Sheets') {
    expectedAnswerSheetType = 'drawing_sheets'
  }

  return expectedAnswerSheetType
}

const getSerialAllocationDataForAnswerSheet = async (answerSheet) => {
  if (!answerSheet.serialFrom || !answerSheet.serialTo) {
    return {
      hasSerialNumbers: false,
      allocations: []
    }
  }

  const CBSEDatesheet = require('../models/CBSEDatesheet')
  const Candidate = require('../models/Candidate')

  const cbseDatesheet = await CBSEDatesheet.getActive()

  if (!cbseDatesheet) {
    return {
      hasSerialNumbers: true,
      serialFrom: answerSheet.serialFrom,
      serialTo: answerSheet.serialTo,
      total: answerSheet.total,
      allocations: []
    }
  }

  const candidates = await Candidate.find(ACTIVE_CANDIDATE_FILTER)
    .populate('subjects', 'code name class')
    .lean()

  const subjectFrequency = new Map()

  candidates.forEach(candidate => {
    if (candidate.subjects && candidate.subjects.length > 0) {
      candidate.subjects.forEach(subject => {
        if (subject && subject.code && subject.class) {
          const key = `${subject.code}-${subject.class}`
          const count = subjectFrequency.get(key) || 0
          subjectFrequency.set(key, count + 1)
        }
      })
    }
  })

  const normalizedClass = answerSheet.class.includes('th') ? answerSheet.class : `${answerSheet.class}th`
  const expectedAnswerSheetType = getExpectedDatesheetAnswerSheetType(answerSheet)

  const relatedExams = cbseDatesheet.entries
    .filter(entry => {
      if (entry.subject.class !== normalizedClass) return false
      if (expectedAnswerSheetType && entry.answerSheet !== expectedAnswerSheetType) return false
      return true
    })
    .map(entry => {
      const key = `${entry.subject.code}-${entry.subject.class}`
      const normalizedKey = `${entry.subject.code}-${entry.subject.class.replace(/th$/i, '')}`
      const candidateCount = subjectFrequency.get(key) || subjectFrequency.get(normalizedKey) || 0

      return {
        _id: entry._id,
        examDate: entry.examDate,
        dayName: entry.dayName,
        subjectCode: entry.subject.code,
        subjectName: entry.subject.name,
        class: entry.subject.class,
        timeSlot: entry.timeSlot,
        duration: entry.subject.duration,
        candidateCount
      }
    })
    .filter(exam => exam.candidateCount > 0)
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())

  const fromNum = parseInt(answerSheet.serialFrom.replace(/\D/g, ''), 10)
  const toNum = parseInt(answerSheet.serialTo.replace(/\D/g, ''), 10)
  const prefix = answerSheet.serialFrom.replace(/\d+$/, '')
  const padLength = answerSheet.serialFrom.replace(/\D/g, '').length

  const discardedSet = new Set(
    (answerSheet.discardedSerials || []).map(d => parseInt(d.serial.replace(/\D/g, ''), 10))
  )

  const formatSerial = (num) => prefix + num.toString().padStart(padLength, '0')

  const getNextAvailable = (start) => {
    let current = start
    while (discardedSet.has(current) && current <= toNum) {
      current += 1
    }
    return current <= toNum ? current : null
  }

  let currentSerial = getNextAvailable(fromNum)

  const allocations = relatedExams.map(exam => {
    if (currentSerial === null) {
      return {
        ...exam,
        serialFrom: 'N/A',
        serialTo: 'N/A',
        sheetsAllocated: 0,
        insufficientSheets: true
      }
    }

    const serialStart = currentSerial
    let sheetsAssigned = 0
    let serialEnd = currentSerial

    while (sheetsAssigned < exam.candidateCount && currentSerial !== null && currentSerial <= toNum) {
      if (!discardedSet.has(currentSerial)) {
        serialEnd = currentSerial
        sheetsAssigned += 1
      }

      currentSerial += 1

      while (discardedSet.has(currentSerial) && currentSerial <= toNum) {
        currentSerial += 1
      }
    }

    if (currentSerial > toNum) {
      currentSerial = null
    }

    return {
      ...exam,
      serialFrom: formatSerial(serialStart),
      serialTo: formatSerial(serialEnd),
      sheetsAllocated: sheetsAssigned,
      insufficientSheets: sheetsAssigned < exam.candidateCount
    }
  })

  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.sheetsAllocated, 0)
  const discardedCount = (answerSheet.discardedSerials || []).length
  const usableTotal = answerSheet.total - discardedCount

  return {
    hasSerialNumbers: true,
    serialFrom: answerSheet.serialFrom,
    serialTo: answerSheet.serialTo,
    total: answerSheet.total,
    discardedCount,
    discardedSerials: answerSheet.discardedSerials || [],
    usableTotal,
    allocations,
    totalAllocated,
    remaining: usableTotal - totalAllocated
  }
}

const getAcademicSession = (dateValue) => {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return ''

  const month = date.getMonth() + 1
  const year = date.getFullYear()
  const sessionStartYear = month <= 3 ? year - 1 : year
  const sessionEndYear = sessionStartYear + 1

  return `${sessionStartYear}-${sessionEndYear}`
}

const formatDispatchDateWithDay = (dateValue) => {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return String(dateValue || '')
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

  return `${day}.${month}.${year} (${dayName})`
}

/**
 * @desc    Get all answer sheets (always returns all types from PDF, merged with actual data)
 * @route   GET /api/answersheets
 * @access  Private
 */
exports.getAnswerSheets = async (req, res) => {
  try {
    await syncAnswerSheetTotals()

    const { type, class: classLevel, status } = req.query

    // Get actual answer sheets from database
    const filter = { isActive: true }

    if (type) {
      filter.answerSheetType = type
    }

    if (classLevel) {
      filter.class = classLevel
    }

    const answerSheets = await AnswerSheet.find(filter)
      .sort({ sortOrder: 1, receivedDate: -1 })

    // Create a map of actual data by unique key
    const dataMap = new Map()
    answerSheets.forEach(sheet => {
      const key = `${sheet.answerSheetType}-${sheet.pages}-${sheet.colour}-${sheet.class}`
      if (!dataMap.has(key)) {
        dataMap.set(key, [])
      }
      dataMap.get(key).push(sheet)
    })

    // Merge fixed types with actual data
    const mergedData = ANSWER_SHEET_TYPES.map(fixedType => {
      const key = `${fixedType.answerSheetType}-${fixedType.pages}-${fixedType.colour}-${fixedType.class}`
      const actualSheets = dataMap.get(key) || []

      if (actualSheets.length > 0) {
        // Return actual sheets if they exist
        return actualSheets
      } else {
        // Return fixed type with zero quantities
        return [{
          ...fixedType,
          serialFrom: null,
          serialTo: null,
          total: 0,
          used: 0,
          discarded: 0,
          balance: 0,
          isTemplate: true // Flag to indicate this is template data
        }]
      }
    }).flat()

    // Filter by status if provided
    let filteredSheets = mergedData
    if (status) {
      filteredSheets = mergedData.filter(sheet => {
        const balance = sheet.total - sheet.used - sheet.discarded

        switch (status) {
          case 'used':
            return sheet.used > 0
          case 'balance':
            return balance > 0
          case 'discarded':
            return sheet.discarded > 0
          case 'received':
            return true // Show all in received tab
          default:
            return true
        }
      })
    }

    res.status(200).json({
      success: true,
      count: filteredSheets.length,
      data: filteredSheets
    })
  } catch (error) {
    console.error('Error fetching answer sheets:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch answer sheets'
    })
  }
}

/**
 * @desc    Get answer sheet by ID
 * @route   GET /api/answersheets/:id
 * @access  Private
 */
exports.getAnswerSheetById = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    res.status(200).json({
      success: true,
      data: answerSheet
    })
  } catch (error) {
    console.error('Error fetching answer sheet:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch answer sheet'
    })
  }
}

/**
 * @desc    Create new answer sheet entry
 * @route   POST /api/answersheets
 * @access  Private
 */
exports.createAnswerSheet = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.create(req.body)

    res.status(201).json({
      success: true,
      data: answerSheet
    })
  } catch (error) {
    console.error('Error creating answer sheet:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create answer sheet'
    })
  }
}

/**
 * @desc    Update answer sheet
 * @route   PUT /api/answersheets/:id
 * @access  Private
 */
exports.updateAnswerSheet = async (req, res) => {
  try {
    const existingAnswerSheet = await AnswerSheet.findById(req.params.id)

    if (!existingAnswerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    const updateData = { ...req.body }
    const hasSerialFrom = Object.prototype.hasOwnProperty.call(updateData, 'serialFrom')
    const hasSerialTo = Object.prototype.hasOwnProperty.call(updateData, 'serialTo')

    if (hasSerialFrom || hasSerialTo) {
      const nextSerialFrom = hasSerialFrom ? updateData.serialFrom : existingAnswerSheet.serialFrom
      const nextSerialTo = hasSerialTo ? updateData.serialTo : existingAnswerSheet.serialTo
      const recalculatedTotal = calculateTotalFromSerialRange(nextSerialFrom, nextSerialTo)

      if (recalculatedTotal === null) {
        return res.status(400).json({
          success: false,
          error: 'Invalid serial range. Serial No To must be greater than or equal to Serial No From.'
        })
      }

      const nextUsedRaw = Object.prototype.hasOwnProperty.call(updateData, 'used')
        ? updateData.used
        : existingAnswerSheet.used
      const nextDiscardedRaw = Object.prototype.hasOwnProperty.call(updateData, 'discarded')
        ? updateData.discarded
        : existingAnswerSheet.discarded
      const nextUsed = Number(nextUsedRaw)
      const nextDiscarded = Number(nextDiscardedRaw)

      if (Number.isNaN(nextUsed) || Number.isNaN(nextDiscarded)) {
        return res.status(400).json({
          success: false,
          error: 'Used and discarded values must be valid numbers'
        })
      }

      if (nextUsed + nextDiscarded > recalculatedTotal) {
        return res.status(400).json({
          success: false,
          error: `Invalid serial range. Total sheets (${recalculatedTotal}) cannot be less than used + discarded (${nextUsed + nextDiscarded}).`
        })
      }

      updateData.total = recalculatedTotal
    }

    const answerSheet = await AnswerSheet.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
        context: 'query'
      }
    )

    res.status(200).json({
      success: true,
      data: answerSheet
    })
  } catch (error) {
    console.error('Error updating answer sheet:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update answer sheet'
    })
  }
}

/**
 * @desc    Delete answer sheet
 * @route   DELETE /api/answersheets/:id
 * @access  Private
 */
exports.deleteAnswerSheet = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    // Soft delete
    answerSheet.isActive = false
    await answerSheet.save()

    res.status(200).json({
      success: true,
      data: {}
    })
  } catch (error) {
    console.error('Error deleting answer sheet:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete answer sheet'
    })
  }
}

/**
 * @desc    Use answer sheets
 * @route   POST /api/answersheets/:id/use
 * @access  Private
 */
exports.useAnswerSheets = async (req, res) => {
  try {
    const { quantity, centreDatesheetEntryId, examDate, subjectCode, subjectName, candidateCount } = req.body

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      })
    }

    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    // Link to centre datesheet if provided
    if (centreDatesheetEntryId) {
      answerSheet.centreDatesheetEntry = centreDatesheetEntryId
    }
    if (examDate) {
      answerSheet.linkedExamDate = examDate
    }
    if (subjectCode) {
      answerSheet.linkedSubjectCode = subjectCode
    }
    if (subjectName) {
      answerSheet.linkedSubjectName = subjectName
    }
    if (candidateCount !== undefined) {
      answerSheet.linkedCandidateCount = candidateCount
    }

    await answerSheet.useSheets(quantity)

    res.status(200).json({
      success: true,
      data: answerSheet
    })
  } catch (error) {
    console.error('Error using answer sheets:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to use answer sheets'
    })
  }
}

/**
 * @desc    Discard answer sheets
 * @route   POST /api/answersheets/:id/discard
 * @access  Private
 */
exports.discardAnswerSheets = async (req, res) => {
  try {
    const { quantity } = req.body

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      })
    }

    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    await answerSheet.discardSheets(quantity)

    res.status(200).json({
      success: true,
      data: answerSheet
    })
  } catch (error) {
    console.error('Error discarding answer sheets:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to discard answer sheets'
    })
  }
}

/**
 * @desc    Get answer sheets statistics
 * @route   GET /api/answersheets/stats/summary
 * @access  Private
 */
exports.getStatistics = async (req, res) => {
  try {
    await syncAnswerSheetTotals()

    const summaryStats = await AnswerSheet.getSummaryStats()
    const statsByType = await AnswerSheet.getStatsByType()

    res.status(200).json({
      success: true,
      data: {
        summary: summaryStats,
        byType: statsByType
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    })
  }
}

/**
 * @desc    Parse answer sheets PDF and get template data
 * @route   GET /api/answersheets/parse/template
 * @access  Private
 */
exports.parseTemplate = async (req, res) => {
  try {
    const pdfPath = path.join(__dirname, '../../../client/src/Answer Sheets.pdf')

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheets template PDF not found'
      })
    }

    const dataBuffer = fs.readFileSync(pdfPath)
    const parser = new AnswerSheetsParser()
    const result = await parser.parsePDF(dataBuffer)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to parse PDF'
      })
    }

    const stats = parser.getStatistics(result.data.entries)

    res.status(200).json({
      success: true,
      data: {
        ...result.data,
        statistics: stats
      }
    })
  } catch (error) {
    console.error('Error parsing template:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to parse template'
    })
  }
}

/**
 * @desc    Download Excel template
 * @route   GET /api/answersheets/template/download
 * @access  Private
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')

    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheets template Excel file not found'
      })
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="Answer_Sheets_Template.xlsx"')

    // Stream the file
    const fileStream = fs.createReadStream(excelPath)
    fileStream.pipe(res)

  } catch (error) {
    console.error('Error downloading template:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to download template'
    })
  }
}

/**
 * @desc    Upload and parse Excel file
 * @route   POST /api/answersheets/upload/excel
 * @access  Private
 */
exports.uploadExcel = async (req, res) => {
  let cloudinaryResult = null

  try {
    console.log('📥 Upload Excel Request Received')
    console.log('  req.files:', req.files ? Object.keys(req.files) : 'undefined')
    console.log('  req.body:', req.body)

    // Check if file was uploaded
    if (!req.files || !req.files.file) {
      console.error('❌ No file in request')
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    const file = req.files.file
    console.log('📄 File Details:')
    console.log('  Name:', file.name)
    console.log('  Size:', file.size, 'bytes')
    console.log('  Mimetype:', file.mimetype)

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)'
      })
    }

    // Upload to Cloudinary (optional - continues if fails)
    if (cloudinary.config().cloud_name) {
      console.log('📤 Uploading Excel file to Cloudinary...')

      try {
        cloudinaryResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'answer-sheets',
              resource_type: 'raw',
              public_id: `answer_sheets_${Date.now()}`,
              format: file.name.split('.').pop()
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            }
          )
          uploadStream.end(file.data)
        })

        console.log(`✅ File uploaded to Cloudinary: ${cloudinaryResult.secure_url}`)
      } catch (cloudinaryError) {
        console.error('⚠️  Cloudinary upload failed:', cloudinaryError.message)
        console.log('⏭️  Continuing without Cloudinary upload...')
        // Continue with parsing even if Cloudinary fails
      }
    } else {
      console.log('⏭️  Cloudinary not configured, skipping file upload')
    }

    // Parse the Excel file
    console.log('🔄 Starting Excel parsing...')
    console.log('  File data type:', typeof file.data)
    console.log('  File data length:', file.data ? file.data.length : 'undefined')
    console.log('  Is Buffer:', Buffer.isBuffer(file.data))

    const parser = new AnswerSheetsExcelParser()
    const result = await parser.parseExcel(file.data)

    console.log('📊 Parse result:')
    console.log('  Success:', result.success)
    console.log('  Entries count:', result.data ? result.data.entries.length : 0)

    if (!result.success) {
      console.error('❌ Parsing failed:', result.error)
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to parse Excel file'
      })
    }

    // Log parsed entries for debugging
    console.log(`📊 Parsed ${result.data.entries.length} entries from Excel`)
    result.data.entries.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.answerSheetType} - ${entry.serialFrom} to ${entry.serialTo}`)
    })

    // Filter out entries with blank/zero serial numbers
    const validEntries = result.data.entries.filter(entry => {
      const hasSerialFrom = entry.serialFrom && entry.serialFrom.trim() !== ''
      const hasSerialTo = entry.serialTo && entry.serialTo.trim() !== ''
      return hasSerialFrom && hasSerialTo
    })

    const skippedCount = result.data.entries.length - validEntries.length
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} entries with blank serial numbers`)
    }

    // Create entries in database
    const createdEntries = []
    const errors = []
    const skipped = []

    for (const entry of validEntries) {
      try {
        // Add cloudinary URL if available
        if (cloudinaryResult) {
          entry.uploadedFileUrl = cloudinaryResult.secure_url
          entry.uploadedFileId = cloudinaryResult.public_id
        }

        const created = await AnswerSheet.create(entry)
        createdEntries.push(created)
        console.log(`✅ Created: ${created.answerSheetType} - ${created.total} sheets`)
      } catch (error) {
        console.error(`❌ Failed to create: ${entry.answerSheetType} - ${error.message}`)
        errors.push({
          entry,
          error: error.message
        })
      }
    }

    // Track skipped entries
    result.data.entries.forEach(entry => {
      const hasSerialFrom = entry.serialFrom && entry.serialFrom.trim() !== ''
      const hasSerialTo = entry.serialTo && entry.serialTo.trim() !== ''
      if (!hasSerialFrom || !hasSerialTo) {
        skipped.push({
          type: entry.answerSheetType,
          reason: 'No serial numbers provided (not received at centre)'
        })
      }
    })

    const stats = parser.getStatistics(validEntries)

    res.status(200).json({
      success: true,
      data: {
        created: createdEntries.length,
        failed: errors.length,
        skipped: skipped.length,
        total: result.data.count,
        entries: createdEntries,
        skippedEntries: skipped.length > 0 ? skipped : undefined,
        errors: errors.length > 0 ? errors : undefined,
        statistics: stats,
        fileUrl: cloudinaryResult ? cloudinaryResult.secure_url : undefined
      },
      message: `Successfully added ${createdEntries.length} answer sheet entries${skipped.length > 0 ? `. Skipped ${skipped.length} entries with no serial numbers.` : ''}`
    })

  } catch (error) {
    console.error('Error uploading Excel:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to upload and process Excel file'
    })
  }
}

/**
 * @desc    Get answer sheet details with related datesheet entries
 * @route   GET /api/answersheets/:id/details
 * @access  Private
 */
exports.getAnswerSheetDetails = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    // Get centre datesheet data to find related exams
    const CBSEDatesheet = require('../models/CBSEDatesheet')
    const Candidate = require('../models/Candidate')
    const Subject = require('../models/Subject')

    const cbseDatesheet = await CBSEDatesheet.getActive()
    let relatedExams = []

    if (cbseDatesheet) {
      // Get all candidates with their subjects
      const candidates = await Candidate.find(ACTIVE_CANDIDATE_FILTER)
        .populate('subjects', 'code name class')
        .lean()

      // Get all subjects to fetch answer sheet types
      const subjects = await Subject.find({ isActive: true }).lean()

      // Create a map of subject code+class to answer sheet type
      const subjectAnswerSheetMap = new Map()
      subjects.forEach(subject => {
        const key = `${subject.code}-${subject.class}`
        subjectAnswerSheetMap.set(key, subject.answerSheet || 'none')
      })

      // Calculate candidate count per subject
      const subjectFrequency = new Map()

      candidates.forEach(candidate => {
        if (candidate.subjects && candidate.subjects.length > 0) {
          candidate.subjects.forEach(subject => {
            if (subject && subject.code && subject.class) {
              const key = `${subject.code}-${subject.class}`
              const count = subjectFrequency.get(key) || 0
              subjectFrequency.set(key, count + 1)
            }
          })
        }
      })

      // Normalize answer sheet class for comparison (10 -> 10th, 12 -> 12th)
      const normalizedClass = answerSheet.class.includes('th') ? answerSheet.class : `${answerSheet.class}th`

      // Determine the expected answer sheet type based on BOTH answerSheetType AND pages
      // This ensures 32-page Main sheets only match 32_pages subjects,
      // and 20-page Main sheets only match 20_pages subjects
      let expectedAnswerSheetType = null
      
      if (answerSheet.answerSheetType === 'Main' || answerSheet.answerSheetType === 'Supplementary') {
        // Main/Supplementary sheets come in different page counts
        if (answerSheet.pages === 32) {
          expectedAnswerSheetType = '32_pages'
        } else if (answerSheet.pages === 20) {
          expectedAnswerSheetType = '20_pages'
        }
      } else if (answerSheet.answerSheetType === 'Graph') {
        expectedAnswerSheetType = '40_graph'
      } else if (answerSheet.answerSheetType === 'Drawing Sheets') {
        expectedAnswerSheetType = 'drawing_sheets'
      }

      // Find related exam entries
      relatedExams = cbseDatesheet.entries
        .filter(entry => {
          // Match by class
          if (entry.subject.class !== normalizedClass) return false

          // Match on the specific answer sheet type (including page count)
          if (expectedAnswerSheetType && entry.answerSheet !== expectedAnswerSheetType) return false

          return true
        })
        .map(entry => {
          const key = `${entry.subject.code}-${entry.subject.class}`
          const normalizedKey = `${entry.subject.code}-${entry.subject.class.replace(/th$/i, '')}`
          const candidateCount = subjectFrequency.get(key) || subjectFrequency.get(normalizedKey) || 0

          return {
            _id: entry._id,
            examDate: entry.examDate,
            dayName: entry.dayName,
            subjectCode: entry.subject.code,
            subjectName: entry.subject.name,
            class: entry.subject.class,
            timeSlot: entry.timeSlot,
            duration: entry.subject.duration,
            candidateCount,
            answerSheetType: entry.answerSheet
          }
        })
        .filter(exam => exam.candidateCount > 0)
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
    }

    res.status(200).json({
      success: true,
      data: {
        answerSheet,
        relatedExams
      }
    })
  } catch (error) {
    console.error('Error fetching answer sheet details:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch answer sheet details'
    })
  }
}

/**
 * @desc    Get serial number allocation by date for an answer sheet
 * @route   GET /api/answersheets/:id/allocation
 * @access  Private
 */
exports.getSerialAllocation = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    const allocationData = await getSerialAllocationDataForAnswerSheet(answerSheet)

    res.status(200).json({
      success: true,
      data: allocationData
    })
  } catch (error) {
    console.error('Error calculating serial allocation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to calculate serial allocation'
    })
  }
}

/**
 * @desc    Download answer sheet dispatch record for a specific exam entry
 * @route   GET /api/answersheets/:id/dispatch-record/:entryId/download
 * @access  Private
 */
exports.downloadDispatchRecord = async (req, res) => {
  try {
    const { id, entryId } = req.params

    const answerSheet = await AnswerSheet.findById(id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    if (!answerSheet.serialFrom || !answerSheet.serialTo) {
      return res.status(400).json({
        success: false,
        error: 'Serial range is not configured for this answer sheet'
      })
    }

    const allocationData = await getSerialAllocationDataForAnswerSheet(answerSheet)
    const selectedAllocation = allocationData.allocations.find(
      allocation => String(allocation._id) === String(entryId)
    )

    if (!selectedAllocation) {
      return res.status(404).json({
        success: false,
        error: 'Allocation entry not found for this answer sheet'
      })
    }

    if (
      selectedAllocation.serialFrom === 'N/A'
      || selectedAllocation.serialTo === 'N/A'
      || !selectedAllocation.sheetsAllocated
    ) {
      return res.status(400).json({
        success: false,
        error: 'Cannot generate dispatch record because serial allocation is unavailable for this exam'
      })
    }

    const SeatingPlanTemplateSetting = req.models?.SeatingPlanTemplateSetting
    const CentreDetail = req.models?.CentreDetail

    let roomAllocationMode = 'auto'
    if (SeatingPlanTemplateSetting) {
      const settingsDoc = await SeatingPlanTemplateSetting.findOne({}).sort({ updatedAt: -1 })
      if (String(settingsDoc?.roomAllocationMode || '').toLowerCase() === 'manual') {
        roomAllocationMode = 'manual'
      }
    }

    const centreDetails = CentreDetail
      ? await CentreDetail.findOne({}).sort({ updatedAt: -1 }).lean()
      : null

    const seatingData = await seatingPlanBuilder.buildSeatingData(entryId, {
      centreDetails,
      roomAllocationMode,
    })

    const serialStartNum = parseInt(String(selectedAllocation.serialFrom).replace(/\D/g, ''), 10)
    const serialEndNum = parseInt(String(selectedAllocation.serialTo).replace(/\D/g, ''), 10)

    if (Number.isNaN(serialStartNum) || Number.isNaN(serialEndNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid serial allocation for the selected exam'
      })
    }

    const prefix = answerSheet.serialFrom.replace(/\d+$/, '')
    const padLength = answerSheet.serialFrom.replace(/\D/g, '').length
    const formatSerial = (num) => prefix + num.toString().padStart(padLength, '0')

    const discardedNumberToReason = new Map()
    ;(answerSheet.discardedSerials || []).forEach(item => {
      const num = parseInt(String(item.serial).replace(/\D/g, ''), 10)
      if (!Number.isNaN(num)) {
        discardedNumberToReason.set(num, item.reason || 'Damaged/Misprinted')
      }
    })

    const assignedSerialNumbers = []
    const skippedDiscardedForExam = new Map()

    let currentSerial = serialStartNum
    while (currentSerial <= serialEndNum && assignedSerialNumbers.length < selectedAllocation.sheetsAllocated) {
      if (discardedNumberToReason.has(currentSerial)) {
        skippedDiscardedForExam.set(currentSerial, {
          serial: formatSerial(currentSerial),
          reason: discardedNumberToReason.get(currentSerial)
        })
      } else {
        assignedSerialNumbers.push(currentSerial)
      }
      currentSerial += 1
    }

    const roomRows = []
    let serialCursor = 0
    const sheetTypeLabel = answerSheet.pages ? `${answerSheet.pages} Pgs` : answerSheet.answerSheetType

    ;(seatingData.rooms || []).forEach(room => {
      const roomRegistered = Number(room.registered || 0)
      if (roomRegistered <= 0) return

      const roomSerials = assignedSerialNumbers.slice(serialCursor, serialCursor + roomRegistered)
      if (roomSerials.length === 0) return

      roomRows.push({
        srNo: roomRows.length + 1,
        roomNo: room.roomNo,
        type: sheetTypeLabel,
        colour: answerSheet.colour ? String(answerSheet.colour).toUpperCase() : '—',
        series: answerSheet.series || '—',
        from: formatSerial(roomSerials[0]),
        to: formatSerial(roomSerials[roomSerials.length - 1]),
        total: roomSerials.length
      })

      serialCursor += roomSerials.length
    })

    if (roomRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No room-wise allocation could be generated for this exam'
      })
    }

    const registeredTotal = (seatingData.rooms || []).reduce(
      (sum, room) => sum + Number(room.registered || 0),
      0
    )
    const totalAllocated = roomRows.reduce((sum, row) => sum + row.total, 0)

    const classNumber = String(selectedAllocation.class || '').replace(/th$/i, '')
    const classLabel = classNumber === '10' ? 'X' : classNumber === '12' ? 'XII' : selectedAllocation.class
    const examDateValue = selectedAllocation.examDate
    const examDateLabel = formatDispatchDateWithDay(examDateValue)
    const examSession = getAcademicSession(examDateValue)

    const notes = Array.from(skippedDiscardedForExam.values()).sort((a, b) =>
      a.serial.localeCompare(b.serial, undefined, { numeric: true, sensitivity: 'base' })
    )

    const additionalNotes = []
    if (registeredTotal !== selectedAllocation.candidateCount) {
      additionalNotes.push(
        `Registered candidates from seating plan (${registeredTotal}) differ from allocation schedule (${selectedAllocation.candidateCount}).`
      )
    }
    if (selectedAllocation.sheetsAllocated !== totalAllocated) {
      additionalNotes.push(
        `Allocated serial count for this record is ${totalAllocated}, while schedule allocation is ${selectedAllocation.sheetsAllocated}.`
      )
    }

    const templateData = {
      schoolName: (centreDetails?.centreName && String(centreDetails.centreName).trim()) || seatingPlanBuilder.schoolName || 'EXAMINATION CENTRE',
      centreNo: (centreDetails?.centreNo && String(centreDetails.centreNo).trim()) || seatingPlanBuilder.centreNo || '',
      examSession,
      examDate: examDateLabel,
      subjectName: String(selectedAllocation.subjectName || seatingData.datesheet?.subjectName || '').toUpperCase(),
      classLabel,
      subjectCode: selectedAllocation.subjectCode || seatingData.datesheet?.subjectCode || '',
      rows: roomRows,
      totalAllocated,
      registeredTotal,
      notes,
      additionalNotes
    }

    const pdfBuffer = await pdfGenerator.generateAnswerSheetDispatchRecord(templateData)

    const examDate = new Date(examDateValue)
    const datePart = Number.isNaN(examDate.getTime())
      ? 'unknown-date'
      : examDate.toISOString().split('T')[0]
    const safeSubjectCode = String(selectedAllocation.subjectCode || 'subject')
      .replace(/[^a-z0-9_-]/gi, '_')
    const filename = `answer-sheet-dispatch-record-${safeSubjectCode}-${datePart}.pdf`

    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)
    res.end(buffer)
  } catch (error) {
    console.error('Error generating dispatch record PDF:', error)
    const message = error?.message && typeof error.message === 'string'
      ? error.message
      : 'Failed to generate dispatch record PDF'
    res.status(500).json({
      success: false,
      error: message
    })
  }
}

/**
 * @desc    Add discarded serial number(s)
 * @route   POST /api/answersheets/:id/discarded
 * @access  Private
 */
exports.addDiscardedSerials = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    const { serials, fromSerial, toSerial, reason } = req.body

    // Handle range input
    if (fromSerial && toSerial) {
      const added = await answerSheet.addDiscardedRange(fromSerial, toSerial, reason || 'Damaged/Misprinted')
      return res.status(200).json({
        success: true,
        message: `Added ${added.length} discarded serial(s)`,
        data: {
          added,
          discardedSerials: answerSheet.discardedSerials,
          discardedCount: answerSheet.discardedSerials.length
        }
      })
    }

    // Handle single or array of serials
    const serialList = Array.isArray(serials) ? serials : [serials]
    const added = []
    const errors = []

    for (const serial of serialList) {
      try {
        await answerSheet.addDiscardedSerial(serial, reason || 'Damaged/Misprinted')
        added.push(serial)
      } catch (err) {
        errors.push({ serial, error: err.message })
      }
    }

    // Reload to get updated data
    await answerSheet.save()

    res.status(200).json({
      success: true,
      message: `Added ${added.length} discarded serial(s)`,
      data: {
        added,
        errors: errors.length > 0 ? errors : undefined,
        discardedSerials: answerSheet.discardedSerials,
        discardedCount: answerSheet.discardedSerials.length
      }
    })
  } catch (error) {
    console.error('Error adding discarded serials:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add discarded serials'
    })
  }
}

/**
 * @desc    Remove discarded serial number
 * @route   DELETE /api/answersheets/:id/discarded/:serial
 * @access  Private
 */
exports.removeDiscardedSerial = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    const { serial } = req.params

    await answerSheet.removeDiscardedSerial(serial)

    res.status(200).json({
      success: true,
      message: `Removed serial ${serial} from discarded list`,
      data: {
        discardedSerials: answerSheet.discardedSerials,
        discardedCount: answerSheet.discardedSerials.length
      }
    })
  } catch (error) {
    console.error('Error removing discarded serial:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove discarded serial'
    })
  }
}

/**
 * @desc    Get discarded serials for an answer sheet
 * @route   GET /api/answersheets/:id/discarded
 * @access  Private
 */
exports.getDiscardedSerials = async (req, res) => {
  try {
    const answerSheet = await AnswerSheet.findById(req.params.id)

    if (!answerSheet) {
      return res.status(404).json({
        success: false,
        error: 'Answer sheet not found'
      })
    }

    res.status(200).json({
      success: true,
      data: {
        discardedSerials: answerSheet.discardedSerials || [],
        discardedCount: (answerSheet.discardedSerials || []).length,
        serialRange: {
          from: answerSheet.serialFrom,
          to: answerSheet.serialTo
        }
      }
    })
  } catch (error) {
    console.error('Error getting discarded serials:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get discarded serials'
    })
  }
}

module.exports = exports
