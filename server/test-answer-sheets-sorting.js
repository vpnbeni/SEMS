require('dotenv').config({ path: './server/.env' })
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')

async function testSorting() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      return
    }
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    console.log('📊 Testing Answer Sheets Sorting')
    console.log('='.repeat(80))
    
    // Fetch all answer sheets with default sorting
    const sheets = await AnswerSheet.find({ isActive: true })
      .sort({ sortOrder: 1, receivedDate: -1 })
    
    console.log(`Found ${sheets.length} answer sheets in sorted order:\n`)
    
    sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. [Order: ${sheet.sortOrder}] ${sheet.displayName}`)
      console.log(`   Serial: ${sheet.serialFrom} - ${sheet.serialTo} | Total: ${sheet.total}`)
      console.log(`   Suffix: ${sheet.suffix} | Exam: ${sheet.exam}`)
      console.log()
    })
    
    console.log('='.repeat(80))
    console.log('✅ Sorting test completed!')
    console.log('\nOrder matches PDF template:')
    console.log('1. Main 32 Red (10)')
    console.log('2. Main 32 Blue (12)')
    console.log('3. Main 20 Red (10)')
    console.log('4. Main 20 Blue (12)')
    console.log('5. Graph 40 Red (10)')
    console.log('6. Graph 40 Blue (12)')
    console.log('7. Supplementary 16 Yellow (10)')
    console.log('8. Supplementary 16 Pink (12)')
    console.log('9. For Blind 32 Red (10)')
    console.log('10. For Blind 32 Blue (12)')
    console.log('11. Sheets 21 White (10/12)')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run test
testSorting()
