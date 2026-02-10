const ExcelJS = require('exceljs')
const path = require('path')

const AnswerSheetsExcelParser = require('../../src/utils/answerSheetsExcelParser')

const testData = [
  ['Sr No', 'Type', 'Pages', 'Class', 'Colour', 'Suffix', 'From', 'To', 'Exam', 'Subject'],
  [1, 'Main', 32, 10, 'Red', 'O', '1001', '1500', 'Term 1', 'All Subjects'],
  [2, 'Main', 32, 12, 'Blue', 'P', '2001', '2500', 'Term 1', 'All Subjects'],
  [3, 'Main', 20, 10, 'Red', 'A', '3001', '3300', 'Term 1', 'All Subjects']
]

async function main() {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Sheet1')
  worksheet.addRows(testData)
  const buffer = await workbook.xlsx.writeBuffer()
  console.log('📊 Testing Excel Parser with filled data...\n')
  const parser = new AnswerSheetsExcelParser()
  const result = await parser.parseExcel(buffer)
  console.log('Parse Result:')
  console.log(JSON.stringify(result, null, 2))
  if (result.success && result.data.entries.length > 0) {
    console.log('\n✅ Successfully parsed entries!')
    console.log('\nFirst entry:')
    console.log(JSON.stringify(result.data.entries[0], null, 2))
  } else {
    console.log('\n❌ No entries parsed')
  }
}
main().catch((err) => { console.error(err); process.exit(1) })
