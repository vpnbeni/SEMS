const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const roomSchema = new mongoose.Schema({
  roomNo: {
    type: String,
    required: true,
    trim: true
  },
  roomName: {
    type: String,
    trim: true
  },
  floor: {
    type: String,
    default: 'First Floor',
    trim: true
  },
  capacity: {
    type: Number,
    default: 24
  },
  allocatedExamDates: {
    type: [String],
    default: []
  },
  allocationOrderByDate: {
    type: Map,
    of: Number,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

roomSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('Room', roomSchema);
