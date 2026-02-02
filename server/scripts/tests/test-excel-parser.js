require('dotenv').config({ path: './server/.env' })
const fs = require('fs')
const path = require('path')
const AnswerSheetsExcelParser = require('./src/utils/answerSheetsExcelParser')

async function testExcelParser() {
  try {
    console.log('📊 Testing Excel Parser...\n')
    
    const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')
    
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found at:', excelPath)
      return
    }
    
    const fileBuffer = fs.readFileSync(excelPath)
    console.log(`✅ Loaded Excel file: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`)
    
    const parser = new AnswerSheetsExcelParser()
    const result = await parser.parseExcel(fileBuffer)
    
    console.log('Parse Result:')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.success) {
      console.log(`\n✅ Successfully parsed ${result.data.count} entries`)
      
      if (result.data.entries.length > 0) {
        console.log('\nFirst entry:')
        console.log(JSON.stringify(result.data.entries[0], null, 2))
      }
    } else {
      console.log('\n❌ Parsing failed:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testExcelParser()
