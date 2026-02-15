const mongoose = require('mongoose');

const billingEntitlementSnapshotSchema = new mongoose.Schema({
  tenantSlug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  accessMode: {
    type: String,
    required: true,
  },
  allowedModules: {
    type: [String],
    default: [],
  },
  isReadOnly: {
    type: Boolean,
    default: false,
  },
  reason: {
    type: String,
    default: '',
  },
  state: {
    type: String,
    required: true,
  },
  planCode: {
    type: String,
    default: '',
  },
  trialEndsAt: {
    type: Date,
    default: null,
  },
  graceEndsAt: {
    type: Date,
    default: null,
  },
  validUntil: {
    type: Date,
    required: true,
    index: true,
  },
  computedAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
  collection: 'billing_entitlement_snapshots',
});

module.exports = mongoose.models.BillingEntitlementSnapshot
  || mongoose.model('BillingEntitlementSnapshot', billingEntitlementSnapshotSchema);
