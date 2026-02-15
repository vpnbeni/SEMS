const mongoose = require('mongoose');
const { PAYMENT_STATUSES } = require('../domain/constants');

const billingPaymentSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingInvoice',
    required: true,
    index: true,
  },
  provider: {
    type: String,
    required: true,
    default: 'razorpay',
  },
  providerPaymentId: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  providerPaymentLinkId: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUSES),
    default: PAYMENT_STATUSES.INITIATED,
    index: true,
  },
  amountMinor: {
    type: Number,
    required: true,
    min: 0,
  },
  attemptNo: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  method: {
    type: String,
    default: '',
  },
  failureCode: {
    type: String,
    default: '',
  },
  failureReason: {
    type: String,
    default: '',
  },
  capturedAt: {
    type: Date,
    default: null,
  },
  metadata: {
    type: Object,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'billing_payments',
});

module.exports = mongoose.models.BillingPayment
  || mongoose.model('BillingPayment', billingPaymentSchema);
