const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

// Create a filled sample for testing
function createFilledSample() {
  console.log('📝 Creating Filled Sample...\n')
  
  // Define the answer sheet types with sample serial numbers
  const answerSheetTypes = [
    { srNo: 1, type: 'Main', pages: 32, class: '10', colour: 'Red', suffix: '', from: '1001', to: '1500' },
    { srNo: 2, type: 'Main', pages: 32, class: '12', colour: 'Blue', suffix: '', from: '2001', to: '2500' },
    { srNo: 3, type: 'Main', pages: 20, class: '10', colour: 'Red', suffix: '', from: '3001', to: '3300' },
    { srNo: 4, type: 'Main', pages: 20, class: '12', colour: 'Blue', suffix: '', from: '4001', to: '4250' },
    { srNo: 5, type: 'Graph', pages: 40, class: '10', colour: 'Red', suffix: '', from: '5001', to: '5200' },
    { srNo: 6, type: 'Graph', pages: 40, class: '12', colour: 'Blue', suffix: '', from: '6001', to: '6150' },
    { srNo: 7, type: 'Supplementary', pages: 16, class: '10', colour: 'Yellow', suffix: '', from: '7001', to: '7100' },
    { srNo: 8, type: 'Supplementary', pages: 16, class: '12', colour: 'Pink', suffix: '', from: '8001', to: '8100' },
    { srNo: 9, type: 'For Blind', pages: 32, class: '10', colour: 'Red', suffix: '', from: '9001', to: '9050' },
    { srNo: 10, type: 'For Blind', pages: 32, class: '12', colour: 'Blue', suffix: '', from: '10001', to: '10050' },
    { srNo: 11, type: 'Drawing Sheets', pages: 21, class: '12', colour: 'White', suffix: '', from: '11001', to: '11200' }
  ]
  
  // Create worksheet data
  const data = [
    // Header row
    ['Sr No', 'Type', 'Pages', 'Class', 'Colour', 'Suffix', 'From ', 'To']
  ]
  
  // Add data rows with filled serial numbers
  answerSheetTypes.forEach(sheet => {
    data.push([
      sheet.srNo,
      sheet.type,
      sheet.pages,
      sheet.class,
      sheet.colour,
      sheet.suffix,
      sheet.from,
      sheet.to
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
  const outputPath = path.join(__dirname, 'Answer_Sheets_Filled_Sample.xlsx')
  xlsx.writeFile(wb, outputPath)
  
  console.log('✅ Filled sample created successfully!')
  console.log('📂 Location:', outputPath)
  console.log('\n📋 Sample contains:')
  console.log('  - 11 answer sheet types')
  console.log('  - Filled "From" and "To" columns with sample data')
  console.log('\n💡 Use this file to test the upload functionality')
}

createFilledSample()
