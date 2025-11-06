/**
 * Test script for Centre Datesheet - Answer Sheets Linking
 * 
 * This script tests the new linking feature between answer sheets and centre datesheet
 */

require('dotenv').config()
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')
const CBSEDatesheet = require('./src/models/CBSEDatesheet')
const Candidate = require('./src/models/Candidate')

async function testCentreDatesheetLinking() {
  try {
    console.log('🔗 Testing Centre Datesheet - Answer Sheets Linking\n')
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to database\n')
    
    // 1. Check if CBSE datesheet exists
    console.log('1️⃣ Checking CBSE Datesheet...')
    const cbseDatesheet = await CBSEDatesheet.findOne({ isActive: true })
    
    if (!cbseDatesheet) {
      console.log('❌ No active CBSE datesheet found')
      console.log('   Please import a CBSE datesheet first\n')
      return
    }
    
    console.log(`✅ Found CBSE datesheet: ${cbseDatesheet.title}`)
    console.log(`   Total entries: ${cbseDatesheet.totalEntries}`)
    console.log(`   Date range: ${cbseDatesheet.dateRange.startDate.toLocaleDateString()} to ${cbseDatesheet.dateRange.endDate.toLocaleDateString()}\n`)
    
    // 2. Check candidates with subjects
    console.log('2️⃣ Checking Candidates...')
    const candidates = await Candidate.find({ isActive: true })
      .populate('subjects', 'code name class')
    
    console.log(`✅ Found ${candidates.length} candidates`)
    
    const candidatesWithSubjects = candidates.filter(c => c.subjects && c.subjects.length > 0)
    console.log(`   ${candidatesWithSubjects.length} have subjects linked\n`)
    
    if (candidatesWithSubjects.length === 0) {
      console.log('⚠️  No candidates have subjects linked')
      console.log('   Centre datesheet entries will show 0 candidates\n')
    }
    
    // 3. Calculate subject frequency
    console.log('3️⃣ Calculating Subject Distribution...')
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
    
    console.log(`✅ Found ${subjectFrequency.size} unique subject-class combinations`)
    
    // Show top 5 subjects
    const topSubjects = Array.from(subjectFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    console.log('\n   Top 5 subjects by candidate count:')
    topSubjects.forEach(([key, count], index) => {
      console.log(`   ${index + 1}. ${key}: ${count} candidates`)
    })
    console.log()
    
    // 4. Generate centre datesheet entries
    console.log('4️⃣ Generating Centre Datesheet Entries...')
    const centreEntries = cbseDatesheet.entries
      .map(entry => {
        const key = `${entry.subject.code}-${entry.subject.class}`
        const candidateCount = subjectFrequency.get(key) || 0
        
        return {
          _id: entry._id,
          examDate: entry.examDate,
          dayName: entry.dayName,
          subjectCode: entry.subject.code,
          subjectName: entry.subject.name,
          class: entry.subject.class,
          candidateCount,
          roomsNeeded: Math.ceil(candidateCount / 24)
        }
      })
      .filter(entry => entry.candidateCount > 0)
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
    
    console.log(`✅ Generated ${centreEntries.length} centre-specific entries`)
    console.log(`   (Filtered from ${cbseDatesheet.totalEntries} total CBSE entries)\n`)
    
    if (centreEntries.length === 0) {
      console.log('⚠️  No centre entries generated')
      console.log('   This means no subjects in CBSE datesheet match candidate subjects\n')
      return
    }
    
    // Show first 5 entries
    console.log('   First 5 centre datesheet entries:')
    centreEntries.slice(0, 5).forEach((entry, index) => {
      console.log(`   ${index + 1}. ${new Date(entry.examDate).toLocaleDateString()} - ${entry.dayName}`)
      console.log(`      Class ${entry.class} - ${entry.subjectCode} ${entry.subjectName}`)
      console.log(`      ${entry.candidateCount} candidates, ${entry.roomsNeeded} rooms\n`)
    })
    
    // 5. Check answer sheets
    console.log('5️⃣ Checking Answer Sheets...')
    const answerSheets = await AnswerSheet.find({ isActive: true })
    
    console.log(`✅ Found ${answerSheets.length} answer sheet entries`)
    
    const usedSheets = answerSheets.filter(s => s.used > 0)
    console.log(`   ${usedSheets.length} have been marked as used`)
    
    const linkedSheets = usedSheets.filter(s => s.centreDatesheetEntry)
    console.log(`   ${linkedSheets.length} are linked to centre datesheet\n`)
    
    if (linkedSheets.length > 0) {
      console.log('   Linked answer sheets:')
      linkedSheets.forEach((sheet, index) => {
        console.log(`   ${index + 1}. ${sheet.answerSheetType} - Class ${sheet.class}`)
        console.log(`      Used: ${sheet.used}/${sheet.total}`)
        if (sheet.linkedExamDate) {
          console.log(`      Linked to: ${new Date(sheet.linkedExamDate).toLocaleDateString()}`)
          console.log(`      Subject: ${sheet.linkedSubjectCode} ${sheet.linkedSubjectName}`)
          console.log(`      Candidates: ${sheet.linkedCandidateCount}`)
        }
        console.log()
      })
    }
    
    // 6. Summary
    console.log('📊 Summary:')
    console.log(`   ✅ CBSE Datesheet: ${cbseDatesheet.totalEntries} entries`)
    console.log(`   ✅ Candidates: ${candidates.length} (${candidatesWithSubjects.length} with subjects)`)
    console.log(`   ✅ Centre Entries: ${centreEntries.length} (with candidates)`)
    console.log(`   ✅ Answer Sheets: ${answerSheets.length} (${usedSheets.length} used, ${linkedSheets.length} linked)`)
    console.log()
    
    console.log('✅ Test completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Navigate to Answer Sheets page')
    console.log('   2. Click "Use" on any answer sheet')
    console.log('   3. Select an exam from the dropdown')
    console.log('   4. View the "Used" tab to see linked details')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await mongoose.connection.close()
    console.log('\n👋 Database connection closed')
  }
}

// Run the test
testCentreDatesheetLinking()
