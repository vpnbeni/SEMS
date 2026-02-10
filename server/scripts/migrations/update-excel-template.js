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
  console.log('📊 Updating Excel Template...\n')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(excelPath)
  const worksheet = workbook.worksheets[0]
  const data = await getSheetData(worksheet)
  console.log('Current row 11 (Sr No 11):')
  console.log(data[11])
  if (data[11] && data[11][1] === 'Sheets') {
    data[11][1] = 'Drawing Sheets'
    console.log('\n✅ Updated "Sheets" to "Drawing Sheets"')
  } else if (data[11] && data[11][1] === 'for BLIND') {
    for (let i = 0; i < data.length; i++) {
      if (data[i][1] === 'Sheets') {
        data[i][1] = 'Drawing Sheets'
        console.log(`\n✅ Updated "Sheets" to "Drawing Sheets" at row ${i}`)
        break
      }
    }
  }
  console.log('\nUpdated row:')
  console.log(data[11])
  const newWorkbook = new ExcelJS.Workbook()
  const newSheet = newWorkbook.addWorksheet(worksheet.name || 'Sheet1')
  newSheet.addRows(data)
  await newWorkbook.xlsx.writeFile(excelPath)
  console.log('\n✅ Excel template updated successfully!')
  console.log('📁 File:', excelPath)
  console.log('\n📋 Verifying all rows:')
  data.forEach((row, index) => {
    if (index > 0 && row[0]) {
      console.log(`${row[0]}. ${row[1]} - ${row[2]} Pages - ${row[4]} - Class ${row[3]}`)
    }
  })
}
main().catch((err) => { console.error(err); process.exit(1) })
