const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const checkServerDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔌 Connecting to:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    console.log('📁 Database name:', dbName);

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📚 Collections:');
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`   ${col.name}: ${count} documents`);
    }

    // Check subjects specifically
    const Subject = require('./src/models/Subject');
    const subjects = await Subject.find({}).limit(5);
    console.log(`\n🔍 First 5 subjects:`);
    if (subjects.length === 0) {
      console.log('   (none)');
    } else {
      subjects.forEach(s => console.log(`   - ${s.name} (${s.code})`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
};

checkServerDatabase();
