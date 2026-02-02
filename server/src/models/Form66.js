const mongoose = require('mongoose');

const form66Schema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    trim: true
  },
  centreNo: {
    type: String,
    trim: true
  },
  centreName: {
    type: String,
    trim: true
  },
  examDate: {
    type: String,
    required: true,
    trim: true
  },
  subjectCode: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  candidateName: {
    type: String,
    trim: true,
    default: ''
  },
  fatherName: {
    type: String,
    trim: true
  },
  motherName: {
    type: String,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  subjects: [{
    code: String,
    name: String
  }],
  dateOfBirth: {
    type: Date
  },
  category: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient date-wise queries
form66Schema.index({ examDate: 1, subjectCode: 1 });
form66Schema.index({ rollNo: 1 });

// Schema for tracking uploaded Form 66 files
const form66UploadSchema = new mongoose.Schema({
  originalFileName: {
    type: String,
    required: true,
    trim: true
  },
  originalFileUrl: {
    type: String,
    trim: true
  },
  originalFilePublicId: {
    type: String,
    trim: true
  },
  processedPdfUrl: {
    type: String,
    trim: true
  },
  processedPdfPublicId: {
    type: String,
    trim: true
  },
  recordCount: {
    type: Number,
    default: 0
  },
  dateCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  errorMessage: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const Form66 = mongoose.model('Form66', form66Schema);
const Form66Upload = mongoose.model('Form66Upload', form66UploadSchema);

module.exports = { Form66, Form66Upload };
