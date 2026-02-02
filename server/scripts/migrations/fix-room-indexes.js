const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('rooms');

    // Drop all indexes except _id
    console.log('🗑️  Dropping all indexes...');
    await collection.dropIndexes();
    console.log('✅ Indexes dropped');

    // Delete all rooms
    console.log('🗑️  Deleting all rooms...');
    await collection.deleteMany({});
    console.log('✅ Rooms deleted');

    await mongoose.connection.close();
    console.log('✅ Done! Now run update-rooms.js');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixIndexes();
