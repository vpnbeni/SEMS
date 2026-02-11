const mongoose = require('mongoose');

const masterSubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot be more than 100 characters'],
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
    uppercase: true,
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    enum: ['10th', '12th'],
  },
  duration: {
    type: Number,
    enum: [2, 3],
    required: [true, 'Exam duration is required'],
    default: 3,
  },
  answerSheet: {
    type: String,
    enum: ['none', '32_pages', '20_pages', '40_graph'],
    default: 'none',
  },
  boardCode: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Board code cannot be more than 10 characters'],
  },
  isTheorySubject: {
    type: Boolean,
    default: true,
  },
  isPracticalSubject: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Unique constraint: code + class combination must be unique
masterSubjectSchema.index({ code: 1, class: 1 }, { unique: true });
masterSubjectSchema.index({ class: 1, isActive: 1 });
masterSubjectSchema.index({ isActive: 1 });

const MODEL_NAME = 'MasterSubject';

const getMasterSubjectModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterSubject model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, masterSubjectSchema);
};

module.exports = {
  masterSubjectSchema,
  getMasterSubjectModel,
  MODEL_NAME,
};
