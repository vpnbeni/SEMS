const mongoose = require('mongoose');
require('dotenv').config();
const Form66 = require('./src/models/Form66');

// Paste your Form 66 content here between the backticks
const form66Content = `
PASTE YOUR FORM 66 TEXT HERE
`;

async function importForm66() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const lines = form66Content.split('\n');
    const records = [];
    let currentExam = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Look for centre
      const centreMatch = trimmed.match(/CENTRE\s*[-:]\s*(\d+)\s+(.+)/i);
      if (centreMatch) {
        console.log(`📍 Centre: ${centreMatch[1]} - ${centreMatch[2]}`);
        currentExam = {
          centreNo: centreMatch[1],
          centreName: centreMatch[2].trim(),
          rollNumbers: []
        };
        continue;
      }

      // Look for date and subject
      const dateMatch = trimmed.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d+)\s+(.+)/);
      if (dateMatch && currentExam) {
        currentExam.examDate = dateMatch[1];
        currentExam.subjectCode = dateMatch[2];
        currentExam.subject = dateMatch[3].trim();
        console.log(`📅 Exam: ${currentExam.examDate} - ${currentExam.subjectCode} ${currentExam.subject}`);
        continue;
      }

      // Look for roll ranges
      const rollMatch = trimmed.match(/(\d{7,8})-(\d{7,8})\s+(\d+)/);
      if (rollMatch && currentExam) {
        const start = parseInt(rollMatch[1]);
        const end = parseInt(rollMatch[2]);
        const count = parseInt(rollMatch[3]);
        
        console.log(`   📝 Roll range: ${start}-${end} (${count} students)`);
        
        let added = 0;
        for (let roll = start; roll <= end && added < count; roll++) {
          currentExam.rollNumbers.push(roll.toString());
          added++;
        }
      }

      // Look for subject total (end of section)
      if (trimmed.includes('SUBJECT TOTAL') && currentExam && currentExam.rollNumbers.length > 0) {
        console.log(`✅ Total: ${currentExam.rollNumbers.length} roll numbers\n`);
        
        // Create records
        currentExam.rollNumbers.forEach(rollNo => {
          records.push({
            rollNo: rollNo,
            centreNo: currentExam.centreNo,
            centreName: currentExam.centreName,
            examDate: currentExam.examDate,
            subjectCode: currentExam.subjectCode,
            subject: currentExam.subject,
            class: parseInt(currentExam.subjectCode) < 100 ? 'X' : 'XII',
            candidateName: '',
            subjects: [{
              code: currentExam.subjectCode,
              name: currentExam.subject
            }]
          });
        });
        
        currentExam = null;
      }
    }

    if (records.length === 0) {
      console.log('❌ No records parsed. Please check the format.');
      process.exit(1);
    }

    console.log(`\n💾 Saving ${records.length} records to database...`);
    await Form66.insertMany(records);
    console.log('✅ Successfully imported Form 66 data!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

importForm66();
