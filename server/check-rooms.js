const mongoose = require('mongoose');
require('dotenv').config();

const Room = require('./src/models/Room');

async function checkRooms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const rooms = await Room.find({});
    console.log(`\n📊 Found ${rooms.length} rooms:\n`);
    
    rooms.forEach((room, index) => {
      console.log(`${index + 1}. Room ${room.roomNo}`);
      console.log(`   - Name: ${room.roomName || 'N/A'}`);
      console.log(`   - Class: ${room.class || 'N/A'}`);
      console.log(`   - Floor: ${room.floor || 'N/A'}`);
      console.log(`   - Capacity: ${room.capacity}`);
      console.log(`   - Active: ${room.isActive}`);
      console.log('');
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRooms();
