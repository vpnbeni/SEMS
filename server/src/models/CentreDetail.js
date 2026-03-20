const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

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
  // Packing details for exam day (answer sheet packing)
  packingClothColor: {
    type: String,
    trim: true,
    default: '',
  },
  packingMarker: {
    type: String,
    trim: true,
    default: '',
  },
  packingClothColorClass10: {
    type: String,
    trim: true,
    default: '',
  },
  packingMarkerClass10: {
    type: String,
    trim: true,
    default: '',
  },
  packingClothColorClass12: {
    type: String,
    trim: true,
    default: '',
  },
  packingMarkerClass12: {
    type: String,
    trim: true,
    default: '',
  },
  // Dispatch slip metadata (used for parcel label)
  dispatchSlipToAddress: {
    type: String,
    trim: true,
    default: '',
  },
  dispatchSlipFromAddress: {
    type: String,
    trim: true,
    default: '',
  },
  dispatchSlipInsuredAmount: {
    type: String,
    trim: true,
    default: '1000',
  },
}, {
  timestamps: true,
});

centreDetailSchema.index({ updatedAt: -1 });

centreDetailSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('CentreDetail', centreDetailSchema);
