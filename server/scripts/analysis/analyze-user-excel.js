const ExcelJS = require('exceljs')
const path = require('path')

const excelPath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')

async function main() {
  console.log('📊 Analyzing Excel File Structure\n')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(excelPath)
  const worksheet = workbook.worksheets[0]
  const sheetName = worksheet.name
  const data = []
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values || []
    data.push(values.slice(1).map((v) => (v === undefined || v === null ? '' : v)))
  })
  console.log('Sheet Name:', sheetName)
  console.log('\n' + '='.repeat(80))
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
  console.log(`\nTotal rows with data: ${data.filter((r) => r[0]).length - 1}`)
}
main().catch((err) => { console.error(err); process.exit(1) })
