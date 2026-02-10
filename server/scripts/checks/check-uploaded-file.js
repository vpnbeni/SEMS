const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')

console.log('🔍 Checking Excel File Contents...\n')
console.log('📂 File:', filePath)

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found!')
  process.exit(1)
}

async function main() {
  const fileBuffer = fs.readFileSync(filePath)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(fileBuffer)
  const worksheet = workbook.worksheets[0]
  const data = []
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values || []
    data.push(values.slice(1).map((v) => (v === undefined || v === null ? '' : v)))
  })
  console.log('\n📋 Excel Data (all rows):\n')
  data.forEach((row, idx) => {
    console.log(`Row ${idx}:`)
    console.log(`  [0] Sr No: "${row[0]}"`)
    console.log(`  [1] Type: "${row[1]}"`)
    console.log(`  [2] Pages: "${row[2]}"`)
    console.log(`  [3] Class: "${row[3]}"`)
    console.log(`  [4] Colour: "${row[4]}"`)
    console.log(`  [5] Suffix: "${row[5]}"`)
    console.log(`  [6] From: "${row[6]}"`)
    console.log(`  [7] To: "${row[7]}"`)
    console.log(`  [8] Exam: "${row[8]}"`)
    console.log(`  [9] Subject: "${row[9]}"`)
    const hasFrom = row[6] && String(row[6]).trim() !== ''
    const hasTo = row[7] && String(row[7]).trim() !== ''
    if (idx > 0) {
      if (!hasFrom || !hasTo) {
        console.log(`  ⚠️  MISSING SERIAL NUMBERS!`)
      } else {
        console.log(`  ✅ Has serial numbers`)
      }
    }
    console.log()
  })
  console.log('\n💡 Summary:')
  console.log('If you see "MISSING SERIAL NUMBERS" above, you need to:')
  console.log('1. Open the Excel file')
  console.log('2. Fill in the "From" and "To" columns with serial numbers')
  console.log('3. Save the file')
  console.log('4. Upload the saved file')
}
main().catch((err) => { console.error(err); process.exit(1) })
