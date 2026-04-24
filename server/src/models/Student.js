const mongoose = require('mongoose');
const { STUDENT_CLASSES, STUDENT_GENDERS, REGEX_PATTERNS } = require('../utils/constants');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [
      REGEX_PATTERNS.ROLL_NUMBER,
      'Please provide a valid roll number'
    ]
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [
      REGEX_PATTERNS.EMAIL,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    match: [
      REGEX_PATTERNS.PHONE,
      'Please provide a valid 10-digit phone number'
    ]
  },
  penNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'PEN number cannot be more than 50 characters']
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    enum: Object.values(STUDENT_CLASSES)
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
    maxlength: [50, 'Section cannot be more than 50 characters']
  },
  gender: {
    type: String,
    enum: STUDENT_GENDERS,
    default: 'Unspecified'
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  }],
  fatherName: {
    type: String,
    required: [true, 'Father name is required'],
    trim: true,
    maxlength: [100, 'Father name cannot be more than 100 characters']
  },
  motherName: {
    type: String,
    required: [true, 'Mother name is required'],
    trim: true,
    maxlength: [100, 'Mother name cannot be more than 100 characters']
  },
  guardianPhone: {
    type: String,
    required: [true, 'Guardian phone is required'],
    match: [
      REGEX_PATTERNS.PHONE,
      'Please provide a valid guardian phone number'
    ]
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot be more than 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot be more than 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State cannot be more than 50 characters']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
    }
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  admissionDate: {
    type: Date,
    required: [true, 'Admission date is required']
  },
  aadharNumber: {
    type: String,
    match: [/^\d{12}$/, 'Please provide a valid 12-digit Aadhar number']
  },
  category: {
    type: String,
    enum: ['General', 'OBC', 'SC', 'ST', 'EWS'],
    required: [true, 'Category is required']
  },
  religion: {
    type: String,
    trim: true,
    maxlength: [30, 'Religion cannot be more than 30 characters']
  },
  nationality: {
    type: String,
    default: 'Indian',
    trim: true,
    maxlength: [30, 'Nationality cannot be more than 30 characters']
  },
  previousSchool: {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Previous school name cannot be more than 200 characters']
    },
    board: {
      type: String,
      trim: true,
      maxlength: [50, 'Previous board cannot be more than 50 characters']
    },
    passingYear: {
      type: Number,
      min: [1950, 'Passing year must be after 1950'],
      max: [new Date().getFullYear(), 'Passing year cannot be in the future']
    },
    percentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot be more than 100']
    }
  },
  medicalInfo: {
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    allergies: [{
      type: String,
      trim: true,
      maxlength: [100, 'Allergy description cannot be more than 100 characters']
    }],
    medications: [{
      type: String,
      trim: true,
      maxlength: [100, 'Medication description cannot be more than 100 characters']
    }],
    specialNeeds: {
      type: String,
      trim: true,
      maxlength: [500, 'Special needs description cannot be more than 500 characters']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  documents: [{
    type: {
      type: String,
      enum: ['aadhar', 'birth_certificate', 'previous_marksheet', 'transfer_certificate', 'photo', 'other'],
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    cloudinaryPublicId: {
      type: String,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ class: 1, section: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ guardianPhone: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ name: 'text', rollNumber: 'text', fatherName: 'text' });
studentSchema.index({ createdAt: -1 });
studentSchema.index({ admissionDate: -1 });

// Compound indexes
studentSchema.index({ class: 1, section: 1, isActive: 1 });
studentSchema.index({ class: 1, isActive: 1 });

// Virtual for age
studentSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for full address
studentSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  
  const { street, city, state, pincode } = this.address;
  const parts = [street, city, state, pincode].filter(Boolean);
  return parts.join(', ');
});

// Virtual for class section display
studentSchema.virtual('classSection').get(function() {
  return `${this.class} - ${this.section}`;
});

// Virtual for display name
studentSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.rollNumber})`;
});

// Pre-save middleware to format names
studentSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
  if (this.isModified('fatherName')) {
    this.fatherName = this.fatherName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
  if (this.isModified('motherName')) {
    this.motherName = this.motherName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
  next();
});

// Static method to find by class and section
studentSchema.statics.findByClassSection = function(className, section) {
  return this.find({ class: className, section, isActive: true });
};

// Static method to find by class
studentSchema.statics.findByClass = function(className) {
  return this.find({ class: className, isActive: true });
};

// Static method to find by subject
studentSchema.statics.findBySubject = function(subjectId) {
  return this.find({ subjects: subjectId, isActive: true });
};

// Static method to get student statistics
studentSchema.statics.getStats = async function() {
  const students = await this.find({}, 'class section isActive gender dateOfBirth').lean();
  const now = new Date();

  const byClassSectionMap = new Map();
  const byClassMap = new Map();
  const byGenderMap = new Map();
  const ageMatrixMap = new Map();

  let activeTotal = 0;

  students.forEach((student) => {
    const className = String(student.class || '').trim();
    const section = String(student.section || '').trim();
    const gender = STUDENT_GENDERS.includes(student.gender) ? student.gender : 'Unspecified';
    const isActive = student.isActive === true;

    if (isActive) {
      activeTotal += 1;
    }

    const classSectionKey = `${className}::${section}`;
    const classSectionEntry = byClassSectionMap.get(classSectionKey) || {
      _id: { class: className, section },
      count: 0,
      active: 0,
    };
    classSectionEntry.count += 1;
    if (isActive) classSectionEntry.active += 1;
    byClassSectionMap.set(classSectionKey, classSectionEntry);

    const classEntry = byClassMap.get(className) || {
      _id: className,
      count: 0,
      active: 0,
    };
    classEntry.count += 1;
    if (isActive) classEntry.active += 1;
    byClassMap.set(className, classEntry);

    const genderEntry = byGenderMap.get(gender) || {
      _id: gender,
      count: 0,
      active: 0,
    };
    genderEntry.count += 1;
    if (isActive) genderEntry.active += 1;
    byGenderMap.set(gender, genderEntry);

    if (student.dateOfBirth) {
      const birthDate = new Date(student.dateOfBirth);
      if (!Number.isNaN(birthDate.getTime())) {
        let age = now.getFullYear() - birthDate.getFullYear();
        const monthDiff = now.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
          age -= 1;
        }

        if (age >= 0 && age <= 100) {
          const ageKey = `${className}::${age}`;
          const ageEntry = ageMatrixMap.get(ageKey) || {
            _id: { class: className, age },
            count: 0,
          };
          ageEntry.count += 1;
          ageMatrixMap.set(ageKey, ageEntry);
        }
      }
    }
  });

  const sortClassValue = (value) => {
    const numeric = parseInt(String(value || '').replace(/\D/g, ''), 10);
    return Number.isNaN(numeric) ? Number.MAX_SAFE_INTEGER : numeric;
  };

  return {
    total: students.length,
    activeTotal,
    byClass: Array.from(byClassMap.values()).sort((a, b) => sortClassValue(a._id) - sortClassValue(b._id)),
    byClassSection: Array.from(byClassSectionMap.values()).sort((a, b) => {
      const classDiff = sortClassValue(a._id.class) - sortClassValue(b._id.class);
      if (classDiff !== 0) return classDiff;
      return String(a._id.section).localeCompare(String(b._id.section));
    }),
    byGender: STUDENT_GENDERS.map((gender) => byGenderMap.get(gender) || {
      _id: gender,
      count: 0,
      active: 0,
    }),
    ageMatrix: Array.from(ageMatrixMap.values()).sort((a, b) => {
      const classDiff = sortClassValue(a._id.class) - sortClassValue(b._id.class);
      if (classDiff !== 0) return classDiff;
      return a._id.age - b._id.age;
    }),
    lastUpdated: new Date()
  };
};

// Instance method to assign subjects
studentSchema.methods.assignSubjects = function(subjectIds) {
  this.subjects = [...new Set([...this.subjects, ...subjectIds])];
  return this.save();
};

// Instance method to remove subjects
studentSchema.methods.removeSubjects = function(subjectIds) {
  this.subjects = this.subjects.filter(
    subject => !subjectIds.includes(subject.toString())
  );
  return this.save();
};

// Instance method to check if student has a subject
studentSchema.methods.hasSubject = function(subjectId) {
  return this.subjects.some(subject => subject.toString() === subjectId.toString());
};

// Instance method to add document
studentSchema.methods.addDocument = function(docData) {
  this.documents.push(docData);
  return this.save();
};

// Instance method to remove document
studentSchema.methods.removeDocument = function(docId) {
  this.documents = this.documents.filter(doc => doc._id.toString() !== docId.toString());
  return this.save();
};

studentSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('Student', studentSchema);
