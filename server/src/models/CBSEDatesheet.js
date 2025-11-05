const mongoose = require('mongoose')

const cbseDatesheetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'CBSE Full Datesheet'
  },
  academicYear: {
    type: String,
    required: true
  },
  importDate: {
    type: Date,
    default: Date.now
  },
  totalEntries: {
    type: Number,
    required: true
  },
  dateRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  statistics: {
    total: Number,
    class10th: Number,
    class12th: Number,
    uniqueDates: Number,
    uniqueSubjects: Number
  },
  entries: [{
    examDate: {
      type: Date,
      required: true
    },
    dayName: {
      type: String,
      required: false // Will be populated by calendar service
    },
    subject: {
      code: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      class: {
        type: String,
        required: true,
        enum: ['10th', '12th']
      },
      duration: {
        type: Number,
        required: true // Duration in hours
      }
    },
    timeSlot: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '12:00'
      }
    },
    answerSheet: {
      type: String,
      enum: ['32_pages', '20_pages', '40_graph'],
      default: '32_pages'
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
})

// Index for faster queries
cbseDatesheetSchema.index({ academicYear: 1, isActive: 1 })
cbseDatesheetSchema.index({ 'entries.examDate': 1 })
cbseDatesheetSchema.index({ 'entries.subject.class': 1 })

// Method to get entries by class
cbseDatesheetSchema.methods.getEntriesByClass = function(classLevel) {
  return this.entries.filter(entry => entry.subject.class === classLevel)
}

// Method to get entries by date range
cbseDatesheetSchema.methods.getEntriesByDateRange = function(startDate, endDate) {
  return this.entries.filter(entry => {
    const examDate = new Date(entry.examDate)
    return examDate >= new Date(startDate) && examDate <= new Date(endDate)
  })
}

// Static method to get active datesheet
cbseDatesheetSchema.statics.getActive = function() {
  return this.findOne({ isActive: true }).sort({ createdAt: -1 })
}

module.exports = mongoose.model('CBSEDatesheet', cbseDatesheetSchema)