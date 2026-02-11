const mongoose = require('mongoose');
const { REGEX_PATTERNS } = require('../utils/constants');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      REGEX_PATTERNS.EMAIL,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [
      REGEX_PATTERNS.PHONE,
      'Please provide a valid 10-digit phone number'
    ]
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [50, 'Department cannot be more than 50 characters']
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
    maxlength: [50, 'Designation cannot be more than 50 characters']
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot be more than 50 years']
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    trim: true,
    maxlength: [200, 'Qualification cannot be more than 200 characters']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot be more than 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot be more than 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot be more than 50 characters']
    },
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
    }
  },
  dateOfJoining: {
    type: Date,
    required: [true, 'Date of joining is required']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot be more than 100 characters']
    },
    phone: {
      type: String,
      match: [
        REGEX_PATTERNS.PHONE,
        'Please provide a valid emergency contact phone number'
      ]
    },
    relation: {
      type: String,
      trim: true,
      maxlength: [50, 'Relation cannot be more than 50 characters']
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
teacherSchema.index({ email: 1 });
teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ phone: 1 });
teacherSchema.index({ department: 1 });
teacherSchema.index({ isActive: 1 });
teacherSchema.index({ name: 'text', email: 'text', department: 'text' });
teacherSchema.index({ createdAt: -1 });

// Virtual for age
teacherSchema.virtual('age').get(function() {
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
teacherSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  
  const { street, city, state, pincode } = this.address;
  const parts = [street, city, state, pincode].filter(Boolean);
  return parts.join(', ');
});

// Virtual for years of service
teacherSchema.virtual('yearsOfService').get(function() {
  if (!this.dateOfJoining) return 0;
  
  const today = new Date();
  const joiningDate = new Date(this.dateOfJoining);
  const diffTime = Math.abs(today - joiningDate);
  const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
  
  return diffYears;
});

// Pre-save middleware to format name
teacherSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
  next();
});

// Static method to find by department
teacherSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

// Static method to find by subject
teacherSchema.statics.findBySubject = function(subjectId) {
  return this.find({ subjects: subjectId, isActive: true });
};

// Static method to get teacher statistics
teacherSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        averageExperience: { $avg: '$experience' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const total = await this.countDocuments();
  const activeTotal = await this.countDocuments({ isActive: true });
  const averageExperience = await this.aggregate([
    { $group: { _id: null, avg: { $avg: '$experience' } } }
  ]);

  return {
    total,
    activeTotal,
    averageExperience: averageExperience[0]?.avg || 0,
    byDepartment: stats,
    lastUpdated: new Date()
  };
};

// Instance method to assign subjects
teacherSchema.methods.assignSubjects = function(subjectIds) {
  this.subjects = [...new Set([...this.subjects, ...subjectIds])];
  return this.save();
};

// Instance method to remove subjects
teacherSchema.methods.removeSubjects = function(subjectIds) {
  this.subjects = this.subjects.filter(
    subject => !subjectIds.includes(subject.toString())
  );
  return this.save();
};

// Instance method to check if teacher teaches a subject
teacherSchema.methods.teachesSubject = function(subjectId) {
  return this.subjects.some(subject => subject.toString() === subjectId.toString());
};

module.exports = createContextModelProxy('Teacher', teacherSchema);
