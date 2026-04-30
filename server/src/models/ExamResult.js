const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const examResultSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ExamDefinition',
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Student',
    },
    class: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    marks: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

examResultSchema.index({ academicSession: 1, examId: 1, studentId: 1 }, { unique: true });
examResultSchema.index({ academicSession: 1, examId: 1, class: 1, section: 1 });

examResultSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('ExamResult', examResultSchema);
