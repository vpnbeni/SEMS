const {
  BillingAccount,
  BillingInvoice,
  BillingPayment,
  BillingPlan,
  BillingSubscription,
} = require('../models');
const { INVOICE_STATUSES, PAYMENT_STATUSES } = require('../domain/constants');
const { getProviderAdapter } = require('../providers');

const TAX_RATE = 0.18;

const formatDatePart = (value) => String(value).padStart(2, '0');

const buildInvoiceNo = async () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = formatDatePart(now.getMonth() + 1);
  const prefix = `INV-${y}${m}`;
  const count = await BillingInvoice.countDocuments({ invoiceNo: { $regex: `^${prefix}` } });
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
};

async function ensureOpenInvoiceForTenant(tenantSlug) {
  const [account, subscription] = await Promise.all([
    BillingAccount.findOne({ tenantSlug }),
    BillingSubscription.findOne({ tenantSlug }),
  ]);

  if (!account || !subscription) {
    throw new Error('Billing account or subscription not found');
  }

  const existing = await BillingInvoice.findOne({
    tenantSlug,
    status: { $in: [INVOICE_STATUSES.OPEN, INVOICE_STATUSES.OVERDUE] },
  }).sort({ createdAt: -1 });

  if (existing) {
    return existing;
  }

  const plan = await BillingPlan.findOne({ code: subscription.planCode });
  if (!plan) {
    throw new Error(`Billing plan '${subscription.planCode}' not found`);
  }

  const invoiceNo = await buildInvoiceNo();
  const subtotalMinor = plan.amountMinor;
  const taxMinor = Math.round(subtotalMinor * TAX_RATE);
  const totalMinor = subtotalMinor + taxMinor;

  const now = new Date();
  const dueAt = new Date(now.getTime());
  dueAt.setDate(dueAt.getDate() + 1);

  const lineItems = [
    {
      code: plan.code,
      description: `${plan.name} subscription`,
      quantity: 1,
      unitAmountMinor: subtotalMinor,
      amountMinor: subtotalMinor,
      taxRate: TAX_RATE,
      taxAmountMinor: taxMinor,
      hsnSac: account.hsnSacDefault || '998314',
    },
  ];

  const invoice = await BillingInvoice.create({
    invoiceNo,
    tenantSlug,
    accountId: account._id,
    subscriptionId: subscription._id,
    periodStart: now,
    periodEnd: now,
    lineItems,
    subtotalMinor,
    taxMinor,
    totalMinor,
    currency: plan.currency,
    status: INVOICE_STATUSES.OPEN,
    dueAt,
  });

  return invoice;
}

async function createPaymentLinkForTenant(tenantSlug) {
  const invoice = await ensureOpenInvoiceForTenant(tenantSlug);
  const subscription = await BillingSubscription.findById(invoice.subscriptionId);

  const adapter = getProviderAdapter(subscription?.provider || 'razorpay');
  const link = await adapter.createPaymentLink(invoice);

  const attempts = await BillingPayment.countDocuments({ invoiceId: invoice._id });

  const payment = await BillingPayment.create({
    invoiceId: invoice._id,
    provider: subscription?.provider || 'razorpay',
    providerPaymentId: '',
    providerPaymentLinkId: link.id,
    status: PAYMENT_STATUSES.INITIATED,
    amountMinor: invoice.totalMinor,
    attemptNo: attempts + 1,
    metadata: {
      paymentLinkUrl: link.short_url,
    },
  });

  return {
    invoice,
    payment,
    paymentLink: {
      id: link.id,
      url: link.short_url,
    },
  };
}

module.exports = {
  ensureOpenInvoiceForTenant,
  createPaymentLinkForTenant,
};
