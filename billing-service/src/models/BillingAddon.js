const mongoose = require('mongoose');

const billingAddonSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amountMinor: {
    type: Number,
    required: true,
    min: 0,
  },
  cycle: {
    type: String,
    enum: ['monthly', 'yearly', 'one_time'],
    default: 'monthly',
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: 'billing_addons',
});

module.exports = mongoose.models.BillingAddon
  || mongoose.model('BillingAddon', billingAddonSchema);
