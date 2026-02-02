require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('./src/models/Subject');

async function verifySubjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Check subjects with different answer sheets
    console.log('=== Subjects by Answer Sheet Type ===\n');
    
    const answerSheetTypes = ['32_pages', '20_pages', '40_graph', 'none'];
    
    for (const type of answerSheetTypes) {
      const count = await Subject.countDocuments({ answerSheet: type });
      console.log(`${type}: ${count} subjects`);
      
      if (count > 0 && count < 5) {
        const samples = await Subject.find({ answerSheet: type })
          .select('code name class answerSheet')
          .limit(3);
        samples.forEach(s => {
          console.log(`  - ${s.code} ${s.name} (${s.class})`);
        });
      }
    }
    
    // Check subjects with same code across classes
    console.log('\n=== Subjects with Same Code Across Classes ===\n');
    
    const allSubjects = await Subject.find().select('code name class').lean();
    const codeMap = new Map();
    
    allSubjects.forEach(s => {
      if (!codeMap.has(s.code)) {
        codeMap.set(s.code, []);
      }
      codeMap.get(s.code).push(s);
    });
    
    const multiClass = Array.from(codeMap.entries())
      .filter(([code, subjects]) => subjects.length > 1);
    
    console.log(`Found ${multiClass.length} codes used in multiple classes:\n`);
    
    multiClass.forEach(([code, subjects]) => {
      console.log(`Code ${code}:`);
      subjects.forEach(s => {
        console.log(`  - ${s.name} (${s.class})`);
      });
      console.log();
    });
    
    // Check duration distribution
    console.log('=== Duration Distribution ===\n');
    const duration2 = await Subject.countDocuments({ duration: 2 });
    const duration3 = await Subject.countDocuments({ duration: 3 });
    console.log(`2 hours: ${duration2} subjects`);
    console.log(`3 hours: ${duration3} subjects`);
    
    // Sample subjects from each class
    console.log('\n=== Sample Subjects ===\n');
    
    console.log('Class 10th (first 5):');
    const class10 = await Subject.find({ class: '10th' })
      .select('code name duration answerSheet')
      .limit(5);
    class10.forEach(s => {
      console.log(`  ${s.code} - ${s.name} (${s.duration}h, ${s.answerSheet})`);
    });
    
    console.log('\nClass 12th (first 5):');
    const class12 = await Subject.find({ class: '12th' })
      .select('code name duration answerSheet')
      .limit(5);
    class12.forEach(s => {
      console.log(`  ${s.code} - ${s.name} (${s.duration}h, ${s.answerSheet})`);
    });
    
    await mongoose.connection.close();
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifySubjects();
