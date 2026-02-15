const HttpError = require('../utils/httpError');
const {
  BillingAccount,
  BillingAddon,
  BillingCoupon,
  BillingInvoice,
  BillingPlan,
  BillingSubscription,
} = require('../models');
const { getEntitlement } = require('../services/entitlementService');
const {
  onboardTenantWithTrial,
  grandfatherTenant,
} = require('../services/onboardingService');
const { createPaymentLinkForTenant } = require('../services/invoiceService');

const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const onboardTenant = async (req, res) => {
  const {
    tenantId,
    tenantSlug,
    tenantName,
    billingEmail,
    planCode,
  } = req.body;

  if (!tenantId || !tenantSlug || !tenantName || !billingEmail) {
    throw new HttpError(400, 'tenantId, tenantSlug, tenantName and billingEmail are required');
  }

  const result = await onboardTenantWithTrial({
    tenantId,
    tenantSlug,
    tenantName,
    billingEmail,
    planCode,
  });

  const entitlement = await getEntitlement(tenantSlug);

  return res.status(200).json({
    success: true,
    message: 'Tenant billing onboarding completed',
    data: {
      account: result.account,
      subscription: result.subscription,
      entitlement,
    },
  });
};

const grandfatherTenantHandler = async (req, res) => {
  const {
    tenantId,
    tenantSlug,
    tenantName,
    billingEmail,
    days,
  } = req.body;

  if (!tenantId || !tenantSlug || !tenantName || !billingEmail) {
    throw new HttpError(400, 'tenantId, tenantSlug, tenantName and billingEmail are required');
  }

  const result = await grandfatherTenant({
    tenantId,
    tenantSlug,
    tenantName,
    billingEmail,
    days,
  });

  const entitlement = await getEntitlement(tenantSlug);

  return res.status(200).json({
    success: true,
    message: 'Tenant marked as grandfathered',
    data: {
      account: result.account,
      subscription: result.subscription,
      entitlement,
    },
  });
};

const getTenantEntitlement = async (req, res) => {
  const { tenantSlug } = req.params;

  const entitlement = await getEntitlement(tenantSlug);

  res.status(200).json({
    success: true,
    data: entitlement,
  });
};

const getTenantBilling = async (req, res) => {
  const { tenantSlug } = req.params;

  const [account, subscription, entitlement] = await Promise.all([
    BillingAccount.findOne({ tenantSlug }),
    BillingSubscription.findOne({ tenantSlug }),
    getEntitlement(tenantSlug),
  ]);

  if (!account || !subscription) {
    throw new HttpError(404, 'Billing data not found for tenant');
  }

  res.status(200).json({
    success: true,
    data: {
      account,
      subscription,
      entitlement,
    },
  });
};

const listTenantInvoices = async (req, res) => {
  const { tenantSlug } = req.params;

  const invoices = await BillingInvoice.find({ tenantSlug }).sort({ createdAt: -1 }).limit(200);

  res.status(200).json({
    success: true,
    data: invoices,
  });
};

const payNow = async (req, res) => {
  const { tenantSlug } = req.params;
  const result = await createPaymentLinkForTenant(tenantSlug);

  res.status(200).json({
    success: true,
    message: 'Payment link generated',
    data: result,
  });
};

