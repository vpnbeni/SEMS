const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

// Debug script to analyze user's uploaded Excel file
async function debugUserExcel() {
  try {
    console.log('🔍 Debugging User Excel Upload...\n')
    
    // Path to the template
    const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')
    
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found at:', excelPath)
      return
    }
    
    console.log('📂 Reading file from:', excelPath)
    
    // Read the file
    const fileBuffer = fs.readFileSync(excelPath)
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
    
    console.log('\n📊 Workbook Info:')
    console.log('  Sheet Names:', workbook.SheetNames)
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    console.log(`\n📄 Analyzing Sheet: "${sheetName}"`)
    
    // Get range
    const range = xlsx.utils.decode_range(worksheet['!ref'])
    console.log(`  Range: ${worksheet['!ref']}`)
    console.log(`  Rows: ${range.e.r + 1}`)
    console.log(`  Columns: ${range.e.c + 1}`)
    
    // Convert to JSON with different options
    console.log('\n📋 Raw Data (first 15 rows):')
    const rawData = xlsx.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false,
      raw: false  // Get formatted values
    })
    
    rawData.slice(0, 15).forEach((row, idx) => {
      console.log(`  Row ${idx}:`, row)
    })
    
    // Find header row
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
    
    // Show header row
    console.log('\n📌 Header Row:')
    console.log('  ', rawData[headerRowIndex])
    
    // Parse data rows
    console.log('\n📝 Parsing Data Rows...')
    const entries = []
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i]
      
      // Skip empty rows
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
      
      // Check if serial numbers are present
      const serialFrom = String(row[6] || '').trim()
      const serialTo = String(row[7] || '').trim()
      
      if (!serialFrom || !serialTo) {
        console.log(`    ⚠️  SKIPPED: No serial numbers (From: "${serialFrom}", To: "${serialTo}")`)
        continue
      }
      
      // Validate required fields
      const answerSheetType = String(row[1] || '').trim()
      const pages = parseInt(row[2])
      const classLevel = String(row[3] || '').trim()
      const colour = String(row[4] || '').trim()
      
      if (!answerSheetType || !pages || !colour || !classLevel) {
        console.log(`    ❌ INVALID: Missing required fields`)
        console.log(`       Type: "${answerSheetType}", Pages: ${pages}, Class: "${classLevel}", Colour: "${colour}"`)
        continue
      }
      
      console.log(`    ✅ VALID ENTRY`)
      entries.push({
        answerSheetType,
        pages,
        colour,
        class: classLevel,
        serialFrom,
        serialTo
      })
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
