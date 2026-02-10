const ExcelJS = require('exceljs')
const path = require('path')

function createFilledSample() {
  console.log('📝 Creating Filled Sample...\n')
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
  const data = [['Sr No', 'Type', 'Pages', 'Class', 'Colour', 'Suffix', 'From ', 'To']]
  answerSheetTypes.forEach((sheet) => {
    data.push([sheet.srNo, sheet.type, sheet.pages, sheet.class, sheet.colour, sheet.suffix, sheet.from, sheet.to])
  })
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Sheet1')
  const colWidths = [8, 18, 8, 8, 12, 10, 12, 12]
  colWidths.forEach((w, i) => { worksheet.getColumn(i + 1).width = w })
  worksheet.addRows(data)
  const outputPath = path.join(__dirname, 'Answer_Sheets_Filled_Sample.xlsx')
  return workbook.xlsx.writeFile(outputPath).then(() => {
    console.log('✅ Filled sample created successfully!')
    console.log('📂 Location:', outputPath)
    console.log('\n📋 Sample contains:')
    console.log('  - 11 answer sheet types')
    console.log('  - Filled "From" and "To" columns with sample data')
    console.log('\n💡 Use this file to test the upload functionality')
  })
}
createFilledSample().catch((err) => { console.error(err); process.exit(1) })
