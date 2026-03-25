const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const conflictReportEntrySchema = new mongoose.Schema(
  {
    classId: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['underallocated', 'teacher_overload', 'unfilled'],
      required: true,
    },
    expected: { type: Number, default: 0 },
    actual: { type: Number, default: 0 },
    message: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const generationStatsSchema = new mongoose.Schema(
  {
    totalSlots: { type: Number, default: 0 },
    filledSlots: { type: Number, default: 0 },
    conflictCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const timetableVersionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    generationStats: {
      type: generationStatsSchema,
      default: () => ({}),
    },
    conflictReport: {
      type: [conflictReportEntrySchema],
      default: [],
    },
    // Same grid format as TimetableState.timetableGrid:
    // { classId → { day("Monday"…"Saturday") → { periodId → { subject, teacher } } } }
    grid: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

timetableVersionSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('TimetableVersion', timetableVersionSchema);
