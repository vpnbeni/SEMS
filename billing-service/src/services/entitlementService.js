const {
  BillingAccount,
  BillingEntitlementSnapshot,
  BillingSubscription,
} = require('../models');
const {
  ACCESS_MODES,
  CORE_ALLOWED_MODULES,
  SUBSCRIPTION_STATES,
} = require('../domain/constants');
const { getTenantSubscription } = require('./subscriptionStateService');

const parseIntEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const addSeconds = (date, seconds) => {
  const copy = new Date(date.getTime());
  copy.setSeconds(copy.getSeconds() + seconds);
  return copy;
};

function computeAccessMode(state) {
  if (state === SUBSCRIPTION_STATES.TRIALING_CORE) {
    return ACCESS_MODES.CORE_ONLY;
  }

  if (
    state === SUBSCRIPTION_STATES.SUSPENDED_READ_ONLY
    || state === SUBSCRIPTION_STATES.CANCELED
  ) {
    return ACCESS_MODES.READ_ONLY;
  }

  return ACCESS_MODES.FULL;
}

function buildAllowedModules(accessMode) {
  if (accessMode === ACCESS_MODES.CORE_ONLY) {
    return CORE_ALLOWED_MODULES;
  }

  return ['*'];
}

async function computeEntitlement(tenantSlug) {
  const [account, subscription] = await Promise.all([
    BillingAccount.findOne({ tenantSlug }),
    getTenantSubscription(tenantSlug),
  ]);

  if (!account || !subscription) {
    return {
      tenantSlug,
      state: SUBSCRIPTION_STATES.SUSPENDED_READ_ONLY,
      accessMode: ACCESS_MODES.READ_ONLY,
      allowedModules: CORE_ALLOWED_MODULES,
      isReadOnly: true,
      reason: 'billing_account_missing',
      planCode: null,
      trialEndsAt: null,
      graceEndsAt: null,
      computedAt: new Date(),
      validUntil: addSeconds(new Date(), parseIntEnv('BILLING_ENTITLEMENT_TTL_SECONDS', 60)),
    };
  }

  const accessMode = computeAccessMode(subscription.state);
  const computedAt = new Date();
  const validUntil = addSeconds(computedAt, parseIntEnv('BILLING_ENTITLEMENT_TTL_SECONDS', 60));

  return {
    tenantSlug,
    state: subscription.state,
    accessMode,
    allowedModules: buildAllowedModules(accessMode),
    isReadOnly: accessMode === ACCESS_MODES.READ_ONLY,
    reason: subscription.state,
    planCode: subscription.planCode,
    trialEndsAt: subscription.trialEndAt,
    graceEndsAt: subscription.graceEndsAt,
    computedAt,
    validUntil,
  };
}

async function getEntitlement(tenantSlug) {
  const now = new Date();

  const snapshot = await BillingEntitlementSnapshot.findOne({
    tenantSlug,
    validUntil: { $gt: now },
  });

  if (snapshot) {
    return snapshot.toObject();
  }

  const entitlement = await computeEntitlement(tenantSlug);

  await BillingEntitlementSnapshot.findOneAndUpdate(
    { tenantSlug },
    { $set: entitlement },
    { upsert: true, new: true },
  );

  return entitlement;
}

async function markTenantActiveByProviderSubscription(providerSubscriptionId, providerPaymentId = '') {
  if (!providerSubscriptionId) return null;

  const subscription = await BillingSubscription.findOne({ providerSubscriptionId });
  if (!subscription) return null;

  subscription.state = SUBSCRIPTION_STATES.ACTIVE;
  subscription.graceEndsAt = null;

  const now = new Date();
  subscription.cycleStartAt = now;

  const nextCycle = new Date(now.getTime());
  nextCycle.setMonth(nextCycle.getMonth() + (subscription.planCode.includes('yearly') ? 12 : 1));
  subscription.cycleEndAt = nextCycle;

  await subscription.save();

  await BillingEntitlementSnapshot.deleteOne({ tenantSlug: subscription.tenantSlug });

  return {
    subscription,
    providerPaymentId,
  };
}

async function markTenantPastDueByProviderSubscription(providerSubscriptionId, _reason = 'payment_failed') {
  if (!providerSubscriptionId) return null;

  const subscription = await BillingSubscription.findOne({ providerSubscriptionId });
  if (!subscription) return null;

  const graceDays = parseIntEnv('BILLING_GRACE_DAYS', 7);
  const now = new Date();

  subscription.state = SUBSCRIPTION_STATES.PAST_DUE_GRACE;
  subscription.graceEndsAt = addSeconds(now, graceDays * 24 * 60 * 60);
  await subscription.save();

  await BillingEntitlementSnapshot.deleteOne({ tenantSlug: subscription.tenantSlug });

  return subscription;
}

async function markTenantCanceledByProviderSubscription(providerSubscriptionId) {
  if (!providerSubscriptionId) return null;

  const subscription = await BillingSubscription.findOne({ providerSubscriptionId });
  if (!subscription) return null;

  subscription.state = SUBSCRIPTION_STATES.CANCELED;
  subscription.canceledAt = new Date();
  await subscription.save();

  await BillingEntitlementSnapshot.deleteOne({ tenantSlug: subscription.tenantSlug });

  return subscription;
}

module.exports = {
  getEntitlement,
  computeEntitlement,
  markTenantActiveByProviderSubscription,
  markTenantPastDueByProviderSubscription,
  markTenantCanceledByProviderSubscription,
};