const updateTenantProfile = async (req, res) => {
  const { tenantSlug } = req.params;
  const {
    billingEmail,
    legalName,
    address,
    gstin,
    placeOfSupply,
    hsnSacDefault,
  } = req.body;

  const account = await BillingAccount.findOneAndUpdate(
    { tenantSlug },
    {
      $set: {
        ...(billingEmail !== undefined ? { billingEmail: String(billingEmail).trim().toLowerCase() } : {}),
        ...(legalName !== undefined ? { legalName } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(gstin !== undefined ? { gstin: String(gstin).trim().toUpperCase() } : {}),
        ...(placeOfSupply !== undefined ? { placeOfSupply } : {}),
        ...(hsnSacDefault !== undefined ? { hsnSacDefault } : {}),
      },
    },
    { new: true },
  );

  if (!account) {
    throw new HttpError(404, 'Billing account not found');
  }

  res.status(200).json({
    success: true,
    data: account,
  });
};

const listBillingTenants = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = String(req.query.search || '').trim();

  const query = search
    ? {
      $or: [
        { tenantSlug: { $regex: search, $options: 'i' } },
        { tenantName: { $regex: search, $options: 'i' } },
        { billingEmail: { $regex: search, $options: 'i' } },
      ],
    }
    : {};

  const [accounts, total] = await Promise.all([
    BillingAccount.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BillingAccount.countDocuments(query),
  ]);

  const slugs = accounts.map((item) => item.tenantSlug);
  const subscriptions = await BillingSubscription.find({ tenantSlug: { $in: slugs } }).lean();
  const subMap = new Map(subscriptions.map((item) => [item.tenantSlug, item]));

  const items = await Promise.all(accounts.map(async (account) => {
    const subscription = subMap.get(account.tenantSlug) || null;
    const entitlement = await getEntitlement(account.tenantSlug);
    return {
      account,
      subscription,
      entitlement,
    };
  }));

  res.status(200).json({
    success: true,
    data: {
      items,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  });
};

const getBillingTenantById = async (req, res) => {
  const { tenantId } = req.params;

  const account = await BillingAccount.findOne({ tenantId });
  if (!account) {
    throw new HttpError(404, 'Billing account not found');
  }

  const [subscription, invoices, entitlement] = await Promise.all([
    BillingSubscription.findOne({ tenantSlug: account.tenantSlug }),
    BillingInvoice.find({ tenantSlug: account.tenantSlug }).sort({ createdAt: -1 }).limit(50),
    getEntitlement(account.tenantSlug),
  ]);

  res.status(200).json({
    success: true,
    data: {
      account,
      subscription,
      invoices,
      entitlement,
    },
  });
};

const changeTenantPlan = async (req, res) => {
  const { tenantId } = req.params;
  const { planCode } = req.body;

  if (!planCode) {
    throw new HttpError(400, 'planCode is required');
  }

  const plan = await BillingPlan.findOne({ code: String(planCode).toLowerCase(), isActive: true });
  if (!plan) {
    throw new HttpError(404, 'Plan not found or inactive');
  }

  const account = await BillingAccount.findOne({ tenantId });
  if (!account) {
    throw new HttpError(404, 'Billing account not found');
  }

  const subscription = await BillingSubscription.findOneAndUpdate(
    { tenantSlug: account.tenantSlug },
    {
      $set: {
        planCode: plan.code,
      },
    },
    { new: true },
  );

  const entitlement = await getEntitlement(account.tenantSlug);

  res.status(200).json({
    success: true,
    message: 'Plan changed successfully',
    data: {
      subscription,
      entitlement,
    },
  });
};

const grantTenantExtension = async (req, res) => {
  const { tenantId } = req.params;
  const extensionDays = Math.max(Number.parseInt(req.body.days || '0', 10), 1);

  const account = await BillingAccount.findOne({ tenantId });
  if (!account) {
    throw new HttpError(404, 'Billing account not found');
  }

  const subscription = await BillingSubscription.findOne({ tenantSlug: account.tenantSlug });
  if (!subscription) {
    throw new HttpError(404, 'Billing subscription not found');
  }

  const now = new Date();
  const base = subscription.graceEndsAt || subscription.grandfatherEndsAt || subscription.trialEndAt || now;
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + extensionDays);

  if (subscription.state === 'past_due_grace' || subscription.state === 'suspended_read_only') {
    subscription.state = 'past_due_grace';
    subscription.graceEndsAt = next;
  } else if (subscription.state === 'trialing_core') {
    subscription.trialEndAt = next;
  } else {
    subscription.grandfatherEndsAt = next;
    subscription.state = 'grandfathered';
  }

  await subscription.save();

  const entitlement = await getEntitlement(account.tenantSlug);

  res.status(200).json({
    success: true,
    message: `Extension granted for ${extensionDays} day(s)`,
    data: {
      subscription,
      entitlement,
    },
  });
};

const createPlan = async (req, res) => {
  const payload = {
    ...req.body,
    code: String(req.body.code || '').trim().toLowerCase(),
    currency: String(req.body.currency || process.env.BILLING_DEFAULT_CURRENCY || 'INR').toUpperCase(),
  };

  if (!payload.code || !payload.name || !payload.billingCycle || payload.amountMinor === undefined) {
    throw new HttpError(400, 'code, name, billingCycle and amountMinor are required');
  }

  const plan = await BillingPlan.findOneAndUpdate(
    { code: payload.code },
    { $set: payload },
    { upsert: true, new: true },
  );

  res.status(201).json({
    success: true,
    data: plan,
  });
};

const createCoupon = async (req, res) => {
  const payload = {
    ...req.body,
    code: String(req.body.code || '').trim().toUpperCase(),
  };

  if (!payload.code || !payload.discountType || payload.discountValue === undefined) {
    throw new HttpError(400, 'code, discountType and discountValue are required');
  }

  const coupon = await BillingCoupon.findOneAndUpdate(
    { code: payload.code },
    { $set: payload },
    { upsert: true, new: true },
  );

  res.status(201).json({
    success: true,
    data: coupon,
  });
};

const createAddon = async (req, res) => {
  const payload = {
    ...req.body,
    code: String(req.body.code || '').trim().toLowerCase(),
  };

  if (!payload.code || !payload.name || payload.amountMinor === undefined) {
    throw new HttpError(400, 'code, name and amountMinor are required');
  }

  const addon = await BillingAddon.findOneAndUpdate(
    { code: payload.code },
    { $set: payload },
    { upsert: true, new: true },
  );

  res.status(201).json({
    success: true,
    data: addon,
  });
};

module.exports = {
  onboardTenant,
  grandfatherTenantHandler,
  getTenantEntitlement,
  getTenantBilling,
  listTenantInvoices,
  payNow,
  updateTenantProfile,
  listBillingTenants,
  getBillingTenantById,
  changeTenantPlan,
  grantTenantExtension,
  createPlan,
  createCoupon,
  createAddon,
};
