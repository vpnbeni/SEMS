const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const transportVehicleSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    trim: true,
    uppercase: true,
    maxlength: 20,
  },
  vehicleType: {
    type: String,
    enum: ['Bus', 'Mini Bus', 'Van', 'Winger', 'Other'],
    default: 'Bus',
  },
  make: { type: String, trim: true, default: '' },
  model: { type: String, trim: true, default: '' },
  color: { type: String, trim: true, default: '' },
  capacity: { type: Number, min: 1, default: 40 },
  driverName: { type: String, trim: true, default: '' },
  driverPhone: { type: String, trim: true, default: '' },
  conductorName: { type: String, trim: true, default: '' },
  conductorPhone: { type: String, trim: true, default: '' },
  insuranceExpiry: { type: Date, default: null },
  fitnessExpiry: { type: Date, default: null },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active',
  },
  notes: { type: String, trim: true, default: '', maxlength: 400 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

transportVehicleSchema.index({ registrationNumber: 1 }, { unique: true });
transportVehicleSchema.index({ status: 1, isActive: 1 });

module.exports = createContextModelProxy('TransportVehicle', transportVehicleSchema);
