const crypto = require('crypto');
const BaseAdapter = require('./baseAdapter');

class RazorpayAdapter extends BaseAdapter {
  constructor() {
    super('razorpay');
  }

  async createCustomer(account) {
    return {
      id: `cust_${account.tenantSlug}`,
      email: account.billingEmail,
      name: account.legalName || account.tenantName,
    };
  }

  async createOrUpdateSubscription(input) {
    return {
      id: input.providerSubscriptionId || `sub_${input.tenantSlug}_${Date.now()}`,
      status: input.state || 'created',
      planCode: input.planCode,
    };
  }

  async cancelSubscription(providerSubscriptionId, when = 'end_of_cycle') {
    return {
      id: providerSubscriptionId,
      canceled: true,
      when,
    };
  }

  async createPaymentLink(invoice) {
    const paymentLinkId = `plink_${invoice.invoiceNo}_${Date.now()}`;
    return {
      id: paymentLinkId,
      short_url: `https://rzp.io/i/${paymentLinkId}`,
      status: 'created',
      amount: invoice.totalMinor,
      currency: invoice.currency,
    };
  }

  async fetchPaymentStatus(providerPaymentId) {
    return {
      id: providerPaymentId,
      status: 'captured',
    };
  }

  verifyWebhookSignature(rawBody, signature, secret) {
    if (!signature || !secret || !rawBody) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  mapProviderEventToDomainEvent(event) {
    const eventType = event?.event || '';

    if (eventType === 'subscription.charged') {
      return {
        type: 'subscription_payment_succeeded',
        providerSubscriptionId: event.payload?.subscription?.entity?.id || '',
        providerPaymentId: event.payload?.payment?.entity?.id || '',
        occurredAt: new Date(),
      };
    }

    if (eventType === 'payment.failed' || eventType === 'subscription.halted') {
      return {
        type: 'subscription_payment_failed',
        providerSubscriptionId: event.payload?.subscription?.entity?.id || '',
        providerPaymentId: event.payload?.payment?.entity?.id || '',
        failureReason: event.payload?.payment?.entity?.error_description || 'payment_failed',
        occurredAt: new Date(),
      };
    }

    if (eventType === 'subscription.cancelled') {
      return {
        type: 'subscription_canceled',
        providerSubscriptionId: event.payload?.subscription?.entity?.id || '',
        occurredAt: new Date(),
      };
    }

    return {
      type: 'ignored',
      providerSubscriptionId: event.payload?.subscription?.entity?.id || '',
      occurredAt: new Date(),
    };
  }
}

module.exports = RazorpayAdapter;
