const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, '../client/src/public/CBSE Subjects.pdf');

async function parseSubjectsPDF() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    console.log('=== PDF TEXT CONTENT ===\n');
    console.log(data.text);
    console.log('\n=== END OF PDF ===');
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
  }
}

parseSubjectsPDF();
