const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const detailedCheck = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔌 Connecting...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const Subject = require('./src/models/Subject');

    // Get ALL subjects without any filter
    const allSubjects = await Subject.find({}).lean();
    console.log(`📊 Total subjects in database: ${allSubjects.length}\n`);

    if (allSubjects.length > 0) {
      console.log('All subjects found:');
      allSubjects.forEach((s, i) => {
        console.log(`${i+1}. Name: "${s.name}", Code: "${s.code}", Class: "${s.class}", Active: ${s.isActive}`);
      });

      console.log('\n🗑️  Do you want to delete these? (This script will delete them)');
      console.log('Deleting in 2 seconds...\n');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await Subject.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} subjects`);
      
      // Verify
      const remaining = await Subject.countDocuments({});
      console.log(`📊 Remaining: ${remaining}`);
    } else {
      console.log('✅ No subjects found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
};

detailedCheck();
