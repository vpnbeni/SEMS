const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const checkAndDelete = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const Subject = require('./src/models/Subject');

    // Get ALL subjects
    const all = await Subject.find({});
    console.log(`📊 Total subjects: ${all.length}\n`);

    if (all.length > 0) {
      console.log('Found subjects:');
      all.forEach((s, i) => {
        console.log(`${i+1}. "${s.name}" - Code: "${s.code}" - Class: "${s.class}" - Active: ${s.isActive}`);
      });

      console.log('\n🗑️  DELETING ALL...');
      const result = await Subject.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} subjects`);
    } else {
      console.log('No subjects found');
    }

    // Double check
    const remaining = await Subject.countDocuments({});
    console.log(`\n📊 Final count: ${remaining}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

checkAndDelete();
