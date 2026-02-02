const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const mongoose = require('mongoose')
const AnswerSheetsExcelParser = require('./src/utils/answerSheetsExcelParser')
const AnswerSheet = require('./src/models/AnswerSheet')
const fs = require('fs')

async function testActualUpload() {
  try {
    console.log('🧪 Testing Actual Upload Scenario...\n')
    
    // Connect to database
    console.log('📡 Connecting to database...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected\n')
    
    // Read the Excel file
    const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')
    const fileBuffer = fs.readFileSync(excelPath)
    
    console.log('📂 File:', excelPath)
    console.log('📊 Size:', fileBuffer.length, 'bytes\n')
    
    // Parse the Excel file
    console.log('🔄 Parsing Excel...')
    const parser = new AnswerSheetsExcelParser()
    const result = await parser.parseExcel(fileBuffer)
    
    if (!result.success) {
      console.error('❌ Parsing failed:', result.error)
      process.exit(1)
    }
    
    console.log(`✅ Parsed ${result.data.entries.length} entries\n`)
    
    // Filter out entries with blank serial numbers
    const validEntries = result.data.entries.filter(entry => {
      const hasSerialFrom = entry.serialFrom && entry.serialFrom.trim() !== ''
      const hasSerialTo = entry.serialTo && entry.serialTo.trim() !== ''
      return hasSerialFrom && hasSerialTo
    })
    
    console.log(`📋 Valid entries (with serial numbers): ${validEntries.length}\n`)
    
    if (validEntries.length === 0) {
      console.log('⚠️  No valid entries to create!')
      process.exit(0)
    }
    
    // Try to create entries in database
    console.log('💾 Creating entries in database...\n')
    const createdEntries = []
    const errors = []
    
    for (const entry of validEntries) {
      try {
        console.log(`  Creating: ${entry.answerSheetType} (${entry.class}) - ${entry.serialFrom} to ${entry.serialTo}`)
        const created = await AnswerSheet.create(entry)
        createdEntries.push(created)
        console.log(`  ✅ Created with ID: ${created._id}`)
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`)
        errors.push({
          entry,
          error: error.message
        })
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`  Created: ${createdEntries.length}`)
    console.log(`  Failed: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:')
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.entry.answerSheetType} - ${err.error}`)
      })
    }
    
    if (createdEntries.length > 0) {
      console.log('\n✅ Successfully created entries!')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await mongoose.connection.close()
    console.log('\n📡 Database connection closed')
    process.exit(0)
  }
}

testActualUpload()
