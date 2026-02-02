const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

// Path to the Excel template
const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')

console.log('📊 Fixing Excel Template...\n')

// Read the existing file
const workbook = xlsx.readFile(excelPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

// Convert to array
const data = xlsx.utils.sheet_to_json(worksheet, { 
  header: 1,
  defval: ''
})

console.log('Before fixes:')
data.forEach((row, index) => {
  if (index > 0 && row[0]) {
    console.log(`${row[0]}. ${row[1]} - ${row[2]} Pages - ${row[4]} - Class ${row[3]}`)
  }
})

// Fix all issues
let fixCount = 0

for (let i = 1; i < data.length; i++) {
  const row = data[i]
  if (!row[0]) continue
  
  // Fix "for BLIND" to "For Blind"
  if (row[1] === 'for BLIND') {
    row[1] = 'For Blind'
    console.log(`\n✅ Fixed row ${i}: "for BLIND" → "For Blind"`)
    fixCount++
  }
  
  // Fix "Sheets" to "Drawing Sheets"
  if (row[1] === 'Sheets') {
    row[1] = 'Drawing Sheets'
    console.log(`✅ Fixed row ${i}: "Sheets" → "Drawing Sheets"`)
    fixCount++
  }
  
  // Fix Drawing Sheets pages from 2 to 21
  if (row[1] === 'Drawing Sheets' && row[2] === 2) {
    row[2] = 21
    console.log(`✅ Fixed row ${i}: Pages 2 → 21`)
    fixCount++
  }
}

console.log(`\n📊 Total fixes applied: ${fixCount}`)

// Convert back to worksheet
const newWorksheet = xlsx.utils.aoa_to_sheet(data)

// Replace the worksheet
workbook.Sheets[sheetName] = newWorksheet

// Save the file
xlsx.writeFile(workbook, excelPath)

console.log('\n✅ Excel template fixed successfully!')
console.log('📁 File:', excelPath)

console.log('\n📋 After fixes:')
data.forEach((row, index) => {
  if (index > 0 && row[0]) {
    console.log(`${row[0]}. ${row[1]} - ${row[2]} Pages - ${row[4]} - Class ${row[3]}`)
  }
})
