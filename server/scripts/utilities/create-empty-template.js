const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

// Create empty template with no serial numbers
function createEmptyTemplate() {
  console.log('📝 Creating Empty Answer Sheets Template...\n')
  
  // Define the answer sheet types from the PDF
  const answerSheetTypes = [
    { srNo: 1, type: 'Main', pages: 32, class: '10', colour: 'Red', suffix: '' },
    { srNo: 2, type: 'Main', pages: 32, class: '12', colour: 'Blue', suffix: '' },
    { srNo: 3, type: 'Main', pages: 20, class: '10', colour: 'Red', suffix: '' },
    { srNo: 4, type: 'Main', pages: 20, class: '12', colour: 'Blue', suffix: '' },
    { srNo: 5, type: 'Graph', pages: 40, class: '10', colour: 'Red', suffix: '' },
    { srNo: 6, type: 'Graph', pages: 40, class: '12', colour: 'Blue', suffix: '' },
    { srNo: 7, type: 'Supplementary', pages: 16, class: '10', colour: 'Yellow', suffix: '' },
    { srNo: 8, type: 'Supplementary', pages: 16, class: '12', colour: 'Pink', suffix: '' },
    { srNo: 9, type: 'For Blind', pages: 32, class: '10', colour: 'Red', suffix: '' },
    { srNo: 10, type: 'For Blind', pages: 32, class: '12', colour: 'Blue', suffix: '' },
    { srNo: 11, type: 'Drawing Sheets', pages: 21, class: '12', colour: 'White', suffix: '' }
  ]
  
  // Create worksheet data
  const data = [
    // Header row
    ['Sr No', 'Type', 'Pages', 'Class', 'Colour', 'Suffix', 'From ', 'To']
  ]
  
  // Add data rows with EMPTY serial numbers
  answerSheetTypes.forEach(sheet => {
    data.push([
      sheet.srNo,
      sheet.type,
      sheet.pages,
      sheet.class,
      sheet.colour,
      sheet.suffix,
      '', // Empty From
      ''  // Empty To
    ])
  })
  
  // Create workbook
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.aoa_to_sheet(data)
  
  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 18 }, // Type
    { wch: 8 },  // Pages
    { wch: 8 },  // Class
    { wch: 12 }, // Colour
    { wch: 10 }, // Suffix
    { wch: 12 }, // From
    { wch: 12 }  // To
  ]
  
  // Add worksheet to workbook
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1')
  
  // Save to file
  const outputPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')
  xlsx.writeFile(wb, outputPath)
  
  console.log('✅ Empty template created successfully!')
  console.log('📂 Location:', outputPath)
  console.log('\n📋 Template contains:')
  console.log('  - 11 answer sheet types')
  console.log('  - Empty "From" and "To" columns')
  console.log('\n💡 Users should:')
  console.log('  1. Download this template')
  console.log('  2. Fill in "From" and "To" serial numbers')
  console.log('  3. Upload the filled file')
}

createEmptyTemplate()
