const SUBSCRIPTION_STATES = {
  TRIALING_CORE: 'trialing_core',
  ACTIVE: 'active',
  PAST_DUE_GRACE: 'past_due_grace',
  SUSPENDED_READ_ONLY: 'suspended_read_only',
  GRANDFATHERED: 'grandfathered',
  CANCELED: 'canceled',
};

const ACCESS_MODES = {
  FULL: 'full',
  CORE_ONLY: 'core_only',
  READ_ONLY: 'read_only',
};

const COLLECTION_MODES = {
  AUTO_DEBIT: 'auto_debit',
  MANUAL_LINK: 'manual_link',
  HYBRID: 'hybrid_auto_manual',
};

const PROVIDERS = {
  RAZORPAY: 'razorpay',
  STRIPE: 'stripe',
};

const INVOICE_STATUSES = {
  DRAFT: 'draft',
  OPEN: 'open',
  PAID: 'paid',
  VOID: 'void',
  OVERDUE: 'overdue',
};

const PAYMENT_STATUSES = {
  INITIATED: 'initiated',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const WEBHOOK_STATES = {
  RECEIVED: 'received',
  PROCESSED: 'processed',
  IGNORED: 'ignored',
  FAILED: 'failed',
};

const CORE_ALLOWED_MODULES = ['dashboard', 'candidates', 'subjects', 'datesheets', 'billing', 'auth'];

module.exports = {
  SUBSCRIPTION_STATES,
  ACCESS_MODES,
  COLLECTION_MODES,
  PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  WEBHOOK_STATES,
  CORE_ALLOWED_MODULES,
};
