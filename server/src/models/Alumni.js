const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const alumniSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
  },
  name: {
    type: String,
    required: [true, 'Alumni name is required'],
    trim: true,
    maxlength: 100,
  },
  rollNumber: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
  },
  classRollNo: {
    type: Number,
    default: null,
  },
  section: {
    type: String,
    trim: true,
    default: '',
  },
  gender: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  fatherName: {
    type: String,
    trim: true,
    default: '',
  },
  motherName: {
    type: String,
    trim: true,
    default: '',
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  profileImage: {
    type: String,
    default: null,
  },
  batchSession: {
    type: String,
    required: [true, 'Batch session is required'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, 'Batch session must be in YYYY-YYYY format'],
  },
  passedOutClass: {
    type: String,
    default: '12th',
    trim: true,
  },
  currentCity: {
    type: String,
    trim: true,
    default: '',
  },
  higherEducation: {
    type: String,
    trim: true,
    default: '',
  },
  occupation: {
    type: String,
    trim: true,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

alumniSchema.index({ studentId: 1 }, { unique: true, sparse: true });
alumniSchema.index({ batchSession: 1, name: 1 });
alumniSchema.index({ rollNumber: 1, batchSession: 1 });

module.exports = createContextModelProxy('Alumni', alumniSchema);
