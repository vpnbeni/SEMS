/**
 * Diagnostic script for Answer Sheets - Centre Datesheet Linking
 * 
 * This script checks:
 * 1. Answer sheets exist
 * 2. CBSE datesheet exists
 * 3. Candidates with subjects exist
 * 4. Centre datesheet entries can be generated
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')
const CBSEDatesheet = require('./src/models/CBSEDatesheet')
const Candidate = require('./src/models/Candidate')

async function diagnose() {
  try {
    console.log('🔍 Diagnosing Answer Sheets - Centre Datesheet Linking\n')
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to database\n')
    
    // 1. Check Answer Sheets
    console.log('1️⃣ Checking Answer Sheets...')
    const allAnswerSheets = await AnswerSheet.find({ isActive: true })
    console.log(`   Total answer sheets: ${allAnswerSheets.length}`)
    
    const receivedSheets = allAnswerSheets.filter(s => s.total > 0)
    console.log(`   Received (total > 0): ${receivedSheets.length}`)
    
    const usedSheets = allAnswerSheets.filter(s => s.used > 0)
    console.log(`   Used (used > 0): ${usedSheets.length}`)
    
    const linkedSheets = usedSheets.filter(s => s.linkedExamDate)
    console.log(`   Linked to exams: ${linkedSheets.length}`)
    
    if (allAnswerSheets.length === 0) {
      console.log('\n   ⚠️  No answer sheets found!')
      console.log('   Action: Upload answer sheets Excel file or add manually\n')
    } else if (usedSheets.length === 0) {
      console.log('\n   ℹ️  No answer sheets marked as used yet')
      console.log('   Action: Click "Use" button on any answer sheet\n')
      
      // Show first 5 available sheets
      console.log('   Available answer sheets to mark as used:')
      receivedSheets.slice(0, 5).forEach((sheet, index) => {
        const available = sheet.total - sheet.used - sheet.discarded
        console.log(`   ${index + 1}. ${sheet.answerSheetType} - Class ${sheet.class}`)
        console.log(`      Total: ${sheet.total}, Available: ${available}`)
      })
      console.log()
    } else {
      console.log('\n   Used answer sheets:')
      usedSheets.forEach((sheet, index) => {
        console.log(`   ${index + 1}. ${sheet.answerSheetType} - Class ${sheet.class}`)
        console.log(`      Used: ${sheet.used}/${sheet.total}`)
        if (sheet.linkedExamDate) {
          console.log(`      ✓ Linked to: ${new Date(sheet.linkedExamDate).toLocaleDateString()}`)
          console.log(`        Subject: ${sheet.linkedSubjectCode} ${sheet.linkedSubjectName}`)
          console.log(`        Candidates: ${sheet.linkedCandidateCount}`)
        } else {
          console.log(`      ✗ Not linked to any exam`)
        }
      })
      console.log()
    }
    
    // 2. Check CBSE Datesheet
    console.log('2️⃣ Checking CBSE Datesheet...')
    const cbseDatesheet = await CBSEDatesheet.findOne({ isActive: true })
    
    if (!cbseDatesheet) {
      console.log('   ❌ No CBSE datesheet found')
      console.log('   Action: Import CBSE datesheet from Datesheets page\n')
    } else {
      console.log(`   ✅ Found: ${cbseDatesheet.title}`)
      console.log(`   Total entries: ${cbseDatesheet.totalEntries}`)
      console.log(`   Date range: ${cbseDatesheet.dateRange.startDate.toLocaleDateString()} to ${cbseDatesheet.dateRange.endDate.toLocaleDateString()}\n`)
    }
    
    // 3. Check Candidates
    console.log('3️⃣ Checking Candidates...')
    const candidates = await Candidate.find({ isActive: true })
      .populate('subjects', 'code name class')
    
    console.log(`   Total candidates: ${candidates.length}`)
    
    const candidatesWithSubjects = candidates.filter(c => c.subjects && c.subjects.length > 0)
    console.log(`   With subjects: ${candidatesWithSubjects.length}`)
    
    if (candidatesWithSubjects.length === 0) {
      console.log('\n   ⚠️  No candidates have subjects linked')
      console.log('   Action: Link subjects to candidates from Candidates page\n')
    } else {
      // Calculate subject frequency
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
      
      console.log(`   Unique subject-class combinations: ${subjectFrequency.size}`)
      
      // Show top 5
      const topSubjects = Array.from(subjectFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      
      console.log('\n   Top 5 subjects:')
      topSubjects.forEach(([key, count], index) => {
        console.log(`   ${index + 1}. ${key}: ${count} candidates`)
      })
      console.log()
    }
    
    // 4. Check Centre Datesheet Entries
    if (cbseDatesheet && candidatesWithSubjects.length > 0) {
      console.log('4️⃣ Checking Centre Datesheet Entries...')
      
      // Calculate subject frequency
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
      
      // Generate centre entries
      const centreEntries = cbseDatesheet.entries
        .map(entry => {
          const key = `${entry.subject.code}-${entry.subject.class}`
          const candidateCount = subjectFrequency.get(key) || 0
          
          return {
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
      
      console.log(`   ✅ Generated ${centreEntries.length} centre entries`)
      console.log(`   (Filtered from ${cbseDatesheet.totalEntries} CBSE entries)\n`)
      
      if (centreEntries.length === 0) {
        console.log('   ⚠️  No centre entries with candidates')
        console.log('   This means no subjects in CBSE datesheet match candidate subjects\n')
      } else {
        console.log('   First 5 centre entries:')
        centreEntries.slice(0, 5).forEach((entry, index) => {
          console.log(`   ${index + 1}. ${new Date(entry.examDate).toLocaleDateString()} - ${entry.dayName}`)
          console.log(`      Class ${entry.class} - ${entry.subjectCode} ${entry.subjectName}`)
          console.log(`      ${entry.candidateCount} candidates, ${entry.roomsNeeded} rooms`)
        })
        console.log()
      }
    }
    
    // 5. Summary and Next Steps
    console.log('📊 Summary:')
    console.log(`   Answer Sheets: ${allAnswerSheets.length} total, ${usedSheets.length} used, ${linkedSheets.length} linked`)
    console.log(`   CBSE Datesheet: ${cbseDatesheet ? '✓ Exists' : '✗ Missing'}`)
    console.log(`   Candidates: ${candidates.length} total, ${candidatesWithSubjects.length} with subjects`)
    console.log()
    
    console.log('📝 Next Steps:')
    
    if (allAnswerSheets.length === 0) {
      console.log('   1. ⚠️  Upload answer sheets Excel file')
      console.log('      Go to: Answer Sheets page → Upload Excel')
    } else if (usedSheets.length === 0) {
      console.log('   1. ℹ️  Mark some answer sheets as used')
      console.log('      Go to: Answer Sheets page → Click "Use" button')
    } else {
      console.log('   1. ✓ Answer sheets are being used')
    }
    
    if (!cbseDatesheet) {
      console.log('   2. ⚠️  Import CBSE datesheet')
      console.log('      Go to: Datesheets page → Import PDF')
    } else {
      console.log('   2. ✓ CBSE datesheet exists')
    }
    
    if (candidatesWithSubjects.length === 0) {
      console.log('   3. ⚠️  Link subjects to candidates')
      console.log('      Go to: Candidates page → Edit candidate → Add subjects')
    } else {
      console.log('   3. ✓ Candidates have subjects')
    }
    
    console.log()
    console.log('✅ Diagnosis complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await mongoose.connection.close()
    console.log('\n👋 Database connection closed')
  }
}

// Run the diagnostic
diagnose()
