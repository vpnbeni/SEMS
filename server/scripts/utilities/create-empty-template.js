const ExcelJS = require('exceljs')
const path = require('path')

function createEmptyTemplate() {
  console.log('📝 Creating Empty Answer Sheets Template...\n')
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
  const data = [['Sr No', 'Type', 'Pages', 'Class', 'Colour', 'Suffix', 'From ', 'To']]
  answerSheetTypes.forEach((sheet) => {
    data.push([sheet.srNo, sheet.type, sheet.pages, sheet.class, sheet.colour, sheet.suffix, '', ''])
  })
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Sheet1')
  const colWidths = [8, 18, 8, 8, 12, 10, 12, 12]
  colWidths.forEach((w, i) => { worksheet.getColumn(i + 1).width = w })
  worksheet.addRows(data)
  const outputPath = path.join(__dirname, '../../../client/public/Answer Sheets.xlsx')
  return workbook.xlsx.writeFile(outputPath).then(() => {
    console.log('✅ Empty template created successfully!')
    console.log('📂 Location:', outputPath)
    console.log('\n📋 Template contains:')
    console.log('  - 11 answer sheet types')
    console.log('  - Empty "From" and "To" columns')
    console.log('\n💡 Users should:')
    console.log('  1. Download this template')
    console.log('  2. Fill in "From" and "To" serial numbers')
    console.log('  3. Upload the filled file')
  })
}
createEmptyTemplate().catch((err) => { console.error(err); process.exit(1) })
