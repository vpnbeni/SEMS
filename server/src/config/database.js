const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/examination_management_system';
    const dbName = process.env.DB_NAME || 'examination_management_system';

    if (!process.env.MONGODB_URI && !process.env.MONGO_URI && !process.env.DATABASE_URL) {
      console.log('MONGODB_URI not set. Falling back to local MongoDB at mongodb://127.0.0.1:27017'.yellow.bold);
    }

    const conn = await mongoose.connect(mongoUri, {
      // Remove deprecated options as they are now defaults in Mongoose 6+
      dbName
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

// Enable debugging in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

module.exports = connectDB;