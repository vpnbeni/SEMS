const mongoose = require('mongoose');

const masterCBSEDatesheetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'CBSE Full Datesheet',
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
  },
  totalEntries: {
    type: Number,
    required: true,
  },
  dateRange: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  statistics: {
    total: Number,
    class10th: Number,
    class12th: Number,
    uniqueDates: Number,
    uniqueSubjects: Number,
  },
  entries: [{
    examDate: {
      type: Date,
      required: true,
    },
    dayName: {
      type: String,
      required: false,
    },
    subject: {
      code: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      class: {
        type: String,
        required: true,
        enum: ['10th', '12th'],
      },
      duration: {
        type: Number,
        required: true,
      },
    },
    timeSlot: {
      start: {
        type: String,
        default: '10:30',
      },
      end: {
        type: String,
        default: '13:30',
      },
    },
    answerSheet: {
      type: String,
      enum: ['32_pages', '20_pages', '40_graph'],
      default: '32_pages',
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformAdmin',
    default: null,
  },
  cloudinaryUrl: {
    type: String,
  },
  cloudinaryPublicId: {
    type: String,
  },
}, {
  timestamps: true,
});

// Pre-save middleware to automatically add day names
masterCBSEDatesheetSchema.pre('save', function (next) {
  if (this.entries && this.entries.length > 0) {
    this.entries.forEach(entry => {
      if (entry.examDate && !entry.dayName) {
        const date = new Date(entry.examDate);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        entry.dayName = days[date.getDay()];
      }
    });
  }
  next();
});

masterCBSEDatesheetSchema.index({ academicYear: 1, isActive: 1 });
masterCBSEDatesheetSchema.index({ 'entries.examDate': 1 });

const MODEL_NAME = 'MasterCBSEDatesheet';

const getMasterCBSEDatesheetModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterCBSEDatesheet model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, masterCBSEDatesheetSchema);
};

module.exports = {
  masterCBSEDatesheetSchema,
  getMasterCBSEDatesheetModel,
  MODEL_NAME,
};
