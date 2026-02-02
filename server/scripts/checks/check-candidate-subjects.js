const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const Candidate = require('./src/models/Candidate')
const Subject = require('./src/models/Subject')

async function checkCandidateSubjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Get all candidates with subjects populated
    const candidates = await Candidate.find({})
      .populate('subjects', 'code name class')
      .lean()

    console.log(`📊 Total Candidates: ${candidates.length}`)

    // Filter by class
    const class10 = candidates.filter(c => c.class === '10th')
    const class12 = candidates.filter(c => c.class === '12th')

    console.log(`📊 Class 10th: ${class10.length}`)
    console.log(`📊 Class 12th: ${class12.length}\n`)

    // Check English (184) and Science (086) for class 10th
    console.log('🔍 Checking Class 10th mandatory subjects:\n')

    const subjectCounts = new Map()
    const candidatesWithoutEnglish = []
    const candidatesWithoutScience = []

    class10.forEach(candidate => {
      const subjects = candidate.subjects || []
      
      // Count each subject
      subjects.forEach(subject => {
        if (subject && subject.code && subject.class === '10th') {
          const key = `${subject.code}-${subject.name}`
          subjectCounts.set(key, (subjectCounts.get(key) || 0) + 1)
        }
      })

      // Check for English and Science
      const hasEnglish = subjects.some(s => s && s.code === '184' && s.class === '10th')
      const hasScience = subjects.some(s => s && s.code === '086' && s.class === '10th')

      if (!hasEnglish) {
        candidatesWithoutEnglish.push({
          rollNumber: candidate.rollNumber,
          name: candidate.name,
          subjectCodes: subjects.map(s => s ? `${s.code} (${s.class})` : 'null').join(', ')
        })
      }

      if (!hasScience) {
        candidatesWithoutScience.push({
          rollNumber: candidate.rollNumber,
          name: candidate.name,
          subjectCodes: subjects.map(s => s ? `${s.code} (${s.class})` : 'null').join(', ')
        })
      }
    })

    // Show subject counts
    console.log('📈 Subject counts for Class 10th:')
    const sortedSubjects = Array.from(subjectCounts.entries())
      .sort((a, b) => b[1] - a[1])
    
    sortedSubjects.forEach(([subject, count]) => {
      const percentage = ((count / class10.length) * 100).toFixed(1)
      console.log(`   ${subject}: ${count} (${percentage}%)`)
    })

    // Show missing subjects
    console.log(`\n⚠️  Candidates without English (184): ${candidatesWithoutEnglish.length}`)
    if (candidatesWithoutEnglish.length > 0) {
      candidatesWithoutEnglish.slice(0, 10).forEach(c => {
        console.log(`   - ${c.rollNumber}: ${c.name}`)
        console.log(`     Subjects: ${c.subjectCodes || 'None'}`)
      })
      if (candidatesWithoutEnglish.length > 10) {
        console.log(`   ... and ${candidatesWithoutEnglish.length - 10} more`)
      }
    }

    console.log(`\n⚠️  Candidates without Science (086): ${candidatesWithoutScience.length}`)
    if (candidatesWithoutScience.length > 0) {
      candidatesWithoutScience.slice(0, 10).forEach(c => {
        console.log(`   - ${c.rollNumber}: ${c.name}`)
        console.log(`     Subjects: ${c.subjectCodes || 'None'}`)
      })
      if (candidatesWithoutScience.length > 10) {
        console.log(`   ... and ${candidatesWithoutScience.length - 10} more`)
      }
    }

    // Summary
    console.log('\n📋 SUMMARY:')
    console.log(`   Total Class 10th candidates: ${class10.length}`)
    console.log(`   With English (184): ${class10.length - candidatesWithoutEnglish.length}`)
    console.log(`   With Science (086): ${class10.length - candidatesWithoutScience.length}`)
    console.log(`   Expected: ${class10.length} for both (if mandatory)`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

checkCandidateSubjects()
