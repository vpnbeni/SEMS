const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')

async function deleteAllAnswerSheets() {
  try {
    console.log('🗑️  Deleting All Answer Sheets...\n')
    
    // Connect to database
    console.log('📡 Connecting to database...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to database\n')
    
    // Count existing entries
    const count = await AnswerSheet.countDocuments()
    console.log(`📊 Found ${count} answer sheet entries`)
    
    if (count === 0) {
      console.log('✅ No entries to delete')
      process.exit(0)
    }
    
    // Show existing entries
    const sheets = await AnswerSheet.find({}).sort({ sortOrder: 1 })
    console.log('\n📋 Existing Entries:')
    sheets.forEach((sheet, idx) => {
      console.log(`  ${idx + 1}. ${sheet.answerSheetType} (${sheet.class}) - ${sheet.serialFrom} to ${sheet.serialTo} = ${sheet.total} sheets`)
    })
    
    // Delete all entries
    console.log('\n🗑️  Deleting all entries...')
    const result = await AnswerSheet.deleteMany({})
    
    console.log(`✅ Deleted ${result.deletedCount} answer sheet entries`)
    
    // Verify deletion
    const remainingCount = await AnswerSheet.countDocuments()
    console.log(`\n📊 Remaining entries: ${remainingCount}`)
    
    if (remainingCount === 0) {
      console.log('✅ All answer sheets deleted successfully!')
    } else {
      console.log('⚠️  Some entries may still remain')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await mongoose.connection.close()
    console.log('\n📡 Database connection closed')
    process.exit(0)
  }
}

deleteAllAnswerSheets()
