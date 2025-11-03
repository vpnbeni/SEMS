const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const forceDeleteSubjects = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const Subject = require('./src/models/Subject');

    // Delete ALL subjects - no filter
    console.log('🗑️  Force deleting ALL subjects...');
    const result = await Subject.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} subjects\n`);

    // Verify
    const count = await Subject.countDocuments({});
    console.log(`📊 Remaining subjects: ${count}`);

    if (count === 0) {
      console.log('✅ SUCCESS - All subjects deleted!');
    } else {
      console.log('⚠️  WARNING - Some subjects still remain!');
      const remaining = await Subject.find({});
      remaining.forEach(s => console.log(`  - ${s.name} (${s.code})`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
};

forceDeleteSubjects();
