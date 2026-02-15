const crypto = require('crypto');
const {
  BillingWebhookEvent,
} = require('../models');
const { getProviderAdapter } = require('../providers');
const {
  markTenantActiveByProviderSubscription,
  markTenantPastDueByProviderSubscription,
  markTenantCanceledByProviderSubscription,
} = require('../services/entitlementService');

const computePayloadHash = (rawBody) => crypto
  .createHash('sha256')
  .update(rawBody || Buffer.from(''))
  .digest('hex');

const processDomainEvent = async (domainEvent) => {
  if (!domainEvent || domainEvent.type === 'ignored') {
    return 'ignored';
  }

  if (domainEvent.type === 'subscription_payment_succeeded') {
    await markTenantActiveByProviderSubscription(
      domainEvent.providerSubscriptionId,
      domainEvent.providerPaymentId,
    );
    return 'processed';
  }

  if (domainEvent.type === 'subscription_payment_failed') {
    await markTenantPastDueByProviderSubscription(
      domainEvent.providerSubscriptionId,
      domainEvent.failureReason,
    );
    return 'processed';
  }

  if (domainEvent.type === 'subscription_canceled') {
    await markTenantCanceledByProviderSubscription(domainEvent.providerSubscriptionId);
    return 'processed';
  }

  return 'ignored';
};

const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody;
  const payloadHash = computePayloadHash(rawBody);

  const adapter = getProviderAdapter('razorpay');
  const signatureVerified = adapter.verifyWebhookSignature(
    rawBody,
    signature,
    process.env.RAZORPAY_WEBHOOK_SECRET || '',
  );

  if (!signatureVerified) {
    return res.status(401).json({
      success: false,
      message: 'Invalid webhook signature',
    });
  }

  const event = req.body || {};
  const eventId = String(event?.payload?.payment?.entity?.id || event?.contains?.[0] || event?.event || payloadHash);

  let record;
  try {
    record = await BillingWebhookEvent.create({
      provider: 'razorpay',
      eventId,
      eventType: event.event || 'unknown',
      signatureVerified,
      payloadHash,
      processingState: 'received',
      receivedAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({
        success: true,
        message: 'Duplicate webhook ignored',
      });
    }

    throw error;
  }

  try {
    const domainEvent = adapter.mapProviderEventToDomainEvent(event);
    const state = await processDomainEvent(domainEvent);

    record.processingState = state;
    record.processedAt = new Date();
    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    record.processingState = 'failed';
    record.error = error.message;
    record.processedAt = new Date();
    await record.save();

    throw error;
  }
};

module.exports = {
  handleRazorpayWebhook,
};
