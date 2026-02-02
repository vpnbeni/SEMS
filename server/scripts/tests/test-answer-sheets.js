require('dotenv').config({ path: './server/.env' })
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')
const AnswerSheetsParser = require('./src/utils/answerSheetsParser')
const fs = require('fs')
const path = require('path')

async function testAnswerSheets() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      console.log('Please create a .env file in the server directory with MONGODB_URI')
      return
    }
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Test 1: Parse PDF
    console.log('📄 Test 1: Parsing Answer Sheets PDF')
    console.log('='.repeat(60))
    
    const pdfPath = path.join(__dirname, '../client/src/Answer Sheets.pdf')
    const dataBuffer = fs.readFileSync(pdfPath)
    const parser = new AnswerSheetsParser()
    const result = await parser.parsePDF(dataBuffer)
    
    console.log('Parse Result:', JSON.stringify(result, null, 2))
    console.log('\n')

    // Test 2: Create sample answer sheet entries
    console.log('📝 Test 2: Creating Sample Answer Sheet Entries')
    console.log('='.repeat(60))
    
    // Clear existing entries
    await AnswerSheet.deleteMany({})
    console.log('Cleared existing entries')
    
    const sampleEntries = [
      {
        answerSheetType: 'Main',
        pages: 32,
        colour: 'Red',
        class: '10',
        suffix: 'O',
        serialFrom: '1001',
        serialTo: '1500',
        exam: 'Term 1',
        subject: 'Mathematics'
      },
      {
        answerSheetType: 'Main',
        pages: 32,
        colour: 'Blue',
        class: '12',
        suffix: 'P',
        serialFrom: '2001',
        serialTo: '2300',
        exam: 'Term 1',
        subject: 'Physics'
      },
      {
        answerSheetType: 'Graph',
        pages: 40,
        colour: 'Red',
        class: '10',
        suffix: 'A',
        serialFrom: '3001',
        serialTo: '3100',
        exam: 'Term 1',
        subject: 'Science'
      }
    ]
    
    for (const entry of sampleEntries) {
      const created = await AnswerSheet.create(entry)
      console.log(`✅ Created: ${created.displayName} (${created.total} sheets)`)
    }
    console.log('\n')

    // Test 3: Fetch all answer sheets
    console.log('📊 Test 3: Fetching All Answer Sheets')
    console.log('='.repeat(60))
    
    const allSheets = await AnswerSheet.find({ isActive: true })
    console.log(`Found ${allSheets.length} answer sheets:`)
    allSheets.forEach(sheet => {
      console.log(`  - ${sheet.displayName}`)
      console.log(`    Serial: ${sheet.serialFrom} to ${sheet.serialTo}`)
      console.log(`    Total: ${sheet.total}, Used: ${sheet.used}, Balance: ${sheet.balance}`)
    })
    console.log('\n')

    // Test 4: Use some sheets
    console.log('✏️  Test 4: Using Answer Sheets')
    console.log('='.repeat(60))
    
    const firstSheet = allSheets[0]
    await firstSheet.useSheets(50)
    console.log(`✅ Used 50 sheets from ${firstSheet.displayName}`)
    console.log(`   New balance: ${firstSheet.balance}`)
    console.log('\n')

    // Test 5: Discard some sheets
    console.log('🗑️  Test 5: Discarding Answer Sheets')
    console.log('='.repeat(60))
    
    await firstSheet.discardSheets(10)
    console.log(`✅ Discarded 10 sheets from ${firstSheet.displayName}`)
    console.log(`   New balance: ${firstSheet.balance}`)
    console.log('\n')

    // Test 6: Get statistics
    console.log('📈 Test 6: Getting Statistics')
    console.log('='.repeat(60))
    
    const summaryStats = await AnswerSheet.getSummaryStats()
    console.log('Summary Statistics:')
    console.log(JSON.stringify(summaryStats, null, 2))
    console.log('\n')

    const statsByType = await AnswerSheet.getStatsByType()
    console.log('Statistics by Type:')
    console.log(JSON.stringify(statsByType, null, 2))
    console.log('\n')

    console.log('✅ All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run tests
testAnswerSheets()
