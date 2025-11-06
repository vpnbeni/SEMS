const xlsx = require('xlsx')
const fs = require('fs')
const path = require('path')

// Create a filled template for testing
const data = [
  ['Sr No', 'Type', 'Pages', 'Class', 'Colour', 'Suffix', 'Serial From', 'Serial To', 'Exam', 'Subject'],
  [1, 'Main', 32, 10, 'Red', 'O', '1001', '1500', 'Annual Examination 2025', 'All Subjects'],
  [2, 'Main', 32, 12, 'Blue', 'P', '2001', '2500', 'Annual Examination 2025', 'All Subjects'],
  [3, 'Main', 20, 10, 'Red', 'A', '3001', '3300', 'Annual Examination 2025', 'All Subjects'],
  [4, 'Main', 20, 12, 'Blue', 'A', '4001', '4250', 'Annual Examination 2025', 'All Subjects'],
  [5, 'Graph', 40, 10, 'Red', 'A', '5001', '5200', 'Annual Examination 2025', 'Mathematics, Science'],
  [6, 'Graph', 40, 12, 'Blue', 'A', '6001', '6150', 'Annual Examination 2025', 'Mathematics, Physics, Chemistry'],
  [7, 'Supplementary', 16, 10, 'Yellow', 'G', '7001', '7100', 'Annual Examination 2025', 'All Subjects'],
  [8, 'Supplementary', 16, 12, 'Pink', 'H', '8001', '8100', 'Annual Examination 2025', 'All Subjects'],
  [9, 'For Blind', 32, 10, 'Red', 'B', '9001', '9050', 'Annual Examination 2025', 'All Subjects'],
  [10, 'For Blind', 32, 12, 'Blue', 'B', '10001', '10050', 'Annual Examination 2025', 'All Subjects'],
  [11, 'Drawing Sheets', 21, 12, 'White', 'D', '11001', '11200', 'Annual Examination 2025', 'Drawing, Engineering Graphics']
]

const ws = xlsx.utils.aoa_to_sheet(data)
const wb = xlsx.utils.book_new()
xlsx.utils.book_append_sheet(wb, ws, 'Received Sheets')

// Save to client/public
const outputPath = path.join(__dirname, '../client/public/Answer_Sheets_Filled_Sample.xlsx')
xlsx.writeFile(wb, outputPath)

console.log('✅ Created filled sample template at:', outputPath)
console.log('📊 Contains 11 answer sheet types with sample data')
