const mongoose = require('mongoose');

const tenantUserDirectorySchema = new mongoose.Schema({
  tenantSlug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  tenantDbName: {
    type: String,
    required: true,
    trim: true
  },
  tenantUserId: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

tenantUserDirectorySchema.index({ email: 1, isActive: 1 });
tenantUserDirectorySchema.index({ tenantSlug: 1, isActive: 1 });
tenantUserDirectorySchema.index({ tenantDbName: 1 });
tenantUserDirectorySchema.index(
  { tenantSlug: 1, tenantUserId: 1 },
  { unique: true }
);

const MODEL_NAME = 'TenantUserDirectory';

const getTenantUserDirectoryModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get TenantUserDirectory model');
  }

  return connection.models[MODEL_NAME]
    || connection.model(MODEL_NAME, tenantUserDirectorySchema);
};

module.exports = {
  tenantUserDirectorySchema,
  getTenantUserDirectoryModel,
  MODEL_NAME
};
