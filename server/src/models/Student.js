const mongoose = require('mongoose');
const { STUDENT_CLASSES, STUDENT_SECTIONS, REGEX_PATTERNS } = require('../utils/constants');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

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
  class: {
    type: String,
    required: [true, 'Class is required'],
    enum: Object.values(STUDENT_CLASSES)
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    enum: STUDENT_SECTIONS,
    uppercase: true
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
  const stats = await this.aggregate([
    {
      $group: {
        _id: { class: '$class', section: '$section' },
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { '_id.class': 1, '_id.section': 1 }
    }
  ]);

  const classStats = await this.aggregate([
    {
      $group: {
        _id: '$class',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        }
      }
    }
  ]);

  const total = await this.countDocuments();
  const activeTotal = await this.countDocuments({ isActive: true });

  return {
    total,
    activeTotal,
    byClass: classStats,
    byClassSection: stats,
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

module.exports = createContextModelProxy('Student', studentSchema);
