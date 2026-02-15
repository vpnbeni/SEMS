const mongoose = require('mongoose');

const billingPlanSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true,
    default: '',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
  },
  amountMinor: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },
  trialDays: {
    type: Number,
    default: 14,
    min: 0,
  },
  features: {
    type: [String],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: 'billing_plans',
});

module.exports = mongoose.models.BillingPlan
  || mongoose.model('BillingPlan', billingPlanSchema);
