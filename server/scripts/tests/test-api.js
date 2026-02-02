const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Subject = require('./src/models/Subject');

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

const testAPI = async () => {
  try {
    console.log('🧪 Testing subjects API...\n');
    
    // Connect to database
    await connectDB();
    
    // Test direct database query (simulating controller logic)
    console.log('📊 Direct Database Query:');
    const allSubjects = await Subject.find({ isActive: true })
      .select('_id name code class duration isActive')
      .sort('name')
      .lean();
    
    console.log(`Total subjects found: ${allSubjects.length}`);
    console.log('First 5 subjects:');
    allSubjects.slice(0, 5).forEach((subject, index) => {
      console.log(`  ${index + 1}. ${subject.name} (${subject.code}) - Class ${subject.class}`);
    });
    
    // Test with pagination (default limit = 10)
    console.log('\n📄 With Default Pagination (limit=10):');
    const paginatedSubjects = await Subject.find({ isActive: true })
      .select('_id name code class duration isActive')
      .sort('name')
      .limit(10)
      .lean();
    
    console.log(`Paginated subjects found: ${paginatedSubjects.length}`);
    paginatedSubjects.forEach((subject, index) => {
      console.log(`  ${index + 1}. ${subject.name} (${subject.code}) - Class ${subject.class}`);
    });
    
    // Test with high limit
    console.log('\n📄 With High Limit (limit=100):');
    const highLimitSubjects = await Subject.find({ isActive: true })
      .select('_id name code class duration isActive')
      .sort('name')
      .limit(100)
      .lean();
    
    console.log(`High limit subjects found: ${highLimitSubjects.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing API:', error);
    process.exit(1);
  }
};

// Run the test
testAPI();