const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

// Schema for tracking individual absentee marks
const attendanceRecordSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: [true, 'Candidate ID is required'],
  },
  examDate: {
    type: String,
    required: [true, 'Exam date is required'],
    trim: true,
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    enum: ['X', 'XII'],
    trim: true,
  },
  isAbsent: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound index: one record per candidate+date+subject
attendanceRecordSchema.index({ candidateId: 1, examDate: 1, subjectCode: 1 }, { unique: true });
attendanceRecordSchema.index({ examDate: 1, class: 1 });

// Schema for uploaded attendance sheet documents (images/PDFs)
const attendanceUploadSchema = new mongoose.Schema({
  class: {
    type: String,
    required: [true, 'Class is required'],
    enum: ['X', 'XII'],
    trim: true,
  },
  fileUrl: {
    type: String,
    trim: true,
    default: null,
  },
  publicId: {
    type: String,
    trim: true,
    default: null,
  },
  originalFileName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true,
  },
  fileSize: {
    type: Number,
  },
  mimeType: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

attendanceUploadSchema.index({ class: 1, createdAt: -1 });

attendanceRecordSchema.plugin(academicSessionPlugin);
attendanceUploadSchema.plugin(academicSessionPlugin);

const AttendanceRecord = createContextModelProxy('AttendanceRecord', attendanceRecordSchema);
const AttendanceUpload = createContextModelProxy('AttendanceUpload', attendanceUploadSchema);

module.exports = { AttendanceRecord, AttendanceUpload };
