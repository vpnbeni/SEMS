const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const Candidate = require('./src/models/Candidate')
const Subject = require('./src/models/Subject')

async function diagnoseCandidateSubjectCount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // First, check all candidates and their class values
    const allCandidates = await Candidate.find({}).lean()
    const activeCandidates = allCandidates.filter(c => c.isActive !== false)
    console.log(`\n📊 Total Candidates: ${allCandidates.length}`)
    console.log(`📊 Active Candidates: ${activeCandidates.length}`)
    console.log(`📊 Inactive Candidates: ${allCandidates.length - activeCandidates.length}`)
    
    // Group by class
    const classCounts = {}
    activeCandidates.forEach(c => {
      const classValue = c.class || 'undefined'
      classCounts[classValue] = (classCounts[classValue] || 0) + 1
    })
    console.log(`\n📊 Active Candidates by Class:`)
    Object.entries(classCounts).forEach(([cls, count]) => {
      console.log(`   ${cls}: ${count}`)
    })

    // Get all class 10th candidates (active or not)
    const class10Candidates = await Candidate.find({ 
      class: '10th' 
    }).populate('subjects', 'code name class').lean()

    console.log(`\n📊 Total Class 10th Candidates: ${class10Candidates.length}`)

    // Check English (184) and Science (086) subjects
    const englishSubject = await Subject.findOne({ code: '184', class: '10th' }).lean()
    const scienceSubject = await Subject.findOne({ code: '086', class: '10th' }).lean()

    console.log(`\n📚 English Subject (184):`, englishSubject ? 'Found' : 'NOT FOUND')
    console.log(`📚 Science Subject (086):`, scienceSubject ? 'Found' : 'NOT FOUND')

    // Count candidates with English
    let englishCount = 0
    let scienceCount = 0
    const candidatesWithoutEnglish = []
    const candidatesWithoutScience = []
    const candidatesWithoutSubjects = []

    class10Candidates.forEach(candidate => {
      if (!candidate.subjects || candidate.subjects.length === 0) {
        candidatesWithoutSubjects.push({
          rollNumber: candidate.rollNumber,
          name: candidate.name
        })
        return
      }

      const hasEnglish = candidate.subjects.some(s => s.code === '184' && s.class === '10th')
      const hasScience = candidate.subjects.some(s => s.code === '086' && s.class === '10th')

      if (hasEnglish) englishCount++
      else candidatesWithoutEnglish.push({
        rollNumber: candidate.rollNumber,
        name: candidate.name,
        subjects: candidate.subjects.map(s => `${s.code} (${s.class})`)
      })

      if (hasScience) scienceCount++
      else candidatesWithoutScience.push({
        rollNumber: candidate.rollNumber,
        name: candidate.name,
        subjects: candidate.subjects.map(s => `${s.code} (${s.class})`)
      })
    })

    console.log(`\n📈 Candidate Counts:`)
    console.log(`   English (184): ${englishCount} / ${class10Candidates.length}`)
    console.log(`   Science (086): ${scienceCount} / ${class10Candidates.length}`)

    if (candidatesWithoutSubjects.length > 0) {
      console.log(`\n⚠️  Candidates without any subjects: ${candidatesWithoutSubjects.length}`)
      candidatesWithoutSubjects.forEach(c => {
        console.log(`   - ${c.rollNumber}: ${c.name}`)
      })
    }

    if (candidatesWithoutEnglish.length > 0) {
      console.log(`\n⚠️  Candidates without English (184): ${candidatesWithoutEnglish.length}`)
      candidatesWithoutEnglish.slice(0, 5).forEach(c => {
        console.log(`   - ${c.rollNumber}: ${c.name}`)
        console.log(`     Subjects: ${c.subjects.join(', ')}`)
      })
      if (candidatesWithoutEnglish.length > 5) {
        console.log(`   ... and ${candidatesWithoutEnglish.length - 5} more`)
      }
    }

    if (candidatesWithoutScience.length > 0) {
      console.log(`\n⚠️  Candidates without Science (086): ${candidatesWithoutScience.length}`)
      candidatesWithoutScience.slice(0, 5).forEach(c => {
        console.log(`   - ${c.rollNumber}: ${c.name}`)
        console.log(`     Subjects: ${c.subjects.join(', ')}`)
      })
      if (candidatesWithoutScience.length > 5) {
        console.log(`   ... and ${candidatesWithoutScience.length - 5} more`)
      }
    }

    // Check if there are any candidates with class mismatch
    console.log(`\n🔍 Checking for class mismatches...`)
    let mismatchCount = 0
    class10Candidates.forEach(candidate => {
      if (candidate.subjects && candidate.subjects.length > 0) {
        const wrongClassSubjects = candidate.subjects.filter(s => s.class !== '10th')
        if (wrongClassSubjects.length > 0) {
          mismatchCount++
          if (mismatchCount <= 3) {
            console.log(`   ⚠️  ${candidate.rollNumber}: Has subjects from wrong class:`)
            wrongClassSubjects.forEach(s => {
              console.log(`      - ${s.code} ${s.name} (${s.class})`)
            })
          }
        }
      }
    })
    if (mismatchCount > 3) {
      console.log(`   ... and ${mismatchCount - 3} more candidates with class mismatches`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

diagnoseCandidateSubjectCount()
