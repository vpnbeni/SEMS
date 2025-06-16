const mongoose = require('mongoose');
const { ROOM_FACILITIES, REGEX_PATTERNS } = require('../utils/constants');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [
      REGEX_PATTERNS.ROOM_NUMBER,
      'Please provide a valid room number'
    ]
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Room name cannot be more than 100 characters']
  },
  building: {
    type: String,
    required: [true, 'Building is required'],
    trim: true,
    maxlength: [50, 'Building name cannot be more than 50 characters']
  },
  floor: {
    type: Number,
    required: [true, 'Floor is required'],
    min: [0, 'Floor cannot be negative'],
    max: [20, 'Floor cannot be more than 20']
  },
  capacity: {
    type: Number,
    required: [true, 'Room capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [200, 'Capacity cannot exceed 200']
  },
  examCapacity: {
    type: Number,
    validate: {
      validator: function(value) {
        return value <= this.capacity;
      },
      message: 'Exam capacity cannot exceed room capacity'
    }
  },
  type: {
    type: String,
    required: [true, 'Room type is required'],
    enum: ['classroom', 'laboratory', 'hall', 'auditorium', 'library', 'computer_lab', 'other'],
    default: 'classroom'
  },
  facilities: [{
    type: String,
    enum: ROOM_FACILITIES
  }],
  location: {
    wing: {
      type: String,
      trim: true,
      maxlength: [50, 'Wing cannot be more than 50 characters']
    },
    section: {
      type: String,
      trim: true,
      maxlength: [50, 'Section cannot be more than 50 characters']
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    }
  },
  dimensions: {
    length: {
      type: Number,
      min: [1, 'Length must be positive']
    },
    width: {
      type: Number,
      min: [1, 'Width must be positive']
    },
    height: {
      type: Number,
      min: [1, 'Height must be positive']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAvailableForExam: {
    type: Boolean,
    default: true
  },
  maintenanceStatus: {
    type: String,
    enum: ['good', 'fair', 'needs_repair', 'under_maintenance'],
    default: 'good'
  },
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    hasElevatorAccess: {
      type: Boolean,
      default: false
    },
    hasRamp: {
      type: Boolean,
      default: false
    }
  },
  equipment: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Equipment name cannot be more than 100 characters']
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'not_working'],
      default: 'good'
    },
    lastMaintenance: {
      type: Date
    }
  }],
  restrictions: {
    noFood: {
      type: Boolean,
      default: false
    },
    noMobilePhones: {
      type: Boolean,
      default: true
    },
    supervisionRequired: {
      type: Boolean,
      default: false
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Special instructions cannot be more than 500 characters']
    }
  },
  images: [{
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
    }
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
roomSchema.index({ roomNumber: 1 });
roomSchema.index({ building: 1, floor: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ capacity: 1 });
roomSchema.index({ isActive: 1, isAvailableForExam: 1 });
roomSchema.index({ maintenanceStatus: 1 });
roomSchema.index({ facilities: 1 });

// Compound indexes
roomSchema.index({ building: 1, floor: 1, roomNumber: 1 });
roomSchema.index({ type: 1, capacity: 1, isAvailableForExam: 1 });

// Virtual for display name
roomSchema.virtual('displayName').get(function() {
  if (this.name) {
    return `${this.roomNumber} - ${this.name}`;
  }
  return this.roomNumber;
});

// Virtual for full location
roomSchema.virtual('fullLocation').get(function() {
  const parts = [this.building];
  
  if (this.location?.wing) parts.push(this.location.wing);
  if (this.location?.section) parts.push(this.location.section);
  
  parts.push(`Floor ${this.floor}`);
  parts.push(`Room ${this.roomNumber}`);
  
  return parts.join(', ');
});

// Virtual for area calculation
roomSchema.virtual('area').get(function() {
  if (this.dimensions?.length && this.dimensions?.width) {
    return this.dimensions.length * this.dimensions.width;
  }
  return null;
});

// Virtual for capacity utilization
roomSchema.virtual('capacityUtilization').get(function() {
  if (this.examCapacity && this.capacity) {
    return Math.round((this.examCapacity / this.capacity) * 100);
  }
  return null;
});

// Pre-save middleware to set default exam capacity
roomSchema.pre('save', function(next) {
  if (!this.examCapacity) {
    // Set exam capacity to 70% of room capacity by default
    this.examCapacity = Math.floor(this.capacity * 0.7);
  }
  next();
});

// Pre-save middleware to validate coordinates
roomSchema.pre('save', function(next) {
  if (this.location?.coordinates) {
    const { latitude, longitude } = this.location.coordinates;
    if ((latitude && !longitude) || (!latitude && longitude)) {
      return next(new Error('Both latitude and longitude must be provided'));
    }
  }
  next();
});

// Static method to find available rooms for examination
roomSchema.statics.findAvailableForExam = function(minCapacity = 0) {
  return this.find({
    isActive: true,
    isAvailableForExam: true,
    maintenanceStatus: { $ne: 'under_maintenance' },
    examCapacity: { $gte: minCapacity }
  }).sort({ capacity: 1 });
};

// Static method to find by building and floor
roomSchema.statics.findByBuildingFloor = function(building, floor = null) {
  const query = { building, isActive: true };
  if (floor !== null) {
    query.floor = floor;
  }
  return this.find(query).sort({ floor: 1, roomNumber: 1 });
};

// Static method to find by type
roomSchema.statics.findByType = function(type) {
  return this.find({ type, isActive: true }).sort({ capacity: 1 });
};

// Static method to find by facilities
roomSchema.statics.findByFacilities = function(facilities = []) {
  return this.find({
    facilities: { $all: facilities },
    isActive: true,
    isAvailableForExam: true
  }).sort({ capacity: 1 });
};

// Static method to get room statistics
roomSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: { building: '$building', type: '$type' },
        count: { $sum: 1 },
        totalCapacity: { $sum: '$capacity' },
        totalExamCapacity: { $sum: '$examCapacity' },
        available: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$isActive', true] },
                  { $eq: ['$isAvailableForExam', true] },
                  { $ne: ['$maintenanceStatus', 'under_maintenance'] }
                ]
              }, 
              1, 
              0
            ]
          }
        }
      }
    },
    {
      $sort: { '_id.building': 1, '_id.type': 1 }
    }
  ]);

  const buildingStats = await this.aggregate([
    {
      $group: {
        _id: '$building',
        count: { $sum: 1 },
        totalCapacity: { $sum: '$capacity' },
        totalExamCapacity: { $sum: '$examCapacity' },
        available: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$isActive', true] },
                  { $eq: ['$isAvailableForExam', true] },
                  { $ne: ['$maintenanceStatus', 'under_maintenance'] }
                ]
              }, 
              1, 
              0
            ]
          }
        }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  const total = await this.countDocuments({ isActive: true });
  const available = await this.countDocuments({
    isActive: true,
    isAvailableForExam: true,
    maintenanceStatus: { $ne: 'under_maintenance' }
  });

  const totalCapacity = await this.aggregate([
    { $group: { _id: null, total: { $sum: '$capacity' }, exam: { $sum: '$examCapacity' } } }
  ]);

  return {
    total,
    available,
    totalCapacity: totalCapacity[0]?.total || 0,
    totalExamCapacity: totalCapacity[0]?.exam || 0,
    byBuilding: buildingStats,
    byBuildingAndType: stats,
    lastUpdated: new Date()
  };
};

