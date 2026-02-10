const ExcelJS = require('exceljs')

/**
 * Parse Answer Sheets Excel file
 * Expected format: Excel file with columns matching the template
 */
class AnswerSheetsExcelParser {
  
  /**
   * Parse Excel file buffer
   * @param {Buffer} fileBuffer - Excel file buffer
   * @returns {Promise<Object>} Parsed answer sheets data
   */
  async parseExcel(fileBuffer) {
    try {
      console.log('📊 Parsing Answer Sheets Excel file...')
      console.log('  Buffer size:', fileBuffer.length, 'bytes')
      
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(fileBuffer)
      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        throw new Error('Workbook has no worksheets')
      }
      const sheetName = worksheet.name
      console.log(`📄 Reading sheet: ${sheetName}`)
      
      const data = []
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const values = row.values || []
        const rowData = values.slice(1).map((v) => (v === undefined || v === null ? '' : v))
        data.push(rowData)
      })
      
      console.log(`📋 Found ${data.length} rows`)
      console.log('  First 3 rows:', JSON.stringify(data.slice(0, 3), null, 2))
      
      const entries = this.parseRows(data)
      
      console.log(`✅ Parsed ${entries.length} valid entries`)
      
      return {
        success: true,
        data: {
          entries,
          count: entries.length,
          source: 'Excel Upload',
          format: 'Answer Sheets Template'
        }
      }
      
    } catch (error) {
      console.error('❌ Error parsing Excel file:', error)
      console.error('  Stack:', error.stack)
      return {
        success: false,
        error: error.message,
        data: { entries: [], count: 0 }
      }
    }
  }
  
  /**
   * Parse rows from Excel data
   * @param {Array} data - Raw Excel data
   * @returns {Array} Array of parsed answer sheet entries
   */
  parseRows(data) {
    const entries = []
    
    // Find header row (should contain "Sr No", "Answer Sheet", etc.)
    let headerRowIndex = -1
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]
      if (row && row.length > 0) {
        const firstCell = String(row[0]).toLowerCase()
        if (firstCell.includes('sr') || firstCell.includes('no')) {
          headerRowIndex = i
          break
        }
      }
    }
    
    if (headerRowIndex === -1) {
      console.warn('⚠️  Header row not found, assuming row 0')
      headerRowIndex = 0
    }
    
    console.log(`📍 Header row found at index: ${headerRowIndex}`)
    
    // Parse data rows (skip header)
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i]
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) {
        console.log(`  Row ${i}: SKIPPED (empty)`)
        continue
      }
      
      try {
        console.log(`  Row ${i}: Parsing [${row[1]}] - From: "${row[6]}", To: "${row[7]}"`)
        const entry = this.parseRow(row, i + 1)
        if (entry) {
          entries.push(entry)
          console.log(`  Row ${i}: ✅ Valid entry`)
        } else {
          console.log(`  Row ${i}: ❌ Rejected by validation`)
        }
      } catch (error) {
        console.warn(`⚠️  Failed to parse row ${i + 1}:`, error.message)
      }
    }
    
    console.log(`✅ Successfully parsed ${entries.length} entries`)
    return entries
  }
  
  /**
   * Parse individual row
   * Expected columns: Sr No | Type | Pages | Class | Colour | Suffix | From | To
   * @param {Array} row - Row data
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object|null} Parsed entry or null if invalid
   */
  parseRow(row, rowNumber) {
    try {
      // Actual column indices from Excel (0-based)
      // 0: Sr No
      // 1: Type (Answer Sheet Type)
      // 2: Pages
      // 3: Class
      // 4: Colour
      // 5: Suffix
      // 6: From (Serial No From)
      // 7: To (Serial No To)
      
      const srNo = parseInt(row[0]) || 0
      let answerSheetType = String(row[1] || '').trim()
      const pages = parseInt(row[2])
      const classLevel = String(row[3] || '').trim()
      const colour = String(row[4] || '').trim()
      const suffix = String(row[5] || '').trim()
      const serialFrom = String(row[6] || '').trim()
      const serialTo = String(row[7] || '').trim()
      
      // Normalize answer sheet type
      if (answerSheetType === 'for BLIND') {
        answerSheetType = 'For Blind'
      } else if (answerSheetType === 'Sheets') {
        answerSheetType = 'Drawing Sheets'
      }
      
      // Validate required fields
      if (!answerSheetType || !pages || !colour || !classLevel || !serialFrom || !serialTo) {
        console.warn(`⚠️  Row ${rowNumber}: Missing required fields`)
        return null
      }
      
      // Validate answer sheet type
      const validTypes = ['Main', 'Graph', 'Supplementary', 'For Blind', 'Drawing Sheets']
      if (!validTypes.includes(answerSheetType)) {
        console.warn(`⚠️  Row ${rowNumber}: Invalid answer sheet type: ${answerSheetType}`)
        return null
      }
      
      // Validate colour
      const validColours = ['Red', 'Blue', 'Yellow', 'Pink', 'White']
      if (!validColours.includes(colour)) {
        console.warn(`⚠️  Row ${rowNumber}: Invalid colour: ${colour}`)
        return null
      }
      
      const entry = {
        answerSheetType,
        pages,
        colour,
        class: classLevel,
        serialFrom,
        serialTo,
        sortOrder: srNo // Use Sr No from Excel as sort order
      }
      
      return entry
      
    } catch (error) {
      console.warn(`⚠️  Failed to parse row ${rowNumber}:`, error.message)
      return null
    }
  }
  
  /**
   * Get statistics about parsed data
   * @param {Array} entries - Parsed entries
   * @returns {Object} Statistics
   */
  getStatistics(entries) {
    const stats = {
      total: entries.length,
      byType: {},
      byClass: {},
      byColour: {}
    }
    
    entries.forEach(entry => {
      // Count by type
      stats.byType[entry.answerSheetType] = (stats.byType[entry.answerSheetType] || 0) + 1
      
      // Count by class
      stats.byClass[entry.class] = (stats.byClass[entry.class] || 0) + 1
      
      // Count by colour
      stats.byColour[entry.colour] = (stats.byColour[entry.colour] || 0) + 1
    })
    
    return stats
  }
}

module.exports = AnswerSheetsExcelParser
