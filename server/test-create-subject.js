const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const testCreate = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');

    const Subject = require('./src/models/Subject');

    // Check before
    const before = await Subject.find({});
    console.log(`📊 Subjects before: ${before.length}`);

    // Try to create a test subject
    console.log('\n🧪 Creating test subject...');
    const testSubject = {
      name: 'Test Subject',
      code: 'TEST01',
      class: '10th',
      duration: 3
    };

    const created = await Subject.create(testSubject);
    console.log(`✅ Created: ${created.name} (${created.code})`);

    // Check after
    const after = await Subject.find({});
    console.log(`\n📊 Subjects after: ${after.length}`);
    after.forEach(s => console.log(`  - ${s.name} (${s.code})`));

    // Try to create duplicate
    console.log('\n🧪 Trying to create duplicate...');
    try {
      await Subject.create(testSubject);
      console.log('❌ Should have failed but succeeded!');
    } catch (err) {
      console.log(`✅ Correctly rejected: ${err.message}`);
    }

    // Clean up
    console.log('\n🗑️  Cleaning up...');
    await Subject.deleteMany({});
    console.log('✅ Cleaned');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

testCreate();
