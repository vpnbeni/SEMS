const mongoose = require('mongoose');
const { DISPATCH_STATUS } = require('../utils/constants');

const answerSheetDispatchSchema = new mongoose.Schema({
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
  dispatchNumber: {
    type: String,
    required: [true, 'Dispatch number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [30, 'Dispatch number cannot be more than 30 characters']
  },
  consignmentNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [30, 'Consignment number cannot be more than 30 characters']
  },
  folderMappings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FolderMapping',
    required: true
  }],
  totalSheets: {
    type: Number,
    required: [true, 'Total sheets count is required'],
    min: [0, 'Total sheets cannot be negative']
  },
  dispatchedSheets: {
    type: Number,
    default: 0,
    min: [0, 'Dispatched sheets cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.totalSheets;
      },
      message: 'Dispatched sheets cannot exceed total sheets'
    }
  },
  receivedSheets: {
    type: Number,
    default: 0,
    min: [0, 'Received sheets cannot be negative']
  },
  damagedSheets: {
    type: Number,
    default: 0,
    min: [0, 'Damaged sheets cannot be negative']
  },
  status: {
    type: String,
    enum: Object.values(DISPATCH_STATUS),
    default: DISPATCH_STATUS.PENDING
  },
  dispatchDetails: {
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.status !== DISPATCH_STATUS.PENDING;
      }
    },
    dispatchedAt: {
      type: Date
    },
    receivedBy: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Receiver name cannot be more than 100 characters']
      },
      designation: {
        type: String,
        trim: true,
        maxlength: [100, 'Receiver designation cannot be more than 100 characters']
      },
      signature: {
        type: String // Base64 encoded signature or file path
      },
      contactNumber: {
        type: String,
        match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number']
      }
    },
    receivedAt: {
      type: Date
    },
    returnedBy: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'Return person name cannot be more than 100 characters']
      },
      designation: {
        type: String,
        trim: true,
        maxlength: [100, 'Return person designation cannot be more than 100 characters']
      },
      contactNumber: {
        type: String,
        match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number']
      }
    },
    returnedAt: {
      type: Date
    }
  },
  destination: {
    boardOffice: {
      name: {
        type: String,
        required: [true, 'Board office name is required'],
        trim: true,
        maxlength: [200, 'Board office name cannot be more than 200 characters']
      },
      code: {
        type: String,
        required: [true, 'Board office code is required'],
        trim: true,
        uppercase: true,
        maxlength: [10, 'Board office code cannot be more than 10 characters']
      },
      address: {
        street: {
          type: String,
          required: [true, 'Street address is required'],
          trim: true,
          maxlength: [200, 'Street address cannot be more than 200 characters']
        },
        city: {
          type: String,
          required: [true, 'City is required'],
          trim: true,
          maxlength: [50, 'City cannot be more than 50 characters']
        },
        state: {
          type: String,
          required: [true, 'State is required'],
          trim: true,
          maxlength: [50, 'State cannot be more than 50 characters']
        },
        pincode: {
          type: String,
          required: [true, 'Pincode is required'],
          match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
        }
      },
      contactPerson: {
        name: {
          type: String,
          required: [true, 'Contact person name is required'],
          trim: true,
          maxlength: [100, 'Contact person name cannot be more than 100 characters']
        },
        phone: {
          type: String,
          required: [true, 'Contact person phone is required'],
          match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number']
        },
        email: {
          type: String,
          lowercase: true,
          trim: true,
          match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
        }
      }
    }
  },
  transportation: {
    mode: {
      type: String,
      enum: ['road', 'rail', 'air', 'courier', 'hand_delivery'],
      required: [true, 'Transportation mode is required']
    },
    vehicleDetails: {
      type: {
        type: String,
        enum: ['truck', 'van', 'car', 'train', 'flight', 'courier_service', 'other']
      },
      number: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [20, 'Vehicle number cannot be more than 20 characters']
      },
      driverName: {
        type: String,
        trim: true,
        maxlength: [100, 'Driver name cannot be more than 100 characters']
      },
      driverPhone: {
        type: String,
        match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit driver phone number']
      }
    },
    courierDetails: {
      company: {
        type: String,
        trim: true,
        maxlength: [100, 'Courier company name cannot be more than 100 characters']
      },
      trackingNumber: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [50, 'Tracking number cannot be more than 50 characters']
      },
      estimatedDelivery: {
        type: Date
      }
    },
    actualDelivery: {
      type: Date
    }
  },
  security: {
    sealNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Seal number cannot be more than 30 characters']
    },
    lockNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Lock number cannot be more than 30 characters']
    },
    securityPersonnel: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Security personnel name cannot be more than 100 characters']
      },
      id: {
        type: String,
        required: true,
        trim: true,
        maxlength: [20, 'Security personnel ID cannot be more than 20 characters']
      },
      phone: {
        type: String,
        match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number']
      }
    }],
    photographs: [{
      filename: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      path: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['loading', 'sealed_packet', 'dispatch', 'delivery', 'other'],
        required: true
      },
      takenAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  trackingHistory: [{
    status: {
      type: String,
      enum: Object.values(DISPATCH_STATUS),
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot be more than 200 characters']
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot be more than 500 characters']
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['dispatch_receipt', 'delivery_receipt', 'damage_report', 'insurance_claim', 'other'],
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  insurance: {
    isInsured: {
      type: Boolean,
      default: false
    },
    policyNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Policy number cannot be more than 50 characters']
    },
    provider: {
      type: String,
      trim: true,
      maxlength: [100, 'Insurance provider cannot be more than 100 characters']
    },
    coverage: {
      type: Number,
      min: [0, 'Coverage amount cannot be negative']
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
answerSheetDispatchSchema.index({ dispatchNumber: 1 });
answerSheetDispatchSchema.index({ consignmentNumber: 1 });
answerSheetDispatchSchema.index({ dateSheet: 1, subject: 1 });
answerSheetDispatchSchema.index({ examDate: 1 });
answerSheetDispatchSchema.index({ status: 1 });
answerSheetDispatchSchema.index({ 'dispatchDetails.dispatchedAt': -1 });
answerSheetDispatchSchema.index({ 'transportation.courierDetails.trackingNumber': 1 });

// Compound indexes
answerSheetDispatchSchema.index({ status: 1, examDate: 1 });
answerSheetDispatchSchema.index({ dateSheet: 1, status: 1 });

// Virtual for dispatch efficiency
answerSheetDispatchSchema.virtual('dispatchEfficiency').get(function() {
  if (this.totalSheets === 0) return 0;
  return Math.round((this.dispatchedSheets / this.totalSheets) * 100);
});

// Virtual for delivery efficiency
answerSheetDispatchSchema.virtual('deliveryEfficiency').get(function() {
  if (this.dispatchedSheets === 0) return 0;
  return Math.round((this.receivedSheets / this.dispatchedSheets) * 100);
});

// Virtual for dispatch time
answerSheetDispatchSchema.virtual('dispatchDuration').get(function() {
  if (this.dispatchDetails?.dispatchedAt && this.dispatchDetails?.receivedAt) {
    const duration = this.dispatchDetails.receivedAt - this.dispatchDetails.dispatchedAt;
    return Math.round(duration / (1000 * 60 * 60)); // Duration in hours
  }
  return null;
});

// Virtual for full destination address
answerSheetDispatchSchema.virtual('fullDestinationAddress').get(function() {
  if (!this.destination?.boardOffice?.address) return '';
  
  const { street, city, state, pincode } = this.destination.boardOffice.address;
  return `${street}, ${city}, ${state} - ${pincode}`;
});

// Pre-save middleware to auto-generate dispatch number
answerSheetDispatchSchema.pre('save', async function(next) {
  if (!this.dispatchNumber) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const subject = await mongoose.model('Subject').findById(this.subject).select('code');
    const existingCount = await this.constructor.countDocuments({
      examDate: this.examDate,
      subject: this.subject
    });
    
    const sequence = String(existingCount + 1).padStart(4, '0');
    this.dispatchNumber = `DISP-${date}-${subject?.code || 'SUB'}-${sequence}`;
  }
  
  next();
});

// Pre-save middleware to update timestamps
answerSheetDispatchSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case DISPATCH_STATUS.DISPATCHED:
        if (!this.dispatchDetails.dispatchedAt) {
          this.dispatchDetails.dispatchedAt = now;
        }
        break;
      case DISPATCH_STATUS.DELIVERED:
        if (!this.dispatchDetails.receivedAt) {
          this.dispatchDetails.receivedAt = now;
        }
        break;
      case DISPATCH_STATUS.RETURNED:
        if (!this.dispatchDetails.returnedAt) {
          this.dispatchDetails.returnedAt = now;
        }
        break;
    }
  }
  
  next();
});

