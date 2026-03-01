const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const folderMappingSchema = new mongoose.Schema({
  dateSheet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DateSheet',
    required: [true, 'Date sheet reference is required']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject reference is required']
  },
  examDate: {
    type: Date,
    required: [true, 'Exam date is required']
  },
  folderNumber: {
    type: String,
    required: [true, 'Folder number is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Folder number cannot be more than 20 characters']
  },
  bundleNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Bundle number cannot be more than 20 characters']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room reference is required']
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Supervisor reference is required']
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    seatNumber: {
      type: String,
      trim: true,
      maxlength: [10, 'Seat number cannot be more than 10 characters']
    },
    isPresent: {
      type: Boolean,
      default: null // null = not marked, true = present, false = absent
    },
    answerSheetNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Answer sheet number cannot be more than 20 characters']
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [200, 'Remarks cannot be more than 200 characters']
    }
  }],
  totalSheets: {
    type: Number,
    required: [true, 'Total sheets count is required'],
    min: [0, 'Total sheets cannot be negative']
  },
  collectedSheets: {
    type: Number,
    default: 0,
    min: [0, 'Collected sheets cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.totalSheets;
      },
      message: 'Collected sheets cannot exceed total sheets'
    }
  },
  missingSheets: {
    type: Number,
    default: 0,
    min: [0, 'Missing sheets cannot be negative']
  },
  extraSheets: {
    type: Number,
    default: 0,
    min: [0, 'Extra sheets cannot be negative']
  },
  collectionStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'verified'],
    default: 'pending'
  },
  collectionTime: {
    started: {
      type: Date
    },
    completed: {
      type: Date
    }
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  verificationTime: {
    type: Date
  },
  discrepancies: [{
    type: {
      type: String,
      enum: ['missing_sheet', 'extra_sheet', 'damaged_sheet', 'wrong_roll_number', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, 'Description cannot be more than 300 characters']
    },
    studentRollNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: [300, 'Resolution cannot be more than 300 characters']
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    resolvedAt: {
      type: Date
    }
  }],
  barcodeData: {
    folderBarcode: {
      type: String,
      trim: true,
      uppercase: true
    },
    bundleBarcode: {
      type: String,
      trim: true,
      uppercase: true
    },
    generatedAt: {
      type: Date
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
folderMappingSchema.index({ dateSheet: 1, subject: 1, room: 1 });
folderMappingSchema.index({ folderNumber: 1 });
folderMappingSchema.index({ bundleNumber: 1 });
folderMappingSchema.index({ examDate: 1 });
folderMappingSchema.index({ collectionStatus: 1 });
folderMappingSchema.index({ supervisor: 1 });
folderMappingSchema.index({ 'students.rollNumber': 1 });

// Compound indexes
folderMappingSchema.index({ dateSheet: 1, examDate: 1 });
folderMappingSchema.index({ subject: 1, examDate: 1 });
folderMappingSchema.index({ collectionStatus: 1, examDate: 1 });

// Virtual for collection percentage
folderMappingSchema.virtual('collectionPercentage').get(function() {
  if (this.totalSheets === 0) return 0;
  return Math.round((this.collectedSheets / this.totalSheets) * 100);
});

// Virtual for attendance count
folderMappingSchema.virtual('attendanceStats').get(function() {
  const present = this.students.filter(s => s.isPresent === true).length;
  const absent = this.students.filter(s => s.isPresent === false).length;
  const notMarked = this.students.filter(s => s.isPresent === null).length;
  
  return {
    present,
    absent,
    notMarked,
    total: this.students.length
  };
});

// Virtual for collection time duration
folderMappingSchema.virtual('collectionDuration').get(function() {
  if (this.collectionTime?.started && this.collectionTime?.completed) {
    const duration = this.collectionTime.completed - this.collectionTime.started;
    return Math.round(duration / (1000 * 60)); // Duration in minutes
  }
  return null;
});

// Virtual for folder display name
folderMappingSchema.virtual('displayName').get(function() {
  return `${this.folderNumber}${this.bundleNumber ? ` (Bundle: ${this.bundleNumber})` : ''}`;
});

// Pre-save middleware to auto-generate folder/bundle numbers
folderMappingSchema.pre('save', async function(next) {
  if (!this.folderNumber) {
    // Generate folder number: YYYYMMDD-SUBJECT-ROOM-001
    const date = this.examDate.toISOString().slice(0, 10).replace(/-/g, '');
    const SubjectModel = this.model('Subject');
    const RoomModel = this.model('Room');
    const subjectCode = await SubjectModel.findById(this.subject).select('code');
    const roomNumber = await RoomModel.findById(this.room).select('roomNumber');
    
    const existingCount = await this.constructor.countDocuments({
      examDate: this.examDate,
      subject: this.subject
    });
    
    const sequence = String(existingCount + 1).padStart(3, '0');
    this.folderNumber = `${date}-${subjectCode?.code || 'SUB'}-${roomNumber?.roomNumber || 'ROOM'}-${sequence}`;
  }
  
  next();
});

// Pre-save middleware to update collection statistics
folderMappingSchema.pre('save', function(next) {
  // Auto-calculate totals based on students
  this.totalSheets = this.students.length;
  
  // Calculate collected sheets (present students)
  this.collectedSheets = this.students.filter(s => s.isPresent === true).length;
  
  // Calculate missing sheets (absent students)
  this.missingSheets = this.students.filter(s => s.isPresent === false).length;
  
  next();
});

// Static method to find by date sheet and subject
folderMappingSchema.statics.findByDateSheetSubject = function(dateSheetId, subjectId) {
  return this.find({ 
    dateSheet: dateSheetId, 
    subject: subjectId,
    isActive: true 
  }).populate('room supervisor students.student');
};

// Static method to find by collection status
folderMappingSchema.statics.findByCollectionStatus = function(status) {
  return this.find({ 
    collectionStatus: status,
    isActive: true 
  }).populate('dateSheet subject room supervisor');
};

// Static method to get collection statistics
folderMappingSchema.statics.getCollectionStats = async function(dateSheetId = null) {
  const matchStage = { isActive: true };
  if (dateSheetId) {
    matchStage.dateSheet = mongoose.Types.ObjectId(dateSheetId);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$collectionStatus',
        count: { $sum: 1 },
        totalSheets: { $sum: '$totalSheets' },
        collectedSheets: { $sum: '$collectedSheets' },
        missingSheets: { $sum: '$missingSheets' },
        extraSheets: { $sum: '$extraSheets' }
      }
    }
  ]);

  const total = await this.countDocuments(matchStage);
  const overallStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalFolders: { $sum: 1 },
        totalSheets: { $sum: '$totalSheets' },
        collectedSheets: { $sum: '$collectedSheets' },
        missingSheets: { $sum: '$missingSheets' },
        extraSheets: { $sum: '$extraSheets' }
      }
    }
  ]);

  return {
    total,
    byStatus: stats,
    overall: overallStats[0] || {},
    lastUpdated: new Date()
  };
};

