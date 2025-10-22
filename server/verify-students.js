const mongoose = require('mongoose');
const colors = require('colors');
require('dotenv').config({ path: './server/.env' });

const connectDB = require('./src/config/database');
const Student = require('./src/models/Student');

const verifyStudents = async () => {
  try {
    await connectDB();
    
    const totalStudents = await Student.countDocuments();
    const class10Count = await Student.countDocuments({ class: '10th' });
    const class12Count = await Student.countDocuments({ class: '12th' });
    
    console.log('\n=== Student Database Summary ==='.cyan.bold);
    console.log(`Total Students: ${totalStudents}`.green);
    console.log(`Class 10: ${class10Count}`.green);
    console.log(`Class 12: ${class12Count}`.green);
    
    // Get section breakdown
    const sections = await Student.aggregate([
      {
        $group: {
          _id: { class: '$class', section: '$section' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.class': 1, '_id.section': 1 } }
    ]);
    
    console.log('\n=== Section Breakdown ==='.cyan.bold);
    sections.forEach(s => {
      console.log(`${s._id.class} - Section ${s._id.section}: ${s.count} students`.yellow);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyStudents();
