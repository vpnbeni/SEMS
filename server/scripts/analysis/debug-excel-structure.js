const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')

const excelPath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')
const fileBuffer = fs.readFileSync(excelPath)

async function main() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(fileBuffer)
  const worksheet = workbook.worksheets[0]
  const sheetName = worksheet.name
  const data = []
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values || []
    data.push(values.slice(1).map((v) => (v === undefined || v === null ? '' : v)))
  })
  console.log('📊 Excel Structure Analysis\n')
  console.log('Sheet Name:', sheetName)
  console.log('\nRaw Data (first 15 rows):\n')
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
}
main().catch((err) => { console.error(err); process.exit(1) })
