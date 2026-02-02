require('dotenv').config({ path: './server/.env' })
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')

// All answer sheet types from the PDF template (in PDF order)
const answerSheetTypes = [
  {
    sortOrder: 1,
    answerSheetType: 'Main',
    pages: 32,
    colour: 'Red',
    class: '10',
    suffix: 'O',
    serialFrom: '1001',
    serialTo: '1500',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 2,
    answerSheetType: 'Main',
    pages: 32,
    colour: 'Blue',
    class: '12',
    suffix: 'P',
    serialFrom: '2001',
    serialTo: '2500',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 3,
    answerSheetType: 'Main',
    pages: 20,
    colour: 'Red',
    class: '10',
    suffix: 'A',
    serialFrom: '3001',
    serialTo: '3300',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 4,
    answerSheetType: 'Main',
    pages: 20,
    colour: 'Blue',
    class: '12',
    suffix: 'A',
    serialFrom: '4001',
    serialTo: '4250',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 5,
    answerSheetType: 'Graph',
    pages: 40,
    colour: 'Red',
    class: '10',
    suffix: 'A',
    serialFrom: '5001',
    serialTo: '5200',
    exam: 'Annual Examination 2025',
    subject: 'Mathematics, Science'
  },
  {
    sortOrder: 6,
    answerSheetType: 'Graph',
    pages: 40,
    colour: 'Blue',
    class: '12',
    suffix: 'A',
    serialFrom: '6001',
    serialTo: '6150',
    exam: 'Annual Examination 2025',
    subject: 'Mathematics, Physics, Chemistry'
  },
  {
    sortOrder: 7,
    answerSheetType: 'Supplementary',
    pages: 16,
    colour: 'Yellow',
    class: '10',
    suffix: 'G',
    serialFrom: '7001',
    serialTo: '7100',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 8,
    answerSheetType: 'Supplementary',
    pages: 16,
    colour: 'Pink',
    class: '12',
    suffix: 'H',
    serialFrom: '8001',
    serialTo: '8100',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 9,
    answerSheetType: 'For Blind',
    pages: 32,
    colour: 'Red',
    class: '10',
    suffix: 'B',
    serialFrom: '9001',
    serialTo: '9050',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 10,
    answerSheetType: 'For Blind',
    pages: 32,
    colour: 'Blue',
    class: '12',
    suffix: 'B',
    serialFrom: '10001',
    serialTo: '10050',
    exam: 'Annual Examination 2025',
    subject: 'All Subjects'
  },
  {
    sortOrder: 11,
    answerSheetType: 'Drawing Sheets',
    pages: 21,
    colour: 'White',
    class: '12',
    suffix: 'D',
    serialFrom: '11001',
    serialTo: '11200',
    exam: 'Annual Examination 2025',
    subject: 'Drawing, Engineering Graphics'
  }
]

async function seedAnswerSheets() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables')
      return
    }
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    console.log('🗑️  Clearing existing answer sheets...')
    await AnswerSheet.deleteMany({})
    console.log('✅ Cleared existing data\n')

    console.log('📝 Adding all answer sheet types...')
    console.log('='.repeat(80))

    let totalSheets = 0
    
    for (const sheetData of answerSheetTypes) {
      const sheet = await AnswerSheet.create(sheetData)
      totalSheets += sheet.total
      
      console.log(`✅ Added: ${sheet.displayName}`)
      console.log(`   Serial: ${sheet.serialFrom} to ${sheet.serialTo}`)
      console.log(`   Total: ${sheet.total} sheets`)
      console.log(`   Suffix: ${sheet.suffix}`)
      console.log(`   Exam: ${sheet.exam}`)
      console.log(`   Subject: ${sheet.subject}`)
      console.log()
    }

    console.log('='.repeat(80))
    console.log(`\n✅ Successfully added ${answerSheetTypes.length} answer sheet types`)
    console.log(`📊 Total sheets in inventory: ${totalSheets}`)
    
    // Get summary statistics
    const stats = await AnswerSheet.getSummaryStats()
    console.log('\n📈 Summary Statistics:')
    console.log(`   Total Received: ${stats.totalReceived}`)
    console.log(`   Total Used: ${stats.totalUsed}`)
    console.log(`   Total Balance: ${stats.totalBalance}`)
    console.log(`   Total Discarded: ${stats.totalDiscarded}`)

  } catch (error) {
    console.error('❌ Error seeding answer sheets:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run the seeder
seedAnswerSheets()
