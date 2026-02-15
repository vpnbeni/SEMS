const mongoose = require('mongoose');

const billingAccountSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  tenantSlug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  tenantName: {
    type: String,
    required: true,
    trim: true,
  },
  billingEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  legalName: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'IN' },
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
  },
  placeOfSupply: {
    type: String,
    trim: true,
    default: '',
  },
  hsnSacDefault: {
    type: String,
    trim: true,
    default: '998314',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  },
}, {
  timestamps: true,
  collection: 'billing_accounts',
});

module.exports = mongoose.models.BillingAccount
  || mongoose.model('BillingAccount', billingAccountSchema);
