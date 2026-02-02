const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const Candidate = require('./src/models/Candidate')

async function findStudentsWithoutSubjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Get all candidates
    const allCandidates = await Candidate.find({}).lean()
    console.log(`📊 Total Candidates: ${allCandidates.length}`)

    // Filter by class
    const class10 = allCandidates.filter(c => c.class === '10th')
    const class12 = allCandidates.filter(c => c.class === '12th')

    console.log(`📊 Class 10th: ${class10.length}`)
    console.log(`📊 Class 12th: ${class12.length}\n`)

    // Find students without subjects
    const class10WithoutSubjects = class10.filter(c => !c.subjects || c.subjects.length === 0)
    const class12WithoutSubjects = class12.filter(c => !c.subjects || c.subjects.length === 0)

    console.log('🔍 Students WITHOUT any subjects:\n')
    
    if (class10WithoutSubjects.length > 0) {
      console.log(`⚠️  Class 10th students without subjects: ${class10WithoutSubjects.length}`)
      class10WithoutSubjects.forEach(student => {
        console.log(`   - Roll Number: ${student.rollNumber}`)
        console.log(`     Name: ${student.name}`)
        console.log(`     Class: ${student.class}`)
        console.log(`     Subjects: ${student.subjects ? student.subjects.length : 0}`)
        console.log(`     ID: ${student._id}`)
        console.log('')
      })
    } else {
      console.log('✅ All Class 10th students have subjects assigned')
    }

    if (class12WithoutSubjects.length > 0) {
      console.log(`⚠️  Class 12th students without subjects: ${class12WithoutSubjects.length}`)
      class12WithoutSubjects.forEach(student => {
        console.log(`   - Roll Number: ${student.rollNumber}`)
        console.log(`     Name: ${student.name}`)
        console.log(`     Class: ${student.class}`)
        console.log(`     Subjects: ${student.subjects ? student.subjects.length : 0}`)
        console.log(`     ID: ${student._id}`)
        console.log('')
      })
    } else {
      console.log('✅ All Class 12th students have subjects assigned')
    }

    // Also check for students with very few subjects (might be incomplete)
    console.log('\n🔍 Students with incomplete subject assignments:\n')
    
    const class10WithFewSubjects = class10.filter(c => c.subjects && c.subjects.length > 0 && c.subjects.length < 5)
    if (class10WithFewSubjects.length > 0) {
      console.log(`⚠️  Class 10th students with less than 5 subjects: ${class10WithFewSubjects.length}`)
      class10WithFewSubjects.forEach(student => {
        console.log(`   - Roll Number: ${student.rollNumber}`)
        console.log(`     Name: ${student.name}`)
        console.log(`     Subjects: ${student.subjects.length}`)
        console.log('')
      })
    }

    console.log('\n📋 SUMMARY:')
    console.log(`   Total Class 10th: ${class10.length}`)
    console.log(`   With subjects: ${class10.length - class10WithoutSubjects.length}`)
    console.log(`   Without subjects: ${class10WithoutSubjects.length}`)
    console.log(`   Expected all to have subjects for accurate datesheet`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

findStudentsWithoutSubjects()
