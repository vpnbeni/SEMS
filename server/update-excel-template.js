const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

// Path to the Excel template
const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')

console.log('📊 Updating Excel Template...\n')

// Read the existing file
const workbook = xlsx.readFile(excelPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

// Convert to array
const data = xlsx.utils.sheet_to_json(worksheet, { 
  header: 1,
  defval: ''
})

console.log('Current row 11 (Sr No 11):')
console.log(data[11])

// Update row 11 (index 11, which is Sr No 11)
// Change "Sheets" to "Drawing Sheets"
if (data[11] && data[11][1] === 'Sheets') {
  data[11][1] = 'Drawing Sheets'
  console.log('\n✅ Updated "Sheets" to "Drawing Sheets"')
} else if (data[11] && data[11][1] === 'for BLIND') {
  // If row 11 is "for BLIND", we need to find the "Sheets" row
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

// Convert back to worksheet
const newWorksheet = xlsx.utils.aoa_to_sheet(data)

// Replace the worksheet
workbook.Sheets[sheetName] = newWorksheet

// Save the file
xlsx.writeFile(workbook, excelPath)

console.log('\n✅ Excel template updated successfully!')
console.log('📁 File:', excelPath)

// Verify the change
console.log('\n📋 Verifying all rows:')
data.forEach((row, index) => {
  if (index > 0 && row[0]) {
    console.log(`${row[0]}. ${row[1]} - ${row[2]} Pages - ${row[4]} - Class ${row[3]}`)
  }
})
