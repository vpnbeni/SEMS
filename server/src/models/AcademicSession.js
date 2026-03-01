const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const academicSessionSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Session label is required'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, 'Session label must be in format YYYY-YYYY (e.g., 2025-2026)'],
    unique: true
  },
  startYear: {
    type: Number,
    required: [true, 'Start year is required']
  },
  endYear: {
    type: Number,
    required: [true, 'End year is required']
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
academicSessionSchema.index({ label: 1 }, { unique: true });
academicSessionSchema.index({ isCurrent: 1 });
academicSessionSchema.index({ status: 1 });
academicSessionSchema.index({ startYear: -1 });

/**
 * Derive the academic session label from a given date.
 * Indian academic year runs April (month index 3) to March.
 * A date in Jan-Mar belongs to session starting the previous calendar year.
 */
academicSessionSchema.statics.labelFromDate = function (dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  const startYear = month <= 3 ? year - 1 : year;
  return `${startYear}-${startYear + 1}`;
};

/**
 * Return current session label based on today's date.
 */
academicSessionSchema.statics.currentLabel = function () {
  return this.labelFromDate(new Date());
};

/**
 * Ensure a session document exists for the given label; create if missing.
 * Returns the session document.
 */
academicSessionSchema.statics.ensureSession = async function (label, createdBy) {
  const match = label.match(/^(\d{4})-(\d{4})$/);
  if (!match) throw new Error(`Invalid session label: ${label}`);

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  let session = await this.findOne({ label });
  if (!session) {
    session = await this.create({
      label,
      startYear,
      endYear,
      isCurrent: false,
      createdBy
    });
  }
  return session;
};

/**
 * Generate a list of reasonable session labels: from 3 years ago to 1 year ahead.
 */
academicSessionSchema.statics.generateAvailableSessions = function () {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currentStartYear = month <= 3 ? year - 1 : year;

  const sessions = [];
  for (let sy = currentStartYear - 3; sy <= currentStartYear + 1; sy++) {
    sessions.push({
      label: `${sy}-${sy + 1}`,
      startYear: sy,
      endYear: sy + 1,
      isCurrent: sy === currentStartYear
    });
  }
  return sessions;
};

module.exports = createContextModelProxy('AcademicSession', academicSessionSchema);
