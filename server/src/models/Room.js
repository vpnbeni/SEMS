const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = createContextModelProxy('Room', roomSchema);
