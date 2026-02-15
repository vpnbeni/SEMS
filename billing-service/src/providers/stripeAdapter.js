const BaseAdapter = require('./baseAdapter');

class StripeAdapter extends BaseAdapter {
  constructor() {
    super('stripe');
  }

  async createCustomer(_account) {
    throw new Error('Stripe adapter is not enabled in v1');
  }

  async createOrUpdateSubscription(_input) {
    throw new Error('Stripe adapter is not enabled in v1');
  }

  async cancelSubscription(_providerSubscriptionId, _when = 'end_of_cycle') {
    throw new Error('Stripe adapter is not enabled in v1');
  }

  async createPaymentLink(_invoice) {
    throw new Error('Stripe adapter is not enabled in v1');
  }

  async fetchPaymentStatus(_providerPaymentId) {
    throw new Error('Stripe adapter is not enabled in v1');
  }

  verifyWebhookSignature(_rawBody, _signature, _secret) {
    throw new Error('Stripe adapter is not enabled in v1');
  }

  mapProviderEventToDomainEvent(_event) {
    throw new Error('Stripe adapter is not enabled in v1');
  }
}

module.exports = StripeAdapter;
