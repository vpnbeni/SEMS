const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const checkCode = async (code) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const Subject = require('./src/models/Subject');

    // Check for this specific code
    const subject = await Subject.findOne({ code: code });
    
    if (subject) {
      console.log(`❌ Subject with code "${code}" EXISTS:`);
      console.log(`   Name: ${subject.name}`);
      console.log(`   Class: ${subject.class}`);
      console.log(`   Active: ${subject.isActive}`);
      console.log(`   ID: ${subject._id}`);
      
      console.log('\n🗑️  Deleting this subject...');
      await Subject.deleteOne({ _id: subject._id });
      console.log('✅ Deleted!');
    } else {
      console.log(`✅ No subject found with code "${code}"`);
      console.log('   You can safely create a subject with this code.');
    }

    // Show all subjects
    const all = await Subject.find({});
    console.log(`\n📊 Total subjects in database: ${all.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

const code = process.argv[2] || '044';
console.log(`Checking for subject code: ${code}\n`);
checkCode(code);
