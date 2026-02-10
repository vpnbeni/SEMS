const ExcelJS = require('exceljs')
const path = require('path')

const excelPath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')

async function getSheetData(worksheet) {
  const data = []
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = row.values || []
    data.push(values.slice(1).map((v) => (v === undefined || v === null ? '' : v)))
  })
  return data
}

async function main() {
  console.log('📊 Updating template with sample data...\n')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(excelPath)
  const worksheet = workbook.worksheets[0]
  const data = await getSheetData(worksheet)
  const serialRanges = [
    ['1001', '1500'], ['2001', '2500'], ['3001', '3300'], ['4001', '4250'],
    ['5001', '5200'], ['6001', '6150'], ['7001', '7100'], ['8001', '8100'],
    ['9001', '9050'], ['10001', '10050'], ['11001', '11200']
  ]
  for (let i = 0; i < serialRanges.length && i + 1 < data.length; i++) {
    const row = data[i + 1]
    if (row && row[0]) {
      row[6] = serialRanges[i][0]
      row[7] = serialRanges[i][1]
      console.log(`✅ Updated row ${i + 1}: ${row[1]} - ${row[6]} to ${row[7]}`)
    }
  }
  const newWorkbook = new ExcelJS.Workbook()
  const newSheet = newWorkbook.addWorksheet(worksheet.name || 'Sheet1')
  newSheet.addRows(data)
  await newWorkbook.xlsx.writeFile(excelPath)
  console.log('\n✅ Template updated with serial numbers!')
  console.log('📁 File:', excelPath)
  console.log('\nNow you can upload this file and it will import all 11 entries.')
}
main().catch((err) => { console.error(err); process.exit(1) })