// Instance method to add equipment
roomSchema.methods.addEquipment = function(equipmentData) {
  this.equipment.push(equipmentData);
  return this.save();
};

// Instance method to remove equipment
roomSchema.methods.removeEquipment = function(equipmentId) {
  this.equipment = this.equipment.filter(eq => eq._id.toString() !== equipmentId.toString());
  return this.save();
};

// Instance method to update equipment condition
roomSchema.methods.updateEquipmentCondition = function(equipmentId, condition, lastMaintenance = null) {
  const equipment = this.equipment.find(eq => eq._id.toString() === equipmentId.toString());
  if (equipment) {
    equipment.condition = condition;
    if (lastMaintenance) {
      equipment.lastMaintenance = lastMaintenance;
    }
    return this.save();
  }
  throw new Error('Equipment not found');
};

// Instance method to check availability for date/time
roomSchema.methods.isAvailableForDateTime = function(date, startTime, endTime) {
  // This would typically check against a booking/allocation system
  // For now, just check basic availability
  return this.isActive && 
         this.isAvailableForExam && 
         this.maintenanceStatus !== 'under_maintenance';
};

// Instance method to add facility
roomSchema.methods.addFacility = function(facility) {
  if (!this.facilities.includes(facility)) {
    this.facilities.push(facility);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove facility
roomSchema.methods.removeFacility = function(facility) {
  this.facilities = this.facilities.filter(f => f !== facility);
  return this.save();
};

module.exports = mongoose.model('Room', roomSchema);