const mongoose = require('mongoose')
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');
const {
  SERIAL_NUMBER_PATTERN,
  normalizeAnswerSheetSerialRanges,
  getConfiguredSerialRanges,
  parseSerialValue,
  isSerialWithinAnswerSheetRanges
} = require('../utils/answerSheetSerialRanges');

/**
 * Answer Sheet Model
 * 
 * IMPORTANT: Serial Number Format
 * ================================
 * Serial numbers are stored as STRINGS to preserve leading zeros.
 * 
 * Format: Can be alphanumeric with leading zeros
 * Examples:
 *   - "001245" (numeric with leading zeros)
 *   - "A001245" (letter prefix with leading zeros)
 *   - "1001" (numeric without leading zeros)
 *   - "O1001" (letter prefix without leading zeros)
 * 
 * The leading zeros MUST be preserved in storage and display.
 * Do NOT convert to numbers as this will lose leading zeros.
 * 
 * When calculating totals:
 * - Extract numeric portion only
 * - Calculate: serialTo - serialFrom + 1
 * - But always store original string format
 */

const serialRangeSchema = new mongoose.Schema({
  serialFrom: {
    type: String,
    required: [true, 'Serial number from is required'],
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return SERIAL_NUMBER_PATTERN.test(v)
      },
      message: 'Serial number must be alphanumeric (optional letter prefix + digits)'
    }
  },
  serialTo: {
    type: String,
    required: [true, 'Serial number to is required'],
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return SERIAL_NUMBER_PATTERN.test(v)
      },
      message: 'Serial number must be alphanumeric (optional letter prefix + digits)'
    }
  }
}, { _id: false })

const supplementaryUsageSchema = new mongoose.Schema({
  centreDatesheetEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CBSEDatesheet',
    required: true
  },
  examDate: {
    type: Date,
    required: true
  },
  subjectCode: {
    type: String,
    required: true,
    trim: true
  },
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  roomNo: {
    type: String,
    required: true,
    trim: true
  },
  rollNo: {
    type: String,
    required: true,
    trim: true
  },
  serials: [{
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return SERIAL_NUMBER_PATTERN.test(v)
      },
      message: 'Serial number must be alphanumeric (optional letter prefix + digits)'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const answerSheetSchema = new mongoose.Schema({
  answerSheetType: {
    type: String,
    required: [true, 'Answer sheet type is required'],
    enum: ['Main', 'Graph', 'Supplementary', 'For Blind', 'Drawing Sheets'],
    trim: true
  },
  pages: {
    type: Number,
    required: [true, 'Number of pages is required'],
    min: [1, 'Pages must be at least 1']
  },
  colour: {
    type: String,
    required: [true, 'Colour is required'],
    enum: ['Red', 'Blue', 'Yellow', 'Pink', 'White'],
    trim: true
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    trim: true
  },
  suffix: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [1, 'Suffix must be a single character']
  },
  series: {
    type: String,
    trim: true,
    maxlength: [50, 'Series cannot exceed 50 characters']
  },
  serialRanges: {
    type: [serialRangeSchema],
    default: undefined
  },
  serialFrom: {
    type: String,
    trim: true,
    uppercase: true,
    // IMPORTANT: Stored as string to preserve leading zeros (e.g., "001245", "A001245")
    validate: {
      validator: function(v) {
        if (!v) return true
        // Allow alphanumeric with optional leading zeros
        return SERIAL_NUMBER_PATTERN.test(v)
      },
      message: 'Serial number must be alphanumeric (optional letter prefix + digits)'
    }
  },
  serialTo: {
    type: String,
    trim: true,
    uppercase: true,
    // IMPORTANT: Stored as string to preserve leading zeros (e.g., "001500", "A001500")
    validate: {
      validator: function(v) {
        if (!v) return true
        // Allow alphanumeric with optional leading zeros
        return SERIAL_NUMBER_PATTERN.test(v)
      },
      message: 'Serial number must be alphanumeric (optional letter prefix + digits)'
    }
  },
  total: {
    type: Number,
    min: [0, 'Total cannot be negative'],
    default: 0
  },
  used: {
    type: Number,
    default: 0,
    min: [0, 'Used quantity cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.total
      },
      message: 'Used quantity cannot exceed total'
    }
  },
  discarded: {
    type: Number,
    default: 0,
    min: [0, 'Discarded quantity cannot be negative'],
    validate: {
      validator: function(value) {
        return value + this.used <= this.total
      },
      message: 'Used + Discarded cannot exceed total'
    }
  },
  // Store specific discarded serial numbers (damaged, misprinted, etc.)
  // These will be skipped during allocation
  discardedSerials: [{
    serial: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      trim: true,
      default: 'Damaged/Misprinted'
    },
    discardedAt: {
      type: Date,
      default: Date.now
    }
  }],
  supplementaryUsages: {
    type: [supplementaryUsageSchema],
    default: undefined
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  exam: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  sortOrder: {
    type: Number,
    default: 999
  },
  uploadedFileUrl: {
    type: String,
    trim: true
  },
  uploadedFileId: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Link to centre datesheet entry
  centreDatesheetEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CBSEDatesheet'
  },
  // Cached details from centre datesheet for quick access
  linkedExamDate: {
    type: Date
  },
  linkedSubjectCode: {
    type: String,
    trim: true
  },
  linkedSubjectName: {
    type: String,
    trim: true
  },
  linkedCandidateCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
answerSheetSchema.index({ sortOrder: 1 })
answerSheetSchema.index({ answerSheetType: 1, class: 1 })
answerSheetSchema.index({ serialFrom: 1, serialTo: 1 })
answerSheetSchema.index({ receivedDate: -1 })
answerSheetSchema.index({ isActive: 1 })

// Virtual for balance
answerSheetSchema.virtual('balance').get(function() {
  return this.total - this.used - this.discarded
})

// Virtual for usage percentage
answerSheetSchema.virtual('usagePercentage').get(function() {
  if (this.total === 0) return 0
  return Math.round((this.used / this.total) * 100)
})

// Virtual for display name
answerSheetSchema.virtual('displayName').get(function() {
  return `${this.answerSheetType} - ${this.pages} Pages - ${this.colour} - Class ${this.class}`
})

// Pre-validate middleware to normalize serial ranges and calculate totals.
answerSheetSchema.pre('validate', function(next) {
  try {
    const normalized = normalizeAnswerSheetSerialRanges({
      serialRanges: this.serialRanges,
      serialFrom: this.serialFrom,
      serialTo: this.serialTo
    })

    this.serialRanges = normalized.serialRanges
    this.serialFrom = normalized.serialFrom
    this.serialTo = normalized.serialTo
    this.total = normalized.total
  } catch (error) {
    return next(error)
  }

  next()
})

// Static method to get summary statistics
answerSheetSchema.statics.getSummaryStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalReceived: { $sum: '$total' },
        totalUsed: { $sum: '$used' },
        totalDiscarded: { $sum: '$discarded' },
        totalBalance: { $sum: { $subtract: ['$total', { $add: ['$used', '$discarded'] }] } }
      }
    }
  ])
  
  return stats[0] || {
    totalReceived: 0,
    totalUsed: 0,
    totalDiscarded: 0,
    totalBalance: 0
  }
}

