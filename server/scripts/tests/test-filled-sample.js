const fs = require('fs')
const path = require('path')
const AnswerSheetsExcelParser = require('./src/utils/answerSheetsExcelParser')

async function testFilledSample() {
  try {
    console.log('📊 Testing Filled Sample Excel...\n')
    
    const excelPath = path.join(__dirname, '../client/public/Answer_Sheets_Filled_Sample.xlsx')
    
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found')
      return
    }
    
    const fileBuffer = fs.readFileSync(excelPath)
    console.log(`✅ Loaded file: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`)
    
    const parser = new AnswerSheetsExcelParser()
    const result = await parser.parseExcel(fileBuffer)
    
    if (result.success) {
      console.log(`✅ Successfully parsed ${result.data.count} entries\n`)
      
      console.log('Entries:')
      result.data.entries.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.answerSheetType} - ${entry.pages} Pages - ${entry.colour} - Class ${entry.class}`)
        console.log(`   Serial: ${entry.serialFrom} to ${entry.serialTo}`)
        console.log(`   Exam: ${entry.exam}`)
        console.log()
      })
      
      const stats = parser.getStatistics(result.data.entries)
      console.log('Statistics:')
      console.log(JSON.stringify(stats, null, 2))
    } else {
      console.log('❌ Parsing failed:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFilledSample()
