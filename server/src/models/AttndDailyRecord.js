const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const staffAttendanceDailySchema = new mongoose.Schema({
  attendanceDate: {
    type: String,
    required: [true, 'Attendance date is required'],
    trim: true,
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Staff ID is required'],
  },
  status: {
    type: String,
    enum: ['P', 'A', 'HD'],
    default: 'P',
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
}, {
  timestamps: true,
});

staffAttendanceDailySchema.index({ attendanceDate: 1, staffId: 1 }, { unique: true });
staffAttendanceDailySchema.index({ attendanceDate: 1, status: 1 });

const studentAttendanceDailySchema = new mongoose.Schema({
  attendanceDate: {
    type: String,
    required: [true, 'Attendance date is required'],
    trim: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
    maxlength: 30,
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
    maxlength: 50,
  },
  status: {
    type: String,
    enum: ['P', 'A', 'HD'],
    default: 'P',
  },
  category: {
    type: String,
    enum: ['academic', 'non-academic'],
    default: 'academic',
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
}, {
  timestamps: true,
});

studentAttendanceDailySchema.index({ attendanceDate: 1, studentId: 1 }, { unique: true });
studentAttendanceDailySchema.index({ attendanceDate: 1, className: 1, section: 1, status: 1 });

const studentAttendanceDaySchema = new mongoose.Schema({
  attendanceDate: {
    type: String,
    required: [true, 'Attendance date is required'],
    trim: true,
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
    maxlength: 30,
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
    maxlength: 50,
  },
  category: {
    type: String,
    enum: ['academic', 'non-academic'],
    default: 'academic',
  },
}, {
  timestamps: true,
});

studentAttendanceDaySchema.index({ attendanceDate: 1, className: 1, section: 1 }, { unique: true });
studentAttendanceDaySchema.plugin(academicSessionPlugin);

staffAttendanceDailySchema.plugin(academicSessionPlugin);
studentAttendanceDailySchema.plugin(academicSessionPlugin);

const StaffAttendanceDaily = createContextModelProxy('StaffAttendanceDaily', staffAttendanceDailySchema);
const StudentAttendanceDaily = createContextModelProxy('StudentAttendanceDaily', studentAttendanceDailySchema);
const StudentAttendanceDay = createContextModelProxy('StudentAttendanceDay', studentAttendanceDaySchema);

module.exports = { StaffAttendanceDaily, StudentAttendanceDaily, StudentAttendanceDay };
