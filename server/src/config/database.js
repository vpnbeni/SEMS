const mongoose = require('mongoose');
const dns = require('dns');
const colors = require('colors');

// Configure DNS resolver to handle slow DNS responses on Windows
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); // Use Google and Cloudflare DNS
// If connection still fails with querySrv ECONNREFUSED, use the standard (non-SRV) URI in .env:
// mongodb://USER:PASS@cluster0.agz3j.mongodb.net:27017/examination_management_system?ssl=true&authSource=admin

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/examination_management_system';
    const dbName = process.env.DB_NAME || 'examination_management_system';

    if (!process.env.MONGODB_URI && !process.env.MONGO_URI && !process.env.DATABASE_URL) {
      console.log('MONGODB_URI not set. Falling back to local MongoDB at mongodb://127.0.0.1:27017'.yellow.bold);
    }

    const conn = await mongoose.connect(mongoUri, {
      // Remove deprecated options as they are now defaults in Mongoose 6+
      dbName,
      serverSelectionTimeoutMS: 30000, // Timeout after 30s to handle slow DNS/network
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);

    // Log database name
    console.log(`Database: ${conn.connection.name}`.magenta.bold);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`Database connection error: ${err}`.red.bold);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Database disconnected'.yellow.bold);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('Database reconnected'.green.bold);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Database connection closed through app termination'.yellow.bold);
      process.exit(0);
    });

  } catch (error) {
    console.error(`Database connection failed: ${error.message}`.red.bold);

    // Exit process with failure
    process.exit(1);
  }
};

// Set mongoose options
mongoose.set('strictQuery', true);

// Enable debugging in development (optional - set MONGOOSE_DEBUG=true to enable)
// This logs all Mongoose operations including index creation
if (process.env.NODE_ENV === 'development' && process.env.MONGOOSE_DEBUG === 'true') {
  mongoose.set('debug', true);
}

module.exports = connectDB;