const Subject = require('../models/Subject');
const { STUDENT_CLASSES } = require('../utils/constants');

const subjects = [
  // Class 10 CBSE Subjects
  {
    name: 'Mathematics',
    code: '041',
    class: STUDENT_CLASSES.CLASS_10,
    duration: 3,
    isActive: true,
    boardCode: '041',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Science',
    code: '086',
    class: STUDENT_CLASSES.CLASS_10,
    duration: 3,
    isActive: true,
    boardCode: '086',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Social Science',
    code: '087',
    class: STUDENT_CLASSES.CLASS_10,
    duration: 3,
    isActive: true,
    boardCode: '087',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'English',
    code: '184',
    class: STUDENT_CLASSES.CLASS_10,
    duration: 3,
    isActive: true,
    boardCode: '184',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Hindi',
    code: '085',
    class: STUDENT_CLASSES.CLASS_10,
    duration: 3,
    isActive: true,
    boardCode: '085',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Sanskrit',
    code: '122',
    class: STUDENT_CLASSES.CLASS_10,
    duration: 3,
    isActive: true,
    boardCode: '122',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Information Technology',
    code: '402',
    class: STUDENT_CLASSES.CLASS_10,
    duration: 3,
    isActive: true,
    boardCode: '402',
    isTheorySubject: true,
    isPracticalSubject: true
  },

  // Class 12 CBSE Subjects - Science Stream
  {
    name: 'Mathematics',
    code: '241',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '041',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Physics',
    code: '042',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '042',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Chemistry',
    code: '043',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '043',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Biology',
    code: '044',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '044',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Computer Science',
    code: '083',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '083',
    isTheorySubject: true,
    isPracticalSubject: true
  },

  // Class 12 CBSE Subjects - Commerce Stream
  {
    name: 'Accountancy',
    code: '055',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '055',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Business Studies',
    code: '054',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '054',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Economics',
    code: '030',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '030',
    isTheorySubject: true,
    isPracticalSubject: false
  },

  // Class 12 CBSE Subjects - Arts/Humanities Stream
  {
    name: 'History',
    code: '027',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '027',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Geography',
    code: '029',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '029',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Political Science',
    code: '028',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '028',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Psychology',
    code: '037',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '037',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Sociology',
    code: '039',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '039',
    isTheorySubject: true,
    isPracticalSubject: false
  },

  // Class 12 CBSE Subjects - Languages
  {
    name: 'English Core',
    code: '301',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '301',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'English Elective',
    code: '001',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '001',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Hindi Core',
    code: '302',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '302',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Hindi Elective',
    code: '002',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '002',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Sanskrit Core',
    code: '309',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '309',
    isTheorySubject: true,
    isPracticalSubject: false
  },
  {
    name: 'Sanskrit Elective',
    code: '009',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '009',
    isTheorySubject: true,
    isPracticalSubject: false
  },

  // Class 12 CBSE Subjects - Additional/Vocational
  {
    name: 'Physical Education',
    code: '048',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '048',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Informatics Practices',
    code: '065',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '065',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Biotechnology',
    code: '049',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '049',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Engineering Graphics',
    code: '046',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '046',
    isTheorySubject: true,
    isPracticalSubject: true
  },
  {
    name: 'Legal Studies',
    code: '074',
    class: STUDENT_CLASSES.CLASS_12,
    duration: 3,
    isActive: true,
    boardCode: '074',
    isTheorySubject: true,
    isPracticalSubject: false
  }
];

const seedSubjects = async () => {
  try {
    console.log('🗑️  Clearing existing subjects...');
    await Subject.deleteMany({});
    
    console.log('📚 Inserting CBSE subjects...');
    const insertedSubjects = await Subject.insertMany(subjects);
    
    console.log(`✅ Successfully seeded ${insertedSubjects.length} subjects:`);
    console.log(`   - Class 10: ${insertedSubjects.filter(s => s.class === '10th').length} subjects`);
    console.log(`   - Class 12: ${insertedSubjects.filter(s => s.class === '12th').length} subjects`);
    
    return insertedSubjects;
  } catch (error) {
    console.error('❌ Error seeding subjects:', error);
    throw error;
  }
};

module.exports = seedSubjects;
