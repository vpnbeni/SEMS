const mongoose = require('mongoose');
require('dotenv').config();

const Room = require('./src/models/Room');

async function updateRooms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete old rooms
    await Room.deleteMany({});
    console.log('🗑️  Deleted old rooms');

    // Create 14 new rooms with proper structure
    const roomNames = [
      'Rose', 'Tulip', 'Lotus', 'Lily', 'Jasmine', 'Marigold', 'Sunflower',
      'Orchid', 'Dahlia', 'Hibiscus', 'Peony', 'Daffodil', 'Iris', 'Poppy'
    ];

    const rooms = [];
    for (let i = 0; i < 14; i++) {
      const roomNo = String(i + 1).padStart(2, '0');
      const floor = i < 4 ? 'First Floor' : i < 8 ? 'Second Floor' : 'Third Floor';
      
      rooms.push({
        roomNo: roomNo,
        roomName: roomNames[i],
        floor: floor,
        capacity: 24,
        isActive: true
      });
    }

    const created = await Room.insertMany(rooms);
    console.log(`\n✅ Created ${created.length} rooms:\n`);
    
    created.forEach((room, index) => {
      console.log(`${index + 1}. Room ${room.roomNo} - ${room.roomName}`);
      console.log(`   Floor: ${room.floor}, Capacity: ${room.capacity}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateRooms();
