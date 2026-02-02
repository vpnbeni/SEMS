const AnswerSheetsExcelParser = require('./src/utils/answerSheetsExcelParser')
const fs = require('fs')
const path = require('path')

async function diagnoseExcelUpload() {
  try {
    console.log('🔍 Diagnosing Excel Upload Issue...\n')
    
    // Path to the template
    const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')
    
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found at:', excelPath)
      return
    }
    
    console.log('✅ Excel file found')
    console.log('📂 Path:', excelPath)
    
    // Read the file
    const fileBuffer = fs.readFileSync(excelPath)
    console.log('📊 File size:', fileBuffer.length, 'bytes\n')
    
    // Parse using the same parser as the controller
    console.log('🔄 Parsing with AnswerSheetsExcelParser...\n')
    const parser = new AnswerSheetsExcelParser()
    const result = await parser.parseExcel(fileBuffer)
    
    console.log('\n📋 Parse Result:')
    console.log('  Success:', result.success)
    
    if (result.success) {
      console.log('  Entries count:', result.data.entries.length)
      console.log('  Total count:', result.data.count)
      
      if (result.data.entries.length > 0) {
        console.log('\n✅ Parsed Entries:')
        result.data.entries.forEach((entry, idx) => {
          console.log(`  ${idx + 1}. ${entry.answerSheetType} (${entry.class})`)
          console.log(`     Pages: ${entry.pages}, Colour: ${entry.colour}`)
          console.log(`     Serial: ${entry.serialFrom} to ${entry.serialTo}`)
          if (entry.exam) console.log(`     Exam: ${entry.exam}`)
          if (entry.subject) console.log(`     Subject: ${entry.subject}`)
        })
        
        console.log('\n💡 The parser is working correctly!')
        console.log('   If upload is failing, the issue might be:')
        console.log('   1. File not being sent correctly from frontend')
        console.log('   2. Server middleware not processing the file')
        console.log('   3. Database connection or validation issues')
      } else {
        console.log('\n⚠️  No entries were parsed!')
        console.log('   This means the Excel file has no valid data rows.')
      }
    } else {
      console.log('  Error:', result.error)
      console.log('\n❌ Parser failed!')
      console.log('   Check the Excel file format and structure.')
    }
    
    // Get statistics
    if (result.success && result.data.entries.length > 0) {
      const stats = parser.getStatistics(result.data.entries)
      console.log('\n📊 Statistics:')
      console.log('  Total:', stats.total)
      console.log('  By Type:', stats.byType)
      console.log('  By Class:', stats.byClass)
      console.log('  By Colour:', stats.byColour)
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  }
}

diagnoseExcelUpload()
