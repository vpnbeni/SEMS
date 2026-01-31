const mongoose = require('mongoose')

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
  serialFrom: {
    type: String,
    required: [true, 'Serial number from is required'],
    trim: true,
    // IMPORTANT: Stored as string to preserve leading zeros (e.g., "001245", "A001245")
    validate: {
      validator: function(v) {
        // Allow alphanumeric with optional leading zeros
        return /^[A-Z]?\d+$/.test(v)
      },
      message: 'Serial number must be alphanumeric (optional letter prefix + digits)'
    }
  },
  serialTo: {
    type: String,
    required: [true, 'Serial number to is required'],
    trim: true,
    // IMPORTANT: Stored as string to preserve leading zeros (e.g., "001500", "A001500")
    validate: {
      validator: function(v) {
        // Allow alphanumeric with optional leading zeros
        return /^[A-Z]?\d+$/.test(v)
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

// Pre-validate middleware to calculate total from serial numbers
answerSheetSchema.pre('validate', function(next) {
  if (this.serialFrom && this.serialTo) {
    try {
      const from = parseInt(this.serialFrom.replace(/\D/g, ''))
      const to = parseInt(this.serialTo.replace(/\D/g, ''))
      
      if (!isNaN(from) && !isNaN(to) && to >= from) {
        this.total = to - from + 1
      }
    } catch (error) {
      console.warn('Could not calculate total from serial numbers:', error.message)
    }
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
  // Check if serial is already in the discarded list
  const exists = this.discardedSerials.some(d => d.serial === serial)
  if (exists) {
    throw new Error(`Serial ${serial} is already marked as discarded`)
  }
  
  // Validate serial is within range
  const prefix = this.serialFrom.replace(/\d+$/, '')
  const serialNum = parseInt(serial.replace(/\D/g, ''))
  const fromNum = parseInt(this.serialFrom.replace(/\D/g, ''))
  const toNum = parseInt(this.serialTo.replace(/\D/g, ''))
  
  if (isNaN(serialNum) || serialNum < fromNum || serialNum > toNum) {
    throw new Error(`Serial ${serial} is outside the valid range (${this.serialFrom} - ${this.serialTo})`)
  }
  
  this.discardedSerials.push({ serial, reason, discardedAt: new Date() })
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
  const prefix = this.serialFrom.replace(/\d+$/, '')
  const padLength = this.serialFrom.replace(/\D/g, '').length
  
  const fromNum = parseInt(fromSerial.replace(/\D/g, ''))
  const toNum = parseInt(toSerial.replace(/\D/g, ''))
  const rangeStart = parseInt(this.serialFrom.replace(/\D/g, ''))
  const rangeEnd = parseInt(this.serialTo.replace(/\D/g, ''))
  
  if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
    throw new Error('Invalid serial range')
  }
  
  if (fromNum < rangeStart || toNum > rangeEnd) {
    throw new Error(`Serial range is outside the valid range (${this.serialFrom} - ${this.serialTo})`)
  }
  
  const added = []
  for (let i = fromNum; i <= toNum; i++) {
    const serial = prefix + i.toString().padStart(padLength, '0')
    const exists = this.discardedSerials.some(d => d.serial === serial)
    if (!exists) {
      this.discardedSerials.push({ serial, reason, discardedAt: new Date() })
      added.push(serial)
    }
  }
  
  return this.save().then(() => added)
}

module.exports = mongoose.model('AnswerSheet', answerSheetSchema)
