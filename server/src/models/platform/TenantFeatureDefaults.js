const mongoose = require('mongoose');

const tenantFeatureDefaultsSchema = new mongoose.Schema({
  toggles: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
}, {
  timestamps: true,
});

tenantFeatureDefaultsSchema.index({ isActive: 1 });

const MODEL_NAME = 'TenantFeatureDefaults';

const getTenantFeatureDefaultsModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get TenantFeatureDefaults model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, tenantFeatureDefaultsSchema);
};

module.exports = {
  tenantFeatureDefaultsSchema,
  getTenantFeatureDefaultsModel,
  MODEL_NAME,
};
