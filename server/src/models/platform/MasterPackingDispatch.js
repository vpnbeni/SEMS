const mongoose = require('mongoose');

const masterPackingDispatchSchema = new mongoose.Schema({
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
  dispatchSlipToAddress: {
    type: String,
    default: '',
  },
  dispatchSlipFromAddress: {
    type: String,
    default: '',
  },
  dispatchSlipInsuredAmount: {
    type: String,
    trim: true,
    default: '1000',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformAdmin',
    default: null,
  },
}, {
  timestamps: true,
});

masterPackingDispatchSchema.index({ isActive: 1 });

const MODEL_NAME = 'MasterPackingDispatch';

const getMasterPackingDispatchModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterPackingDispatch model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, masterPackingDispatchSchema);
};

module.exports = {
  masterPackingDispatchSchema,
  getMasterPackingDispatchModel,
  MODEL_NAME,
};
