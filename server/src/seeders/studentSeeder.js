const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { STUDENT_CLASSES, STUDENT_SECTIONS } = require('../utils/constants');

const seedStudents = async () => {
  try {
    console.log('Starting student seeding...'.cyan);
    
    // Get all subjects
    const subjects = await Subject.find();
    if (subjects.length === 0) {
      console.log('No subjects found. Please seed subjects first.'.yellow);
      return;
    }
    
    const class10Subjects = subjects.filter(s => s.class === STUDENT_CLASSES.CLASS_10).map(s => s._id);
    const class12Subjects = subjects.filter(s => s.class === STUDENT_CLASSES.CLASS_12).map(s => s._id);
    
    const students = [];
    
    // Generate Class 10 students (4 sections: A, B, C, D with 30 students each)
    for (let section of STUDENT_SECTIONS.slice(0, 4)) {
      for (let i = 1; i <= 30; i++) {
        const rollNumber = `10${section}${String(i).padStart(3, '0')}`;
        students.push({
          rollNumber,
          name: `Student ${rollNumber}`,
          email: `${rollNumber.toLowerCase()}@student.edu`,
          phone: `8${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          class: STUDENT_CLASSES.CLASS_10,
          section,
          subjects: class10Subjects,
          fatherName: `Father of ${rollNumber}`,
          motherName: `Mother of ${rollNumber}`,
          guardianPhone: `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          address: {
            street: `${i} Student Street, Section ${section}`,
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001'
          },
          dateOfBirth: new Date(2008, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          admissionDate: new Date(2023, 3, 1),
          category: ['General', 'OBC', 'SC', 'ST', 'EWS'][Math.floor(Math.random() * 5)],
          religion: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist'][Math.floor(Math.random() * 5)],
          nationality: 'Indian',
          medicalInfo: {
            bloodGroup: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'][Math.floor(Math.random() * 8)]
          },
          isActive: true
        });
      }
    }
    
    // Generate Class 12 students (3 sections: A, B, C with 35 students each)
    for (let section of STUDENT_SECTIONS.slice(0, 3)) {
      for (let i = 1; i <= 35; i++) {
        const rollNumber = `12${section}${String(i).padStart(3, '0')}`;
        students.push({
          rollNumber,
          name: `Student ${rollNumber}`,
          email: `${rollNumber.toLowerCase()}@student.edu`,
          phone: `7${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          class: STUDENT_CLASSES.CLASS_12,
          section,
          subjects: class12Subjects.slice(0, 5), // First 5 subjects
          fatherName: `Father of ${rollNumber}`,
          motherName: `Mother of ${rollNumber}`,
          guardianPhone: `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          address: {
            street: `${i} Student Street, Section ${section}`,
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001'
          },
          dateOfBirth: new Date(2006, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          admissionDate: new Date(2021, 3, 1),
          category: ['General', 'OBC', 'SC', 'ST', 'EWS'][Math.floor(Math.random() * 5)],
          religion: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist'][Math.floor(Math.random() * 5)],
          nationality: 'Indian',
          medicalInfo: {
            bloodGroup: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'][Math.floor(Math.random() * 8)]
          },
          isActive: true
        });
      }
    }
    
    // Delete existing students
    await Student.deleteMany({});
    console.log('Existing students deleted'.yellow);
    
    // Insert new students
    const createdStudents = await Student.insertMany(students);
    console.log(`✓ Successfully seeded ${createdStudents.length} students`.green);
    console.log(`  - Class 10: ${createdStudents.filter(s => s.class === STUDENT_CLASSES.CLASS_10).length} students (4 sections)`.green);
    console.log(`  - Class 12: ${createdStudents.filter(s => s.class === STUDENT_CLASSES.CLASS_12).length} students (3 sections)`.green);
    
    return createdStudents;
  } catch (error) {
    console.error('Error seeding students:', error);
    throw error;
  }
};

module.exports = seedStudents;
