const mongoose = require('mongoose');
const { WEBHOOK_STATES } = require('../domain/constants');

const billingWebhookEventSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    index: true,
  },
  eventId: {
    type: String,
    required: true,
    trim: true,
  },
  eventType: {
    type: String,
    required: true,
    trim: true,
  },
  signatureVerified: {
    type: Boolean,
    default: false,
  },
  payloadHash: {
    type: String,
    required: true,
  },
  processingState: {
    type: String,
    enum: Object.values(WEBHOOK_STATES),
    default: WEBHOOK_STATES.RECEIVED,
    index: true,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  error: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
  collection: 'billing_webhook_events',
});

billingWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.models.BillingWebhookEvent
  || mongoose.model('BillingWebhookEvent', billingWebhookEventSchema);
