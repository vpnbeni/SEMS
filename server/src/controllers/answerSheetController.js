const AnswerSheet = require('../models/AnswerSheet')
const AnswerSheetsParser = require('../utils/answerSheetsParser')
const AnswerSheetsExcelParser = require('../utils/answerSheetsExcelParser')
const { ANSWER_SHEET_TYPES } = require('../utils/answerSheetTypes')
const cloudinary = require('cloudinary').v2
const fs = require('fs')
const path = require('path')

/**
 * @desc    Get all answer sheets (always returns all types from PDF, merged with actual data)
 * @route   GET /api/answersheets
 * @access  Private
 */
exports.getAnswerSheets = async (req, res) => {
  try {
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
    const answerSheet = await AnswerSheet.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )

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
      const candidates = await Candidate.find({ isActive: true })
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

      // Map answer sheet type from storage format to datesheet format
      const answerSheetTypeMap = {
        'Main': ['32_pages', '20_pages'],
        'Graph': ['40_graph'],
        'Supplementary': ['32_pages', '20_pages']
      }

      const acceptableTypes = answerSheetTypeMap[answerSheet.answerSheetType] || []

      // Find related exam entries
      relatedExams = cbseDatesheet.entries
        .filter(entry => {
          // Match by class
          if (entry.subject.class !== normalizedClass) return false

          // Match by answer sheet type
          if (acceptableTypes.length > 0 && !acceptableTypes.includes(entry.answerSheet)) return false

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

    // Check if serial numbers are set
    if (!answerSheet.serialFrom || !answerSheet.serialTo) {
      return res.status(200).json({
        success: true,
        data: {
          hasSerialNumbers: false,
          allocations: []
        }
      })
    }

    // Get centre datesheet data
    const CBSEDatesheet = require('../models/CBSEDatesheet')
    const Candidate = require('../models/Candidate')
    const Subject = require('../models/Subject')

    const cbseDatesheet = await CBSEDatesheet.getActive()

    if (!cbseDatesheet) {
      return res.status(200).json({
        success: true,
        data: {
          hasSerialNumbers: true,
          serialFrom: answerSheet.serialFrom,
          serialTo: answerSheet.serialTo,
          total: answerSheet.total,
          allocations: []
        }
      })
    }

    // Get all candidates with their subjects
    const candidates = await Candidate.find({ isActive: true })
      .populate('subjects', 'code name class')
      .lean()

    // Get all subjects
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

    // Normalize answer sheet class
    const normalizedClass = answerSheet.class.includes('th') ? answerSheet.class : `${answerSheet.class}th`

    // Map answer sheet type
    const answerSheetTypeMap = {
      'Main': ['32_pages', '20_pages'],
      'Graph': ['40_graph'],
      'Supplementary': ['32_pages', '20_pages']
    }

    const acceptableTypes = answerSheetTypeMap[answerSheet.answerSheetType] || []

    // Find related exams and sort by date
    const relatedExams = cbseDatesheet.entries
      .filter(entry => {
        if (entry.subject.class !== normalizedClass) return false
        if (acceptableTypes.length > 0 && !acceptableTypes.includes(entry.answerSheet)) return false
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

    // Calculate serial number allocation
    const fromNum = parseInt(answerSheet.serialFrom.replace(/\D/g, ''))
    let currentSerial = fromNum

    const allocations = relatedExams.map(exam => {
      const serialStart = currentSerial
      const serialEnd = currentSerial + exam.candidateCount - 1
      currentSerial = serialEnd + 1

      // Format serials with same format as original (preserve prefix)
      const prefix = answerSheet.serialFrom.replace(/\d+$/, '')

      return {
        ...exam,
        serialFrom: prefix + serialStart.toString().padStart(answerSheet.serialFrom.replace(/\D/g, '').length, '0'),
        serialTo: prefix + serialEnd.toString().padStart(answerSheet.serialTo.replace(/\D/g, '').length, '0'),
        sheetsAllocated: exam.candidateCount
      }
    })

    res.status(200).json({
      success: true,
      data: {
        hasSerialNumbers: true,
        serialFrom: answerSheet.serialFrom,
        serialTo: answerSheet.serialTo,
        total: answerSheet.total,
        allocations,
        totalAllocated: allocations.reduce((sum, alloc) => sum + alloc.sheetsAllocated, 0),
        remaining: answerSheet.total - allocations.reduce((sum, alloc) => sum + alloc.sheetsAllocated, 0)
      }
    })
  } catch (error) {
    console.error('Error calculating serial allocation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to calculate serial allocation'
    })
  }
}

module.exports = exports
