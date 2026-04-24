const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const bellTimingMetaSchema = new mongoose.Schema(
  {
    schoolName: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    session: { type: String, default: '', trim: true },
    effectiveDate: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const bellTimingRowSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    type: { type: String, enum: ['period', 'break'], required: true },
    label: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1, max: 480 },
  },
  { _id: false }
);

const bellTimingsSchema = new mongoose.Schema(
  {
    meta: { type: bellTimingMetaSchema, default: () => ({}) },
    startTime: { type: String, default: '08:00', trim: true },
    rows: { type: [bellTimingRowSchema], default: [] },
  },
  { _id: false }
);

const bellTimingVersionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    bellTimings: { type: bellTimingsSchema, required: true },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

bellTimingVersionSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('BellTimingVersion', bellTimingVersionSchema);
