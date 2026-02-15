const mongoose = require('mongoose');

const billingCouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed_minor'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  durationType: {
    type: String,
    enum: ['one_time', 'forever', 'repeating'],
    default: 'one_time',
  },
  durationInMonths: {
    type: Number,
    min: 1,
    default: null,
  },
  maxRedemptions: {
    type: Number,
    min: 1,
    default: null,
  },
  redemptions: {
    type: Number,
    min: 0,
    default: 0,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: 'billing_coupons',
});

module.exports = mongoose.models.BillingCoupon
  || mongoose.model('BillingCoupon', billingCouponSchema);
