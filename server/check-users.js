const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('./src/models/User');

async function checkUsers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to database');
    
    // Check if users exist
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await User.find({}, 'email role isActive');
      console.log('Users found:');
      users.forEach(user => {
        console.log(`- Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
      });
    } else {
      console.log('No users found in database. Database seeding may have failed.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
