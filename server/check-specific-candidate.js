require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Candidate = require('./src/models/Candidate');

async function checkCandidate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-management');
    console.log('Connected to MongoDB');

    const rollNumber = '17248921';
    console.log(`\n🔍 Searching for candidate with roll number: ${rollNumber}`);

    const candidate = await Candidate.findOne({ rollNumber: rollNumber });

    if (candidate) {
      console.log('\n✅ Candidate FOUND in database:');
      console.log(JSON.stringify(candidate, null, 2));
    } else {
      console.log('\n❌ Candidate NOT FOUND in database');
      
      // Check if there are any candidates with similar roll numbers
      const similarCandidates = await Candidate.find({
        rollNumber: { $regex: '17248', $options: 'i' }
      }).select('rollNumber name class');
      
      if (similarCandidates.length > 0) {
        console.log('\n📋 Found similar roll numbers:');
        similarCandidates.forEach(c => {
          console.log(`  - ${c.rollNumber}: ${c.name} (${c.class})`);
        });
      }
      
      // Check all class 10 candidates
      const class10Count = await Candidate.countDocuments({ class: '10th' });
      console.log(`\n📊 Total Class 10 candidates in database: ${class10Count}`);
      
      // Show first few class 10 candidates
      const class10Samples = await Candidate.find({ class: '10th' })
        .select('rollNumber name')
        .limit(5);
      console.log('\n📝 Sample Class 10 candidates:');
      class10Samples.forEach(c => {
        console.log(`  - ${c.rollNumber}: ${c.name}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCandidate();
