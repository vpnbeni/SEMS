const pdf = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const form66Parser = require('./src/utils/form66Parser');

async function testForm66PDF() {
  try {
    console.log('🧪 Testing Form 66 PDF parsing...\n');
    
    // Check if sample PDF exists
    const pdfPath = path.join(__dirname, 'sample-form66.pdf');
    
    try {
      await fs.access(pdfPath);
    } catch (error) {
      console.log('❌ Sample PDF not found at:', pdfPath);
      console.log('📝 Please place a Form 66 PDF file at the above location and try again.');
      return;
    }
    
    // Read and parse PDF
    console.log('📖 Reading PDF file...');
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    console.log(`✅ PDF parsed successfully`);
    console.log(`📄 Total pages: ${pdfData.numpages}`);
    console.log(`📝 Text length: ${pdfData.text.length} characters\n`);
    
    // Show first 500 characters of extracted text
    console.log('📋 First 500 characters of extracted text:');
    console.log('─'.repeat(80));
    console.log(pdfData.text.substring(0, 500));
    console.log('─'.repeat(80));
    console.log();
    
    // Parse the extracted text
    console.log('🔍 Parsing Form 66 data...');
    const records = form66Parser.parseTextFile(pdfData.text);
    
    console.log(`\n✅ Successfully parsed ${records.length} records\n`);
    
    if (records.length > 0) {
      console.log('📊 Sample records:');
      console.log('─'.repeat(80));
      records.slice(0, 5).forEach((record, index) => {
        console.log(`${index + 1}. Roll No: ${record.rollNo}`);
        console.log(`   Centre: ${record.centreNo} - ${record.centreName}`);
        console.log(`   Date: ${record.examDate}`);
        console.log(`   Subject: ${record.subjectCode} - ${record.subject}`);
        console.log(`   Class: ${record.class}`);
        console.log();
      });
      
      if (records.length > 5) {
        console.log(`... and ${records.length - 5} more records`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

testForm66PDF();
