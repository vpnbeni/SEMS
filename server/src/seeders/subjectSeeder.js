const Subject = require('../models/Subject');
const { STUDENT_CLASSES, SUBJECT_TYPES } = require('../utils/constants');

const subjects = [
  {
    name: 'Mathematics',
    code: 'MATH101',
    class: STUDENT_CLASSES.CLASS_10,
    type: SUBJECT_TYPES.CORE,
    duration: 180,
    maxMarks: 100,
    passingMarks: 35,
    theoryMarks: 80,
    practicalMarks: 20,
    isActive: true
  },
  {
    name: 'Physics',
    code: 'PHY101',
    class: STUDENT_CLASSES.CLASS_10,
    type: SUBJECT_TYPES.CORE,
    duration: 180,
    maxMarks: 100,
    passingMarks: 35,
    theoryMarks: 70,
    practicalMarks: 30,
    isActive: true
  },
  {
    name: 'Chemistry',
    code: 'CHEM101',
    class: STUDENT_CLASSES.CLASS_10,
    type: SUBJECT_TYPES.CORE,
    duration: 180,
    maxMarks: 100,
    passingMarks: 35,
    theoryMarks: 70,
    practicalMarks: 30,
    isActive: true
  }
];

const seedSubjects = async () => {
  try {
    await Subject.deleteMany({});
    await Subject.insertMany(subjects);
    console.log('Subjects seeded successfully');
  } catch (error) {
    console.error('Error seeding subjects:', error);
  }
};

module.exports = seedSubjects;
