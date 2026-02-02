const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')
const AnswerSheetsExcelParser = require('./src/utils/answerSheetsExcelParser')

// Create a test Excel file with filled data
const testData = [
  ['Sr No', 'Type', 'Pages', 'Class', 'Colour', 'Suffix', 'From', 'To', 'Exam', 'Subject'],
  [1, 'Main', 32, 10, 'Red', 'O', '1001', '1500', 'Term 1', 'All Subjects'],
  [2, 'Main', 32, 12, 'Blue', 'P', '2001', '2500', 'Term 1', 'All Subjects'],
  [3, 'Main', 20, 10, 'Red', 'A', '3001', '3300', 'Term 1', 'All Subjects']
]

const ws = xlsx.utils.aoa_to_sheet(testData)
const wb = xlsx.utils.book_new()
xlsx.utils.book_append_sheet(wb, ws, 'Sheet1')

const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

console.log('📊 Testing Excel Parser with filled data...\n')

const parser = new AnswerSheetsExcelParser()
parser.parseExcel(buffer).then(result => {
  console.log('Parse Result:')
  console.log(JSON.stringify(result, null, 2))
  
  if (result.success && result.data.entries.length > 0) {
    console.log('\n✅ Successfully parsed entries!')
    console.log('\nFirst entry:')
    console.log(JSON.stringify(result.data.entries[0], null, 2))
  } else {
    console.log('\n❌ No entries parsed')
  }
})
