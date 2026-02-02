const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const finalCheck = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔌 Connecting...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const Subject = require('./src/models/Subject');

    // Check current state
    const beforeCount = await Subject.countDocuments({});
    console.log(`📊 Subjects BEFORE deletion: ${beforeCount}`);

    if (beforeCount > 0) {
      const subjects = await Subject.find({}).limit(10);
      console.log('\nSubjects found:');
      subjects.forEach((s, i) => console.log(`  ${i+1}. ${s.name} (${s.code}) - ${s.class}`));
      
      console.log('\n🗑️  DELETING ALL SUBJECTS NOW...');
      const result = await Subject.deleteMany({});
      console.log(`✅ Deleted: ${result.deletedCount}`);
    }

    // Verify deletion
    const afterCount = await Subject.countDocuments({});
    console.log(`\n📊 Subjects AFTER deletion: ${afterCount}`);

    if (afterCount === 0) {
      console.log('✅ SUCCESS - Database is now empty!');
      console.log('\n⚠️  IMPORTANT: You MUST restart the server for changes to take effect!');
      console.log('   Run: npm run dev (or restart your current server process)');
    } else {
      console.log('❌ FAILED - Subjects still exist!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
};

console.log('═══════════════════════════════════════');
console.log('  FINAL CHECK AND DELETE ALL SUBJECTS  ');
console.log('═══════════════════════════════════════\n');
finalCheck();
