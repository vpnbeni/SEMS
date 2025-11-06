const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')

const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')
const fileBuffer = fs.readFileSync(excelPath)

const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

console.log('📊 Excel Structure Analysis\n')
console.log('Sheet Name:', sheetName)
console.log('\nRaw Data (first 15 rows):\n')

const data = xlsx.utils.sheet_to_json(worksheet, { 
  header: 1,
  defval: '',
  blankrows: false
})

data.slice(0, 15).forEach((row, index) => {
  console.log(`Row ${index}:`, row)
})

console.log('\n\nColumn Headers (Row 0):')
if (data[0]) {
  data[0].forEach((header, index) => {
    console.log(`  Column ${index}: "${header}"`)
  })
}

console.log('\n\nSample Data Row (Row 1):')
if (data[1]) {
  data[1].forEach((cell, index) => {
    console.log(`  Column ${index}: "${cell}" (type: ${typeof cell})`)
  })
}
