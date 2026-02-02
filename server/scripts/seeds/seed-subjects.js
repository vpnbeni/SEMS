const mongoose = require('mongoose');
const dotenv = require('dotenv');
const seedSubjects = require('./src/seeders/subjectSeeder');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const runSeeder = async () => {
  try {
    console.log('🌱 Starting CBSE subjects seeding...');
    
    // Connect to database
    await connectDB();
    
    // Run the seeder
    await seedSubjects();
    
    console.log('✅ CBSE subjects seeded successfully!');
    console.log('📚 Added subjects for Class 10 and Class 12 with proper CBSE codes');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Run the seeder
runSeeder();