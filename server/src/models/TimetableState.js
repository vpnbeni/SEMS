const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const timetableClassSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: String,
      required: true,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    incharge: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const timetableSubjectSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const timetableTeacherSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      default: '',
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const timetableMatrixClassSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const timetableMatrixSectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const teacherSubjectClassAssignmentSchema = new mongoose.Schema(
  {
    classId: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const teacherSubjectAllocationSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      required: true,
      trim: true,
    },
    teacherName: {
      type: String,
      default: '',
      trim: true,
    },
    assignments: {
      type: [teacherSubjectClassAssignmentSchema],
      default: [],
    },
  },
  { _id: false }
);

const parallelSubjectPairSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    subjectA: {
      type: String,
      required: true,
      trim: true,
    },
    subjectB: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const bellTimingMetaSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      default: '',
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    session: {
      type: String,
      default: '',
      trim: true,
    },
    effectiveDate: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const bellTimingRowSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['period', 'break'],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 480,
    },
  },
  { _id: false }
);

const bellTimingsSchema = new mongoose.Schema(
  {
    meta: {
      type: bellTimingMetaSchema,
      default: () => ({}),
    },
    startTime: {
      type: String,
      default: '08:00',
      trim: true,
    },
    rows: {
      type: [bellTimingRowSchema],
      default: [],
    },
  },
  { _id: false }
);

const timetableStateSchema = new mongoose.Schema(
  {
    classes: {
      type: [timetableClassSchema],
      default: [],
    },
    subjects: {
      type: [timetableSubjectSchema],
      default: [],
    },
    teachers: {
      type: [timetableTeacherSchema],
      default: [],
    },
    teacherSubjectAllocations: {
      type: [teacherSubjectAllocationSchema],
      default: [],
    },
    parallelSubjectPairs: {
      type: [parallelSubjectPairSchema],
      default: [],
    },
    commonPeriods: {
      type: [
        new mongoose.Schema(
          {
            id: { type: String, required: true, trim: true },
            className: { type: String, required: true, trim: true },
            subject: { type: String, required: true, trim: true },
            sections: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    periodsPerWeek: {
      type: Number,
      default: 42,
      min: 1,
      max: 84,
    },
    periodAllocation: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timetableGrid: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    matrixClasses: {
      type: [timetableMatrixClassSchema],
      default: [],
    },
    matrixSections: {
      type: [timetableMatrixSectionSchema],
      default: [],
    },
    matrixSelection: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    bellTimings: {
      type: bellTimingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

timetableStateSchema.plugin(academicSessionPlugin);

// Keep one state document per academic session per tenant DB.
timetableStateSchema.index(
  { academicSession: 1 },
  { unique: true, partialFilterExpression: { academicSession: { $type: 'string' } } }
);

module.exports = createContextModelProxy('TimetableState', timetableStateSchema);
