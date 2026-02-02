const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function debugPdfText() {
  try {
    const possiblePaths = [
      path.join(__dirname, '../client/src/public/Centre List of Candidates 10th.pdf'),
      path.join(__dirname, '../client/public/Centre List of Candidates 10th.pdf'),
      path.join(__dirname, 'Centre List of Candidates 10th.pdf')
    ];

    let pdfPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        pdfPath = testPath;
        break;
      }
    }

    if (!pdfPath) {
      console.error('PDF file not found');
      return;
    }

    console.log('Found PDF at:', pdfPath);
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    const lines = pdfData.text.split('\n');
    
    console.log('\n--- Lines 20-60 (showing structure around first candidate) ---\n');
    for (let i = 20; i < Math.min(60, lines.length); i++) {
      console.log(`${i}: "${lines[i]}"`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPdfText();
