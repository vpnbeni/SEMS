require('dotenv').config({ path: './server/.env' })
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')

async function testSerialNumberFormat() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      return
    }
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    console.log('📝 Testing Serial Number Format Preservation')
    console.log('='.repeat(80))
    
    // Test cases with different serial number formats
    const testCases = [
      {
        name: 'Numeric with leading zeros',
        serialFrom: '001001',
        serialTo: '001500',
        expectedTotal: 500
      },
      {
        name: 'Numeric without leading zeros',
        serialFrom: '1001',
        serialTo: '1500',
        expectedTotal: 500
      },
      {
        name: 'Alphanumeric with leading zeros',
        serialFrom: 'A001001',
        serialTo: 'A001500',
        expectedTotal: 500
      },
      {
        name: 'Alphanumeric without leading zeros',
        serialFrom: 'O1001',
        serialTo: 'O1500',
        expectedTotal: 500
      },
      {
        name: 'Very small numbers with leading zeros',
        serialFrom: '000001',
        serialTo: '000100',
        expectedTotal: 100
      }
    ]

    let allPassed = true

    for (const testCase of testCases) {
      console.log(`\nTest: ${testCase.name}`)
      console.log('-'.repeat(60))
      
      // Create test entry
      const testEntry = {
        answerSheetType: 'Main',
        pages: 32,
        colour: 'Red',
        class: '10',
        suffix: 'T',
        serialFrom: testCase.serialFrom,
        serialTo: testCase.serialTo,
        exam: 'Test',
        subject: 'Test'
      }

      try {
        const sheet = await AnswerSheet.create(testEntry)
        
        // Check if serial numbers are preserved
        const serialFromPreserved = sheet.serialFrom === testCase.serialFrom
        const serialToPreserved = sheet.serialTo === testCase.serialTo
        const totalCorrect = sheet.total === testCase.expectedTotal
        
        console.log(`  Input serialFrom:  "${testCase.serialFrom}"`)
        console.log(`  Stored serialFrom: "${sheet.serialFrom}"`)
        console.log(`  Preserved: ${serialFromPreserved ? '✅' : '❌'}`)
        console.log()
        console.log(`  Input serialTo:    "${testCase.serialTo}"`)
        console.log(`  Stored serialTo:   "${sheet.serialTo}"`)
        console.log(`  Preserved: ${serialToPreserved ? '✅' : '❌'}`)
        console.log()
        console.log(`  Expected total: ${testCase.expectedTotal}`)
        console.log(`  Calculated total: ${sheet.total}`)
        console.log(`  Correct: ${totalCorrect ? '✅' : '❌'}`)
        
        if (serialFromPreserved && serialToPreserved && totalCorrect) {
          console.log(`\n  ✅ PASSED`)
        } else {
          console.log(`\n  ❌ FAILED`)
          allPassed = false
        }
        
        // Clean up
        await AnswerSheet.findByIdAndDelete(sheet._id)
        
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`)
        allPassed = false
      }
    }

    console.log('\n' + '='.repeat(80))
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Serial number format is preserved correctly!')
    } else {
      console.log('❌ SOME TESTS FAILED - Check serial number handling')
    }
    
    console.log('='.repeat(80))

    // Test invalid formats
    console.log('\n📝 Testing Invalid Serial Number Formats')
    console.log('='.repeat(80))
    
    const invalidCases = [
      { serialFrom: '12 45', reason: 'Contains space' },
      { serialFrom: '12-45', reason: 'Contains hyphen' },
      { serialFrom: 'AB1245', reason: 'Multiple letters' },
      { serialFrom: '1245A', reason: 'Letter at end' },
      { serialFrom: 'A', reason: 'No digits' }
    ]

    for (const invalidCase of invalidCases) {
      console.log(`\nTesting: "${invalidCase.serialFrom}" (${invalidCase.reason})`)
      
      try {
        await AnswerSheet.create({
          answerSheetType: 'Main',
          pages: 32,
          colour: 'Red',
          class: '10',
          suffix: 'T',
          serialFrom: invalidCase.serialFrom,
          serialTo: '1500',
          exam: 'Test',
          subject: 'Test'
        })
        console.log('  ❌ Should have been rejected but was accepted')
      } catch (error) {
        console.log('  ✅ Correctly rejected')
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Validation tests completed!')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run tests
testSerialNumberFormat()