// Static method to get statistics by type
answerSheetSchema.statics.getStatsByType = async function() {
  return await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: {
          type: '$answerSheetType',
          class: '$class'
        },
        totalReceived: { $sum: '$total' },
        totalUsed: { $sum: '$used' },
        totalDiscarded: { $sum: '$discarded' },
        totalBalance: { $sum: { $subtract: ['$total', { $add: ['$used', '$discarded'] }] } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.type': 1, '_id.class': 1 }
    }
  ])
}

// Instance method to use sheets
answerSheetSchema.methods.useSheets = function(quantity) {
  const available = this.total - this.used - this.discarded
  
  if (quantity > available) {
    throw new Error(`Cannot use ${quantity} sheets. Only ${available} available.`)
  }
  
  this.used += quantity
  return this.save()
}

// Instance method to discard sheets
answerSheetSchema.methods.discardSheets = function(quantity) {
  const available = this.total - this.used - this.discarded
  
  if (quantity > available) {
    throw new Error(`Cannot discard ${quantity} sheets. Only ${available} available.`)
  }
  
  this.discarded += quantity
  return this.save()
}

// Instance method to add a discarded serial number
answerSheetSchema.methods.addDiscardedSerial = function(serial, reason = 'Damaged/Misprinted') {
  const parsedSerial = parseSerialValue(serial)
  if (!parsedSerial) {
    throw new Error('Serial number must be alphanumeric (optional letter prefix + digits)')
  }

  // Check if serial is already in the discarded list
  const exists = this.discardedSerials.some(d => d.serial === parsedSerial.raw)
  if (exists) {
    throw new Error(`Serial ${parsedSerial.raw} is already marked as discarded`)
  }
  
  if (!isSerialWithinAnswerSheetRanges(this, parsedSerial.raw)) {
    throw new Error(`Serial ${parsedSerial.raw} is outside the configured serial ranges`)
  }
  
  this.discardedSerials.push({ serial: parsedSerial.raw, reason, discardedAt: new Date() })
  return this.save()
}

// Instance method to remove a discarded serial number
answerSheetSchema.methods.removeDiscardedSerial = function(serial) {
  const index = this.discardedSerials.findIndex(d => d.serial === serial)
  if (index === -1) {
    throw new Error(`Serial ${serial} is not in the discarded list`)
  }
  
  this.discardedSerials.splice(index, 1)
  return this.save()
}

// Instance method to add multiple discarded serials (range)
answerSheetSchema.methods.addDiscardedRange = function(fromSerial, toSerial, reason = 'Damaged/Misprinted') {
  const configuredRanges = getConfiguredSerialRanges(this)
  const parsedFrom = parseSerialValue(fromSerial)
  const parsedTo = parseSerialValue(toSerial)

  if (!parsedFrom || !parsedTo || parsedFrom.number > parsedTo.number) {
    throw new Error('Invalid serial range')
  }

  const targetRange = configuredRanges.find(range => {
    const rangeFrom = parseSerialValue(range.serialFrom)
    const rangeTo = parseSerialValue(range.serialTo)

    if (!rangeFrom || !rangeTo) return false

    return (
      parsedFrom.prefix === rangeFrom.prefix
      && parsedTo.prefix === rangeTo.prefix
      && parsedFrom.number >= rangeFrom.number
      && parsedTo.number <= rangeTo.number
    )
  })

  if (!targetRange) {
    throw new Error('Discard range must stay within one configured serial range')
  }

  const padLength = parsedFrom.padLength
  const prefix = parsedFrom.prefix
  const added = []
  for (let i = parsedFrom.number; i <= parsedTo.number; i++) {
    const serial = prefix + i.toString().padStart(padLength, '0')
    const exists = this.discardedSerials.some(d => d.serial === serial)
    if (!exists) {
      this.discardedSerials.push({ serial, reason, discardedAt: new Date() })
      added.push(serial)
    }
  }
  
  return this.save().then(() => added)
}

answerSheetSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('AnswerSheet', answerSheetSchema)
