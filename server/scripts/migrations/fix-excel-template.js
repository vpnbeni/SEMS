const ExcelJS = require('exceljs')
const path = require('path')

const excelPath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')

async function getSheetData(worksheet) {
  const data = []
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values || []
    data.push(values.slice(1).map((v) => (v === undefined || v === null ? '' : v)))
  })
  return data
}

async function main() {
  console.log('📊 Fixing Excel Template...\n')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(excelPath)
  const worksheet = workbook.worksheets[0]
  const data = await getSheetData(worksheet)
  console.log('Before fixes:')
  data.forEach((row, index) => {
    if (index > 0 && row[0]) {
      console.log(`${row[0]}. ${row[1]} - ${row[2]} Pages - ${row[4]} - Class ${row[3]}`)
    }
  })
  let fixCount = 0
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row[0]) continue
    if (row[1] === 'for BLIND') {
      row[1] = 'For Blind'
      console.log(`\n✅ Fixed row ${i}: "for BLIND" → "For Blind"`)
      fixCount++
    }
    if (row[1] === 'Sheets') {
      row[1] = 'Drawing Sheets'
      console.log(`✅ Fixed row ${i}: "Sheets" → "Drawing Sheets"`)
      fixCount++
    }
    if (row[1] === 'Drawing Sheets' && row[2] === 2) {
      row[2] = 21
      console.log(`✅ Fixed row ${i}: Pages 2 → 21`)
      fixCount++
    }
  }
  console.log(`\n📊 Total fixes applied: ${fixCount}`)
  const newWorkbook = new ExcelJS.Workbook()
  const newSheet = newWorkbook.addWorksheet(worksheet.name || 'Sheet1')
  newSheet.addRows(data)
  await newWorkbook.xlsx.writeFile(excelPath)
  console.log('\n✅ Excel template fixed successfully!')
  console.log('📁 File:', excelPath)
  console.log('\n📋 After fixes:')
  data.forEach((row, index) => {
    if (index > 0 && row[0]) {
      console.log(`${row[0]}. ${row[1]} - ${row[2]} Pages - ${row[4]} - Class ${row[3]}`)
    }
  })
}
main().catch((err) => { console.error(err); process.exit(1) })