// Instance method to mark student attendance
folderMappingSchema.methods.markStudentAttendance = function(studentId, isPresent, answerSheetNumber = null) {
  const student = this.students.find(s => s.student.toString() === studentId.toString());
  if (student) {
    student.isPresent = isPresent;
    if (answerSheetNumber) {
      student.answerSheetNumber = answerSheetNumber;
    }
    return this.save();
  }
  throw new Error('Student not found in folder mapping');
};

// Instance method to start collection
folderMappingSchema.methods.startCollection = function() {
  this.collectionStatus = 'in_progress';
  this.collectionTime.started = new Date();
  return this.save();
};

// Instance method to complete collection
folderMappingSchema.methods.completeCollection = function() {
  this.collectionStatus = 'completed';
  this.collectionTime.completed = new Date();
  return this.save();
};

// Instance method to verify folder
folderMappingSchema.methods.verifyFolder = function(verifiedById) {
  this.collectionStatus = 'verified';
  this.verifiedBy = verifiedById;
  this.verificationTime = new Date();
  return this.save();
};

// Instance method to add discrepancy
folderMappingSchema.methods.addDiscrepancy = function(discrepancyData) {
  this.discrepancies.push(discrepancyData);
  return this.save();
};

// Instance method to resolve discrepancy
folderMappingSchema.methods.resolveDiscrepancy = function(discrepancyId, resolution, resolvedById) {
  const discrepancy = this.discrepancies.find(d => d._id.toString() === discrepancyId.toString());
  if (discrepancy) {
    discrepancy.resolved = true;
    discrepancy.resolution = resolution;
    discrepancy.resolvedBy = resolvedById;
    discrepancy.resolvedAt = new Date();
    return this.save();
  }
  throw new Error('Discrepancy not found');
};

// Instance method to generate barcode
folderMappingSchema.methods.generateBarcode = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  
  this.barcodeData = {
    folderBarcode: `FOL-${this.folderNumber}-${timestamp}`,
    bundleBarcode: this.bundleNumber ? `BUN-${this.bundleNumber}-${random}` : null,
    generatedAt: new Date()
  };
  
  return this.save();
};

folderMappingSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('FolderMapping', folderMappingSchema);
