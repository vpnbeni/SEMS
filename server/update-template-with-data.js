const xlsx = require('xlsx')
const path = require('path')

// Update the template file with sample data
const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')

console.log('📊 Updating template with sample data...\n')

// Read existing file
const workbook = xlsx.readFile(excelPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

// Convert to array
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

// Add serial numbers to each row
const serialRanges = [
  ['1001', '1500'],      // Row 1: Main 32 Red 10
  ['2001', '2500'],      // Row 2: Main 32 Blue 12
  ['3001', '3300'],      // Row 3: Main 20 Red 10
  ['4001', '4250'],      // Row 4: Main 20 Blue 12
  ['5001', '5200'],      // Row 5: Graph 40 Red 10
  ['6001', '6150'],      // Row 6: Graph 40 Blue 12
  ['7001', '7100'],      // Row 7: Supplementary 16 Yellow 10
  ['8001', '8100'],      // Row 8: Supplementary 16 Pink 12
  ['9001', '9050'],      // Row 9: For Blind 32 Red 10
  ['10001', '10050'],    // Row 10: For Blind 32 Blue 12
  ['11001', '11200']     // Row 11: Drawing Sheets 21 White 12
]

// Update rows 1-11 with serial numbers
for (let i = 0; i < serialRanges.length && i + 1 < data.length; i++) {
  const row = data[i + 1] // +1 because row 0 is header
  if (row && row[0]) {
    row[6] = serialRanges[i][0] // From column
    row[7] = serialRanges[i][1] // To column
    console.log(`✅ Updated row ${i + 1}: ${row[1]} - ${row[6]} to ${row[7]}`)
  }
}

// Convert back to worksheet
const newWorksheet = xlsx.utils.aoa_to_sheet(data)
workbook.Sheets[sheetName] = newWorksheet

// Save
xlsx.writeFile(workbook, excelPath)

console.log('\n✅ Template updated with serial numbers!')
console.log('📁 File:', excelPath)
console.log('\nNow you can upload this file and it will import all 11 entries.')
