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

const verifySubjects = async () => {
  try {
    console.log('🔍 Verifying CBSE subjects in database...\n');
    
    // Connect to database
    await connectDB();
    
    // Get all subjects grouped by class
    const class10Subjects = await Subject.find({ class: '10th' }).sort({ name: 1 });
    const class12Subjects = await Subject.find({ class: '12th' }).sort({ name: 1 });
    
    console.log('📚 CLASS 10 SUBJECTS:');
    console.log('=====================');
    class10Subjects.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.name} (Code: ${subject.code})`);
    });
    
    console.log('\n📚 CLASS 12 SUBJECTS:');
    console.log('=====================');
    class12Subjects.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.name} (Code: ${subject.code})`);
    });
    
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`Total Class 10 subjects: ${class10Subjects.length}`);
    console.log(`Total Class 12 subjects: ${class12Subjects.length}`);
    console.log(`Total subjects: ${class10Subjects.length + class12Subjects.length}`);
    
    // Group Class 12 subjects by stream
    const scienceSubjects = class12Subjects.filter(s => 
      ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'].includes(s.name)
    );
    const commerceSubjects = class12Subjects.filter(s => 
      ['Accountancy', 'Business Studies', 'Economics'].includes(s.name)
    );
    const artsSubjects = class12Subjects.filter(s => 
      ['History', 'Geography', 'Political Science', 'Psychology', 'Sociology'].includes(s.name)
    );
    const languageSubjects = class12Subjects.filter(s => 
      s.name.includes('English') || s.name.includes('Hindi') || s.name.includes('Sanskrit')
    );
    
    console.log(`\n📈 CLASS 12 BY STREAM:`);
    console.log(`Science Stream: ${scienceSubjects.length} subjects`);
    console.log(`Commerce Stream: ${commerceSubjects.length} subjects`);
    console.log(`Arts/Humanities: ${artsSubjects.length} subjects`);
    console.log(`Languages: ${languageSubjects.length} subjects`);
    console.log(`Additional/Vocational: ${class12Subjects.length - scienceSubjects.length - commerceSubjects.length - artsSubjects.length - languageSubjects.length} subjects`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying subjects:', error);
    process.exit(1);
  }
};

// Run the verification
verifySubjects();