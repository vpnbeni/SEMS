const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const asyncHandler = require('../middleware/asyncHandler')
const CBSEDatesheet = require('../models/CBSEDatesheet')
const Candidate = require('../models/Candidate')

const ACTIVE_CANDIDATE_FILTER = {
  $or: [{ status: 'active' }, { status: { $exists: false } }],
}

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

const buildSubjectKey = (code, classValue) =>
  `${normalizeSubjectCode(code)}-${normalizeSubjectClass(classValue)}`

/**
 * @desc    Get centre datesheet entries for answer sheet linking
 * @route   GET /api/centre-datesheet/entries
 * @access  Private
 */
router.get('/entries', protect, asyncHandler(async (req, res) => {
  try {
    console.log('📄 Fetching centre datesheet entries for answer sheet linking...')
    
    // Get active CBSE datesheet
    const cbseDatesheet = await CBSEDatesheet.getActive()
    
    if (!cbseDatesheet) {
      return res.status(404).json({
        success: false,
        message: 'No CBSE datesheet found',
        data: []
      })
    }
    
    // Get all candidates with their subjects
    const candidates = await Candidate.find(ACTIVE_CANDIDATE_FILTER)
      .populate('subjects', 'code name class')
      .lean()
    
    // Get all subjects to fetch answer sheet types
    const Subject = require('../models/Subject')
    const subjects = await Subject.find({ isActive: true }).lean()
    
    // Create a map of subject code+class to answer sheet type
    const subjectAnswerSheetMap = new Map()
    subjects.forEach(subject => {
      const key = buildSubjectKey(subject.code, subject.class)
      subjectAnswerSheetMap.set(key, subject.answerSheet || 'none')
    })
    
    // Calculate candidate count per subject
    const subjectFrequency = new Map()
    
    candidates.forEach(candidate => {
      if (candidate.subjects && candidate.subjects.length > 0) {
        candidate.subjects.forEach(subject => {
          if (subject && subject.code && subject.class) {
            const key = buildSubjectKey(subject.code, subject.class)
            const count = subjectFrequency.get(key) || 0
            subjectFrequency.set(key, count + 1)
          }
        })
      }
    })
    
    // Filter and format entries
    const entries = cbseDatesheet.entries
      .map(entry => {
        // Normalize class format (10th -> 10, 12th -> 12)
        const normalizedClass = entry.subject.class.replace(/th$/i, '')
        const key = buildSubjectKey(entry.subject.code, entry.subject.class)
        const normalizedKey = buildSubjectKey(entry.subject.code, normalizedClass)
        
        // Try both formats for candidate count
        const candidateCount = subjectFrequency.get(key) || subjectFrequency.get(normalizedKey) || 0
        const answerSheetType = subjectAnswerSheetMap.get(key) || subjectAnswerSheetMap.get(normalizedKey) || 'none'
        
        return {
          _id: entry._id,
          examDate: entry.examDate,
          dayName: entry.dayName || 'Unknown',
          subjectCode: entry.subject.code,
          subjectName: entry.subject.name,
          class: normalizedClass, // Return normalized class (10, 12)
          timeSlot: entry.timeSlot,
          duration: entry.subject.duration,
          candidateCount,
          roomsNeeded: Math.ceil(candidateCount / 24),
          answerSheetType
        }
      })
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
    
    console.log(`✅ Found ${entries.length} centre datesheet entries`)
    
    return res.status(200).json({
      success: true,
      data: entries,
      count: entries.length
    })
    
  } catch (error) {
    console.error('❌ Error fetching centre datesheet entries:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch centre datesheet entries',
      error: error.message
    })
  }
}))

module.exports = router
