const mongoose = require('mongoose');
const colors = require('colors');
require('dotenv').config({ path: './server/.env' });

const connectDB = require('./src/config/database');
const seedStudents = require('./src/seeders/studentSeeder');

const runStudentSeeder = async () => {
  try {
    // Connect to database
    console.log('Connecting to database...'.yellow);
    await connectDB();
    console.log('Database connected'.green);
    
    // Run student seeder
    await seedStudents();
    
    console.log('\n✓ Student seeding completed successfully!'.green.bold);
    process.exit(0);
  } catch (error) {
    console.error('Error running student seeder:'.red, error);
    process.exit(1);
  }
};

runStudentSeeder();
