const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')

async function getSheetData(worksheet) {
  const data = []
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values || []
    data.push(values.slice(1).map((v) => (v === undefined || v === null ? '' : v)))
  })
  return data
}

async function debugUserExcel() {
  try {
    console.log('🔍 Debugging User Excel Upload...\n')
    const excelPath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found at:', excelPath)
      return
    }
    console.log('📂 Reading file from:', excelPath)
    const fileBuffer = fs.readFileSync(excelPath)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(fileBuffer)
    console.log('\n📊 Workbook Info:')
    console.log('  Sheet Names:', workbook.worksheets.map((ws) => ws.name))
    const worksheet = workbook.worksheets[0]
    const sheetName = worksheet.name
    console.log(`\n📄 Analyzing Sheet: "${sheetName}"`)
    const rowCount = worksheet.rowCount || 0
    const colCount = worksheet.columnCount || 0
    console.log(`  Rows: ${rowCount}`)
    console.log(`  Columns: ${colCount}`)
    const rawData = await getSheetData(worksheet)
    console.log('\n📋 Raw Data (first 15 rows):')
    rawData.slice(0, 15).forEach((row, idx) => {
      console.log(`  Row ${idx}:`, row)
    })
    console.log('\n🔎 Finding Header Row...')
    let headerRowIndex = -1
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i]
      if (row && row.length > 0) {
        const firstCell = String(row[0]).toLowerCase()
        console.log(`  Row ${i}, Cell 0: "${row[0]}" (checking for "sr" or "no")`)
        if (firstCell.includes('sr') || firstCell.includes('no')) {
          headerRowIndex = i
          console.log(`  ✅ Header found at row ${i}`)
          break
        }
      }
    }
    if (headerRowIndex === -1) {
      console.log('  ⚠️  Header row not found, assuming row 0')
      headerRowIndex = 0
    }
    console.log('\n📌 Header Row:')
    console.log('  ', rawData[headerRowIndex])
    console.log('\n📝 Parsing Data Rows...')
    const entries = []
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.length === 0 || !row[0]) {
        console.log(`  Row ${i}: SKIPPED (empty)`)
        continue
      }
      console.log(`\n  Row ${i}:`)
      console.log(`    Raw: [${row.join(' | ')}]`)
      console.log(`    [0] Sr No: "${row[0]}"`)
      console.log(`    [1] Type: "${row[1]}"`)
      console.log(`    [2] Pages: "${row[2]}"`)
      console.log(`    [3] Class: "${row[3]}"`)
      console.log(`    [4] Colour: "${row[4]}"`)
      console.log(`    [5] Suffix: "${row[5]}"`)
      console.log(`    [6] From: "${row[6]}"`)
      console.log(`    [7] To: "${row[7]}"`)
      console.log(`    [8] Exam: "${row[8]}"`)
      console.log(`    [9] Subject: "${row[9]}"`)
      const serialFrom = String(row[6] || '').trim()
      const serialTo = String(row[7] || '').trim()
      if (!serialFrom || !serialTo) {
        console.log(`    ⚠️  SKIPPED: No serial numbers (From: "${serialFrom}", To: "${serialTo}")`)
        continue
      }
      const answerSheetType = String(row[1] || '').trim()
      const pages = parseInt(row[2], 10)
      const classLevel = String(row[3] || '').trim()
      const colour = String(row[4] || '').trim()
      if (!answerSheetType || !pages || !colour || !classLevel) {
        console.log(`    ❌ INVALID: Missing required fields`)
        console.log(`       Type: "${answerSheetType}", Pages: ${pages}, Class: "${classLevel}", Colour: "${colour}"`)
        continue
      }
      console.log(`    ✅ VALID ENTRY`)
      entries.push({ answerSheetType, pages, colour, class: classLevel, serialFrom, serialTo })
    }
    console.log(`\n\n📊 Summary:`)
    console.log(`  Total rows: ${rawData.length}`)
    console.log(`  Header row: ${headerRowIndex}`)
    console.log(`  Data rows: ${rawData.length - headerRowIndex - 1}`)
    console.log(`  Valid entries: ${entries.length}`)
    if (entries.length > 0) {
      console.log('\n✅ Parsed Entries:')
      entries.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. ${entry.answerSheetType} (${entry.class}) - ${entry.serialFrom} to ${entry.serialTo}`)
      })
    } else {
      console.log('\n❌ No valid entries found!')
      console.log('\n💡 Possible Issues:')
      console.log('  1. Serial numbers (From/To) are empty or in wrong columns')
      console.log('  2. Required fields are missing (Type, Pages, Class, Colour)')
      console.log('  3. Data is not in the expected format')
      console.log('  4. Header row is not detected correctly')
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.error(error.stack)
  }
}
debugUserExcel()
