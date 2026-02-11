const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  schoolName: {
    type: String,
    trim: true,
    maxlength: [200, 'School name cannot exceed 200 characters']
  },
  schoolCode: {
    type: String,
    trim: true,
    maxlength: [20, 'School code cannot exceed 20 characters']
  },
  class: {
    type: String,
    enum: ['10th', '12th', ''],
    default: ''
  },
  motherName: {
    type: String,
    trim: true,
    maxlength: [100, 'Mother name cannot exceed 100 characters']
  },
  fatherName: {
    type: String,
    trim: true,
    maxlength: [100, 'Father name cannot exceed 100 characters']
  },
  sex: {
    type: String,
    enum: ['M', 'F', 'O', ''],
    default: ''
  },
  category: {
    type: String,
    trim: true,
    maxlength: [10, 'Category cannot exceed 10 characters']
  },
  pwd: {
    type: String,
    trim: true,
    maxlength: [10, 'PwD cannot exceed 10 characters']
  },
  consession: {
    type: String,
    trim: true,
    maxlength: [50, 'Consession cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date
  },
  previousRoll: {
    type: String,
    trim: true
  },
  previousYear: {
    type: String,
    trim: true
  },
  flc: {
    type: String,
    trim: true,
    maxlength: [5, 'FLC cannot exceed 5 characters']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'suspended'],
    default: 'active'
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  subjectCodes: [{
    code: {
      type: String,
      trim: true
    },
    medium: {
      type: String,
      trim: true
    }
  }],
  // PDF import metadata
  importedFrom: {
    fileName: String,
    uploadDate: Date,
    cloudinaryUrl: String,
    cloudinaryPublicId: String
  },
  // Additional metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
candidateSchema.index({ rollNumber: 1 });
candidateSchema.index({ status: 1 });

// Virtual for full name display
candidateSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.rollNumber})`;
});

// Pre-save middleware
candidateSchema.pre('save', function(next) {
  if (this.rollNumber) {
    this.rollNumber = this.rollNumber.toUpperCase();
  }
  next();
});

// Static methods
candidateSchema.statics.findByRollNumber = function(rollNumber) {
  return this.findOne({ rollNumber: rollNumber.toUpperCase() });
};



candidateSchema.statics.getActiveCount = function() {
  return this.countDocuments({ status: 'active' });
};

module.exports = createContextModelProxy('Candidate', candidateSchema);
