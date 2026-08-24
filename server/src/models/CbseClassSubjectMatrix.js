const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const subjectSelectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: '', trim: true, uppercase: true },
  },
  { _id: false }
);

const rowSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    section: { type: String, default: '', trim: true },
    // Ordered subject list for this class/section (UI stacks 3 per row)
    subjects: {
      type: [subjectSelectionSchema],
      default: [],
    },
    // Legacy field kept for migration reads only
    slots: {
      type: Map,
      of: subjectSelectionSchema,
      default: undefined,
    },
  },
  { _id: false }
);

/**
 * Session-scoped class/section subject lists for CBSE registration.
 * Each row owns its own ordered subjects; additional subject is per student.
 */
const cbseClassSubjectMatrixSchema = new mongoose.Schema(
  {
    // Legacy — ignored on new saves
    columns: {
      type: Array,
      default: [],
    },
    rows: {
      type: [rowSchema],
      default: [],
    },
    metadata: {
      uniqueSubjectsPerClassSection: {
        enabled: { type: Boolean, default: true },
        scope: { type: String, default: 'each_class_section' },
        description: {
          type: String,
          default:
            'Within a single class and section (e.g. 11th Science), the same subject cannot be selected twice. The same subject may still be selected in other classes or sections (e.g. Psychology in 11th Science and 12th Commerce).',
        },
      },
    },
  },
  { timestamps: true }
);

cbseClassSubjectMatrixSchema.index({ academicSession: 1 }, { unique: true });
cbseClassSubjectMatrixSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('CbseClassSubjectMatrix', cbseClassSubjectMatrixSchema);
