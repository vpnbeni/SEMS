require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Subject = require('./src/models/Subject');
const CBSEDatesheet = require('./src/models/CBSEDatesheet');

async function syncSubjectsToDatesheet() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-management');
    console.log('✅ Connected to MongoDB\n');

    // Get all active subjects
    const subjects = await Subject.find({ isActive: true });
    console.log(`📚 Found ${subjects.length} active subjects\n`);

    // Get active datesheet
    const datesheet = await CBSEDatesheet.findOne({ isActive: true });
    
    if (!datesheet) {
      console.log('❌ No active CBSE datesheet found');
      await mongoose.connection.close();
      return;
    }

    console.log(`📅 Found active datesheet with ${datesheet.entries.length} entries\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    // Create a map of subjects by code-class combination
    const subjectMap = new Map();
    subjects.forEach(subject => {
      const key = `${subject.code}-${subject.class}`;
      subjectMap.set(key, subject);
    });

    // Update each datesheet entry
    for (let i = 0; i < datesheet.entries.length; i++) {
      const entry = datesheet.entries[i];
      const key = `${entry.subject.code}-${entry.subject.class}`;
      const masterSubject = subjectMap.get(key);

      if (masterSubject) {
        // Check if update is needed
        if (entry.subject.name !== masterSubject.name || 
            entry.subject.duration !== masterSubject.duration) {
          
          console.log(`🔄 Updating entry ${i + 1}:`);
          console.log(`   Code: ${entry.subject.code} (${entry.subject.class})`);
          console.log(`   Old name: "${entry.subject.name}" → New name: "${masterSubject.name}"`);
          console.log(`   Old duration: ${entry.subject.duration} → New duration: ${masterSubject.duration}`);
          
          entry.subject.name = masterSubject.name;
          entry.subject.duration = masterSubject.duration;
          updatedCount++;
        }
      } else {
        console.log(`⚠️  Subject not found in master data: ${entry.subject.code} (${entry.subject.class})`);
        notFoundCount++;
      }
    }

    if (updatedCount > 0) {
      await datesheet.save();
      console.log(`\n✅ Successfully updated ${updatedCount} datesheet entries`);
    } else {
      console.log('\n✅ All datesheet entries are already up to date');
    }

    if (notFoundCount > 0) {
      console.log(`⚠️  ${notFoundCount} entries reference subjects not found in master data`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncSubjectsToDatesheet();
