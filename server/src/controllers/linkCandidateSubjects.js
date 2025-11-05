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
    
    // Get all candidates
    const candidates = await Candidate.find({ isActive: true })
    console.log(`📊 Found ${candidates.length} active candidates`)
    
    // Get all subjects for reference
    const subjects = await Subject.find({ isActive: true })
    console.log(`📚 Found ${subjects.length} active subjects`)
    
    // Create a map of subject code + class -> subject document
    const subjectMap = new Map()
    subjects.forEach(subject => {
      const key = `${subject.code}-${subject.class}`
      subjectMap.set(key, subject)
    })
    
    let candidatesUpdated = 0
    let candidatesAlreadyLinked = 0
    let candidatesWithIssues = 0
    const updateResults = []
    
    for (const candidate of candidates) {
      // Check if already has subjects linked
      if (candidate.subjects && candidate.subjects.length > 0) {
        candidatesAlreadyLinked++
        continue
      }
      
      // Try to link from subjectCodes
      if (candidate.subjectCodes && candidate.subjectCodes.length > 0) {
        const linkedSubjects = []
        const notFoundCodes = []
        
        for (const subjectCode of candidate.subjectCodes) {
          const key = `${subjectCode.code}-${candidate.class}`
          const subject = subjectMap.get(key)
          
          if (subject) {
            linkedSubjects.push(subject._id)
          } else {
            notFoundCodes.push(subjectCode.code)
          }
        }
        
        if (linkedSubjects.length > 0) {
          candidate.subjects = linkedSubjects
          await candidate.save()
          candidatesUpdated++
          
          updateResults.push({
            rollNumber: candidate.rollNumber,
            name: candidate.name,
            linkedCount: linkedSubjects.length,
            notFound: notFoundCodes
          })
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
