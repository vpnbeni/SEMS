const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const selectionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Student',
    },
    subjectKeys: {
      type: [String],
      default: [],
    },
    // Per-student additional subject (replaces lowest main mark for %)
    additionalSubjectKey: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const cbseRegistrationSchema = new mongoose.Schema(
  {
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
    selections: {
      type: [selectionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

cbseRegistrationSchema.index(
  { academicSession: 1, class: 1, section: 1 },
  { unique: true }
);

cbseRegistrationSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('CbseRegistration', cbseRegistrationSchema);