// Static method to find by status
answerSheetDispatchSchema.statics.findByStatus = function(status) {
  return this.find({ 
    status,
    isActive: true 
  }).populate('dateSheet subject folderMappings dispatchDetails.dispatchedBy');
};

// Static method to find by date range
answerSheetDispatchSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    examDate: { $gte: startDate, $lte: endDate },
    isActive: true
  }).populate('dateSheet subject');
};

// Static method to get dispatch statistics
answerSheetDispatchSchema.statics.getDispatchStats = async function(dateSheetId = null) {
  const matchStage = { isActive: true };
  if (dateSheetId) {
    matchStage.dateSheet = mongoose.Types.ObjectId(dateSheetId);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSheets: { $sum: '$totalSheets' },
        dispatchedSheets: { $sum: '$dispatchedSheets' },
        receivedSheets: { $sum: '$receivedSheets' },
        damagedSheets: { $sum: '$damagedSheets' }
      }
    }
  ]);

  const overallStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDispatches: { $sum: 1 },
        totalSheets: { $sum: '$totalSheets' },
        dispatchedSheets: { $sum: '$dispatchedSheets' },
        receivedSheets: { $sum: '$receivedSheets' },
        damagedSheets: { $sum: '$damagedSheets' }
      }
    }
  ]);

  return {
    byStatus: stats,
    overall: overallStats[0] || {},
    lastUpdated: new Date()
  };
};

