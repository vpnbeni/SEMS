/**
 * Generate a sample datesheet text file that can be converted to PDF
 * This creates a valid format that the parser can read
 */

const fs = require('fs');
const path = require('path');

const sampleDatesheet = `EXAMINATION SCHEDULE - CLASS 12
BOARD EXAMINATION 2026

TUESDAY 17TH FEBRUARY, 2026
09:00 AM - 12:00 PM 041 MATHEMATICS STANDARD
02:00 PM - 05:00 PM 042 PHYSICS

WEDNESDAY 18TH FEBRUARY, 2026
09:00 AM - 12:00 PM 043 CHEMISTRY
02:00 PM - 05:00 PM 044 BIOLOGY

THURSDAY 19TH FEBRUARY, 2026
09:00 AM - 12:00 PM 045 ENGLISH CORE
02:00 PM - 05:00 PM 046 COMPUTER SCIENCE

FRIDAY 20TH FEBRUARY, 2026
09:00 AM - 12:00 PM 047 PHYSICAL EDUCATION
02:00 PM - 05:00 PM 048 ECONOMICS

MONDAY 24TH FEBRUARY, 2026
09:00 AM - 12:00 PM 049 BUSINESS STUDIES
02:00 PM - 05:00 PM 050 ACCOUNTANCY

TUESDAY 25TH FEBRUARY, 2026
09:00 AM - 12:00 PM 051 HISTORY
02:00 PM - 05:00 PM 052 GEOGRAPHY

WEDNESDAY 26TH FEBRUARY, 2026
09:00 AM - 12:00 PM 053 POLITICAL SCIENCE
02:00 PM - 05:00 PM 054 PSYCHOLOGY

THURSDAY 27TH FEBRUARY, 2026
09:00 AM - 12:00 PM 055 SOCIOLOGY
02:00 PM - 05:00 PM 056 HINDI CORE

FRIDAY 28TH FEBRUARY, 2026
09:00 AM - 12:00 PM 057 SANSKRIT
02:00 PM - 05:00 PM 058 FINE ARTS

---
IMPORTANT INSTRUCTIONS:
1. Students must report 30 minutes before exam time
2. Bring admit card and valid ID proof
3. No electronic devices allowed in examination hall
4. Use only blue/black pen for writing
`;

const outputPath = path.join(__dirname, 'sample-datesheet.txt');

fs.writeFileSync(outputPath, sampleDatesheet, 'utf8');

console.log('✅ Sample datesheet created successfully!');
console.log('📄 File location:', outputPath);
console.log('\n📝 Next steps:');
console.log('1. Open sample-datesheet.txt in any text editor');
console.log('2. Save/Export as PDF (File → Save As → PDF)');
console.log('3. Upload the PDF to test the import feature');
console.log('\n🧪 Or test parsing directly:');
console.log('   node debug-datesheet-pdf.js sample-datesheet.pdf');
console.log('\n💡 Tip: You can modify the text file and regenerate the PDF');
