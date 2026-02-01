const asyncHandler = require('../middleware/asyncHandler')
const Candidate = require('../models/Candidate')
const Subject = require('../models/Subject')
const { HTTP_STATUS } = require('../utils/constants')

// @desc    Link candidate subjectCodes to Subject documents
// @route   POST /api/candidates/link-subjects
// @access  Private
exports.linkCandidateSubjects = asyncHandler(async (req, res) => {
  try {
    console.log('🔗 Starting to link candidate subjects...')
    
    // Get all candidates (Candidate model uses status, not isActive)
    const candidates = await Candidate.find({ status: 'active' })
    console.log(`📊 Found ${candidates.length} active candidates`)
    
    // Get all subjects for reference
    const subjects = await Subject.find({ isActive: true })
    console.log(`📚 Found ${subjects.length} active subjects`)
    
    // Create a map of subject code + class -> subject document (Subject.code is uppercase in DB)
    const subjectMap = new Map()
    subjects.forEach(subject => {
      const code = (subject.code || '').toString().trim().toUpperCase()
      if (code && subject.class) {
        const key = `${code}-${subject.class}`
        subjectMap.set(key, subject)
      }
    })
    
    let candidatesUpdated = 0
    let candidatesAlreadyLinked = 0
    let candidatesWithIssues = 0
    const updateResults = []
    
    for (const candidate of candidates) {
      // Always re-resolve from subjectCodes to current Subject IDs. This fixes the case where
      // subjects were deleted and re-created (new IDs): candidates still had old IDs in
      // candidate.subjects, so we overwrite with IDs from the current Subject collection.
      if (candidate.subjectCodes && candidate.subjectCodes.length > 0) {
        const linkedSubjects = []
        const linkedIds = new Set()
        const notFoundCodes = []
        const candidateClass = (candidate.class || '').toString().trim() || null

        for (const subjectCode of candidate.subjectCodes) {
          const raw = typeof subjectCode === 'string'
            ? subjectCode.trim()
            : (subjectCode && subjectCode.code && subjectCode.code.toString().trim())
          const code = raw ? raw.toUpperCase() : ''
          if (!code) continue

          const classesToTry = candidateClass ? [candidateClass] : ['10th', '12th']
          let subject = null
          for (const cls of classesToTry) {
            const key = `${code}-${cls}`
            subject = subjectMap.get(key)
            if (subject) break
          }

          if (subject && !linkedIds.has(subject._id.toString())) {
            linkedSubjects.push(subject._id)
            linkedIds.add(subject._id.toString())
          } else if (!subject) {
            notFoundCodes.push(code)
          }
        }
        
        if (linkedSubjects.length > 0) {
          const currentIds = (candidate.subjects || []).map((id) => id.toString()).sort()
          const newIds = linkedSubjects.map((id) => id.toString()).sort()
          const same = currentIds.length === newIds.length && currentIds.every((id, i) => id === newIds[i])

          if (same) {
            candidatesAlreadyLinked++
          } else {
            candidate.subjects = linkedSubjects
            await candidate.save()
            candidatesUpdated++
            updateResults.push({
              rollNumber: candidate.rollNumber,
              name: candidate.name,
              linkedCount: linkedSubjects.length,
              notFound: notFoundCodes
            })
          }
        } else {
          candidatesWithIssues++
        }
      } else {
        candidatesWithIssues++
      }
    }
    
    console.log(`✅ Linking completed:`)
    console.log(`   Updated: ${candidatesUpdated}`)
    console.log(`   Already linked: ${candidatesAlreadyLinked}`)
    console.log(`   With issues: ${candidatesWithIssues}`)
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Successfully linked subjects for ${candidatesUpdated} candidates`,
      data: {
        totalCandidates: candidates.length,
        updated: candidatesUpdated,
        alreadyLinked: candidatesAlreadyLinked,
        withIssues: candidatesWithIssues,
        sampleResults: updateResults.slice(0, 10)
      }
    })
    
  } catch (error) {
    console.error('❌ Error linking subjects:', error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to link candidate subjects',
      error: error.message
    })
  }
})
