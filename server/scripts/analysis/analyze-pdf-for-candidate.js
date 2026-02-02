require('dotenv').config({ path: './server/.env' });
const pdfParse = require('pdf-parse');
const fs = require('fs');

async function analyzePDF() {
  try {
    const pdfPath = './client/src/public/Centre List of Candidates 10th.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF file not found at:', pdfPath);
      return;
    }

    console.log('📄 Reading PDF...');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    const lines = pdfData.text.split('\n').map(line => line.trim());

    console.log('\n🔍 Searching for candidate 17248921...\n');

    // Find the candidate and show surrounding lines
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('17248921')) {
        console.log('✅ Found at line', i);
        console.log('\n📋 Context (20 lines before and after):\n');
        
        const start = Math.max(0, i - 20);
        const end = Math.min(lines.length, i + 30);
        
        for (let j = start; j < end; j++) {
          const marker = j === i ? '>>> ' : '    ';
          console.log(`${marker}[${j}] ${lines[j]}`);
        }
        
        break;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzePDF();
