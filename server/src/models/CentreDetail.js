const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const centreDetailSchema = new mongoose.Schema({
  centreNo: {
    type: String,
    trim: true,
    default: '',
  },
  centreName: {
    type: String,
    trim: true,
    default: '',
  },
  centreSchoolCode: {
    type: String,
    trim: true,
    default: '',
  },
  centreSuperintendent: {
    type: String,
    trim: true,
    default: '',
  },
  centreSuperintendentContact: {
    type: String,
    trim: true,
    default: '',
  },
  deputyCentreSuperintendent: {
    type: String,
    trim: true,
    default: '',
  },
  deputyCentreSuperintendentContact: {
    type: String,
    trim: true,
    default: '',
  },
  centreClerk: {
    type: String,
    trim: true,
    default: '',
  },
  centreClerkContact: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

centreDetailSchema.index({ updatedAt: -1 });

module.exports = createContextModelProxy('CentreDetail', centreDetailSchema);
