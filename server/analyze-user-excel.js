const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

// This will help us see exactly what's in the user's Excel file
const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')

console.log('📊 Analyzing Excel File Structure\n')

const workbook = xlsx.readFile(excelPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

console.log('Sheet Name:', sheetName)
console.log('\n' + '='.repeat(80))

const data = xlsx.utils.sheet_to_json(worksheet, { 
  header: 1,
  defval: '',
  blankrows: false,
  raw: false  // Get formatted values
})

console.log('\nColumn Headers (Row 0):')
if (data[0]) {
  data[0].forEach((header, index) => {
    console.log(`  Column ${String.fromCharCode(65 + index)} (${index}): "${header}"`)
  })
}

console.log('\n' + '='.repeat(80))
console.log('\nAll Data Rows:\n')

data.forEach((row, index) => {
  if (index === 0) {
    console.log(`Row ${index} (HEADER):`, row)
  } else if (row[0]) {
    console.log(`Row ${index} (Sr ${row[0]}):`)
    console.log(`  Type: "${row[1]}"`)
    console.log(`  Pages: "${row[2]}"`)
    console.log(`  Class: "${row[3]}"`)
    console.log(`  Colour: "${row[4]}"`)
    console.log(`  Suffix: "${row[5]}"`)
    console.log(`  From: "${row[6]}"`)
    console.log(`  To: "${row[7]}"`)
    console.log()
  }
})

console.log('='.repeat(80))
console.log(`\nTotal rows with data: ${data.filter(r => r[0]).length - 1}`)
