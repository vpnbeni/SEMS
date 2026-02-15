const mongoose = require('mongoose');
const {
  SUBSCRIPTION_STATES,
  COLLECTION_MODES,
  PROVIDERS,
} = require('../domain/constants');

const billingSubscriptionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingAccount',
    required: true,
    index: true,
  },
  tenantSlug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  planCode: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  state: {
    type: String,
    enum: Object.values(SUBSCRIPTION_STATES),
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: Object.values(PROVIDERS),
    default: PROVIDERS.RAZORPAY,
  },
  providerSubscriptionId: {
    type: String,
    trim: true,
    default: '',
  },
  trialStartAt: {
    type: Date,
    default: null,
  },
  trialEndAt: {
    type: Date,
    default: null,
  },
  cycleStartAt: {
    type: Date,
    default: null,
  },
  cycleEndAt: {
    type: Date,
    default: null,
  },
  graceEndsAt: {
    type: Date,
    default: null,
    index: true,
  },
  grandfatherEndsAt: {
    type: Date,
    default: null,
  },
  collectionMode: {
    type: String,
    enum: Object.values(COLLECTION_MODES),
    default: COLLECTION_MODES.HYBRID,
  },
  addons: {
    type: [String],
    default: [],
  },
  couponCode: {
    type: String,
    default: '',
    trim: true,
    uppercase: true,
  },
  canceledAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  collection: 'billing_subscriptions',
});

billingSubscriptionSchema.index({ tenantSlug: 1, state: 1 });

module.exports = mongoose.models.BillingSubscription
  || mongoose.model('BillingSubscription', billingSubscriptionSchema);