// Instance method to dispatch
answerSheetDispatchSchema.methods.dispatch = function(dispatchedById, transportDetails = {}) {
  this.status = DISPATCH_STATUS.DISPATCHED;
  this.dispatchDetails.dispatchedBy = dispatchedById;
  this.dispatchDetails.dispatchedAt = new Date();
  
  if (transportDetails.vehicleNumber) {
    this.transportation.vehicleDetails.number = transportDetails.vehicleNumber;
  }
  if (transportDetails.driverName) {
    this.transportation.vehicleDetails.driverName = transportDetails.driverName;
  }
  if (transportDetails.driverPhone) {
    this.transportation.vehicleDetails.driverPhone = transportDetails.driverPhone;
  }
  
  this.addTrackingEntry(DISPATCH_STATUS.DISPATCHED, 'Dispatched from examination center', dispatchedById);
  
  return this.save();
};

// Instance method to mark as delivered
answerSheetDispatchSchema.methods.markAsDelivered = function(receiverDetails, updatedById) {
  this.status = DISPATCH_STATUS.DELIVERED;
  this.dispatchDetails.receivedAt = new Date();
  
  if (receiverDetails) {
    this.dispatchDetails.receivedBy = receiverDetails;
  }
  
  this.addTrackingEntry(DISPATCH_STATUS.DELIVERED, 'Delivered to board office', updatedById);
  
  return this.save();
};

// Instance method to add tracking entry
answerSheetDispatchSchema.methods.addTrackingEntry = function(status, remarks, updatedById, location = null) {
  this.trackingHistory.push({
    status,
    timestamp: new Date(),
    location,
    updatedBy: updatedById,
    remarks
  });
  
  return this.save();
};

// Instance method to add document
answerSheetDispatchSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

// Instance method to add security photograph
answerSheetDispatchSchema.methods.addSecurityPhotograph = function(photoData) {
  this.security.photographs.push(photoData);
  return this.save();
};

// Instance method to update insurance details
answerSheetDispatchSchema.methods.updateInsurance = function(insuranceData) {
  this.insurance = { ...this.insurance, ...insuranceData };
  return this.save();
};

module.exports = mongoose.model('AnswerSheetDispatch', answerSheetDispatchSchema);