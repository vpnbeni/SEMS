const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const permanentDeleteAll = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const Subject = require('./src/models/Subject');

    // Get ALL subjects (active and inactive)
    const allSubjects = await Subject.find({});
    console.log(`📊 Total subjects (active + inactive): ${allSubjects.length}\n`);

    if (allSubjects.length > 0) {
      console.log('Subjects to be PERMANENTLY deleted:');
      allSubjects.forEach((s, i) => {
        const status = s.isActive ? '✅ Active' : '❌ Inactive';
        console.log(`  ${i+1}. ${s.name} (${s.code}) - ${s.class} - ${status}`);
      });

      console.log('\n🗑️  PERMANENTLY DELETING ALL SUBJECTS...');
      
      // HARD DELETE - completely remove from database
      const result = await Subject.deleteMany({});
      console.log(`✅ Permanently deleted ${result.deletedCount} subjects\n`);

      // Verify deletion
      const remaining = await Subject.countDocuments({});
      if (remaining === 0) {
        console.log('✅ SUCCESS - All subjects permanently deleted!');
        console.log('📝 You can now add new subjects without conflicts.');
      } else {
        console.log(`⚠️  WARNING - ${remaining} subjects still remain!`);
      }
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

console.log('═══════════════════════════════════════════════');
console.log('  PERMANENT DELETE ALL SUBJECTS (HARD DELETE)  ');
console.log('═══════════════════════════════════════════════\n');
permanentDeleteAll();
