const { BillingSubscription } = require('../models');
const { SUBSCRIPTION_STATES } = require('../domain/constants');

const parseIntEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const addDays = (date, days) => {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
};

async function normalizeSubscriptionState(subscription) {
  if (!subscription) {
    return null;
  }

  const now = new Date();
  const graceDays = parseIntEnv('BILLING_GRACE_DAYS', 7);
  let hasChanges = false;

  if (
    subscription.state === SUBSCRIPTION_STATES.TRIALING_CORE
    && subscription.trialEndAt
    && subscription.trialEndAt.getTime() < now.getTime()
  ) {
    subscription.state = SUBSCRIPTION_STATES.PAST_DUE_GRACE;
    subscription.graceEndsAt = addDays(subscription.trialEndAt, graceDays);
    hasChanges = true;
  }

  if (
    subscription.state === SUBSCRIPTION_STATES.GRANDFATHERED
    && subscription.grandfatherEndsAt
    && subscription.grandfatherEndsAt.getTime() < now.getTime()
  ) {
    subscription.state = SUBSCRIPTION_STATES.PAST_DUE_GRACE;
    subscription.graceEndsAt = addDays(subscription.grandfatherEndsAt, graceDays);
    hasChanges = true;
  }

  if (
    subscription.state === SUBSCRIPTION_STATES.ACTIVE
    && subscription.cycleEndAt
    && subscription.cycleEndAt.getTime() < now.getTime()
  ) {
    subscription.state = SUBSCRIPTION_STATES.PAST_DUE_GRACE;
    subscription.graceEndsAt = addDays(subscription.cycleEndAt, graceDays);
    hasChanges = true;
  }

  if (
    subscription.state === SUBSCRIPTION_STATES.PAST_DUE_GRACE
    && subscription.graceEndsAt
    && subscription.graceEndsAt.getTime() < now.getTime()
  ) {
    subscription.state = SUBSCRIPTION_STATES.SUSPENDED_READ_ONLY;
    hasChanges = true;
  }

  if (subscription.state === SUBSCRIPTION_STATES.CANCELED) {
    // Canceled subscriptions become read-only once their cycle is over.
    if (!subscription.cycleEndAt || subscription.cycleEndAt.getTime() < now.getTime()) {
      subscription.state = SUBSCRIPTION_STATES.SUSPENDED_READ_ONLY;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await subscription.save();
  }

  return subscription;
}

async function getTenantSubscription(tenantSlug) {
  const subscription = await BillingSubscription.findOne({ tenantSlug });
  return normalizeSubscriptionState(subscription);
}

module.exports = {
  getTenantSubscription,
  normalizeSubscriptionState,
};
