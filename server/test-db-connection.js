require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('Using URI:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
  .then((conn) => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection Failed:', error.message);
    process.exit(1);
  });
