const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const showAll = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const Subject = require('./src/models/Subject');

    const all = await Subject.find({}).sort({ createdAt: -1 });
    
    console.log(`\n📊 Total subjects: ${all.length}\n`);
    
    if (all.length > 0) {
      console.log('All subjects (newest first):');
      all.forEach((s, i) => {
        const created = s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A';
        console.log(`\n${i+1}. ${s.name}`);
        console.log(`   Code: ${s.code}`);
        console.log(`   Class: ${s.class}`);
        console.log(`   Active: ${s.isActive}`);
        console.log(`   Created: ${created}`);
        console.log(`   ID: ${s._id}`);
      });
      
      console.log('\n\n🗑️  Delete all? (Running deletion in 2 seconds...)');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await Subject.deleteMany({});
      console.log(`\n✅ Deleted ${result.deletedCount} subjects`);
    } else {
      console.log('✅ No subjects in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

showAll();
