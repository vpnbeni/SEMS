require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');
const Subject = require('./src/models/Subject');

// Helper function to parse answer sheet format
const parseAnswerSheet = (text) => {
  if (!text) return 'none';
  const normalized = text.toLowerCase().trim();
  if (normalized.includes('32')) return '32_pages';
  if (normalized.includes('20')) return '20_pages';
  if (normalized.includes('40') && normalized.includes('graph')) return '40_graph';
  return 'none';
};

// Helper function to extract subjects from CBSE PDF format
const extractSubjectsFromCBSEPDF = (text) => {
  const subjects = [];
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Pattern: SubCode | SubjectName | Class | Duration(Hours) | AnswerSheet
  // Example: 002HINDI COURSE - A10th332 Pages
  // Format: CODE(3 digits) + NAME + CLASS(10th/12th) + DURATION(1 digit) + REST(answer sheet info)
  const subjectPattern = /^(\d{3})(.+?)(10th|12th)(\d)(.+)$/;
  
  for (const line of lines) {
    // Skip header lines
    if (line.includes('SubCode') || line.includes('SubjectName')) continue;
    
    const match = line.match(subjectPattern);
    if (match) {
      const code = match[1];
      const name = match[2].trim();
      const studentClass = match[3];
      const duration = parseInt(match[4]);
      const answerSheetText = match[5]; // This contains "32 Pages", "20 Pages", etc.
      
      subjects.push({
        code,
        name,
        class: studentClass,
        duration,
        answerSheet: parseAnswerSheet(answerSheetText),
        isActive: true
      });
    }
  }
  
  return subjects;
};

async function testImport() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Read PDF
    const pdfPath = path.join(__dirname, '../client/src/public/CBSE Subjects.pdf');
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log('\n=== Extracting subjects from PDF ===');
    const subjects = extractSubjectsFromCBSEPDF(pdfData.text);
    
    console.log(`\nFound ${subjects.length} subjects`);
    console.log('\nFirst 5 subjects:');
    subjects.slice(0, 5).forEach(s => {
      console.log(`  ${s.code} - ${s.name} (${s.class}) - ${s.duration}h - ${s.answerSheet}`);
    });
    
    console.log('\n=== Checking for duplicates ===');
    const codeClassMap = new Map();
    const duplicates = [];
    
    subjects.forEach(s => {
      const key = `${s.code}-${s.class}`;
      if (codeClassMap.has(key)) {
        duplicates.push(s);
      } else {
        codeClassMap.set(key, s);
      }
    });
    
    console.log(`Duplicates found: ${duplicates.length}`);
    
    console.log('\n=== Checking same codes across classes ===');
    const codeMap = new Map();
    subjects.forEach(s => {
      if (!codeMap.has(s.code)) {
        codeMap.set(s.code, []);
      }
      codeMap.get(s.code).push(s.class);
    });
    
    const sameCodes = Array.from(codeMap.entries())
      .filter(([code, classes]) => classes.length > 1);
    
    console.log(`Subjects with same code in different classes: ${sameCodes.length}`);
    sameCodes.slice(0, 5).forEach(([code, classes]) => {
      const subjs = subjects.filter(s => s.code === code);
      console.log(`  Code ${code}:`);
      subjs.forEach(s => console.log(`    - ${s.name} (${s.class})`));
    });
    
    console.log('\n=== Importing to database ===');
    const inserted = [];
    const updated = [];
    const errors = [];
    
    for (const subjectData of subjects) {
      try {
        const existing = await Subject.findOne({ 
          code: subjectData.code, 
          class: subjectData.class 
        });
        
        if (existing) {
          existing.name = subjectData.name;
          existing.duration = subjectData.duration;
          existing.answerSheet = subjectData.answerSheet;
          await existing.save();
          updated.push({ code: subjectData.code, class: subjectData.class });
        } else {
          await Subject.create(subjectData);
          inserted.push({ code: subjectData.code, class: subjectData.class });
        }
      } catch (error) {
        errors.push({ 
          code: subjectData.code, 
          class: subjectData.class,
          error: error.message 
        });
      }
    }
    
    console.log(`\nInserted: ${inserted.length}`);
    console.log(`Updated: ${updated.length}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.slice(0, 5).forEach(e => {
        console.log(`  ${e.code} (${e.class}): ${e.error}`);
      });
    }
    
    // Verify database state
    console.log('\n=== Database verification ===');
    const total = await Subject.countDocuments();
    const class10 = await Subject.countDocuments({ class: '10th' });
    const class12 = await Subject.countDocuments({ class: '12th' });
    
    console.log(`Total subjects in DB: ${total}`);
    console.log(`Class 10th: ${class10}`);
    console.log(`Class 12th: ${class12}`);
    
    await mongoose.connection.close();
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testImport();
