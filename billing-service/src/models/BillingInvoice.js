const mongoose = require('mongoose');
const { INVOICE_STATUSES } = require('../domain/constants');

const lineItemSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitAmountMinor: { type: Number, required: true, min: 0 },
  amountMinor: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, required: true, min: 0, default: 0 },
  taxAmountMinor: { type: Number, required: true, min: 0, default: 0 },
  hsnSac: { type: String, trim: true, default: '998314' },
}, { _id: false });

const billingInvoiceSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  tenantSlug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingAccount',
    required: true,
    index: true,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingSubscription',
    required: true,
    index: true,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  lineItems: {
    type: [lineItemSchema],
    default: [],
  },
  subtotalMinor: {
    type: Number,
    required: true,
    min: 0,
  },
  taxMinor: {
    type: Number,
    required: true,
    min: 0,
  },
  totalMinor: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },
  status: {
    type: String,
    enum: Object.values(INVOICE_STATUSES),
    default: INVOICE_STATUSES.OPEN,
    index: true,
  },
  dueAt: {
    type: Date,
    required: true,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  pdfUrl: {
    type: String,
    default: '',
  },
  providerInvoiceId: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
  collection: 'billing_invoices',
});

module.exports = mongoose.models.BillingInvoice
  || mongoose.model('BillingInvoice', billingInvoiceSchema);
