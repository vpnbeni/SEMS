class BaseAdapter {
  constructor(name) {
    this.name = name;
  }

  async createCustomer(_account) {
    throw new Error('createCustomer not implemented');
  }

  async createOrUpdateSubscription(_input) {
    throw new Error('createOrUpdateSubscription not implemented');
  }

  async cancelSubscription(_providerSubscriptionId, _when) {
    throw new Error('cancelSubscription not implemented');
  }

  async createPaymentLink(_invoice) {
    throw new Error('createPaymentLink not implemented');
  }

  async fetchPaymentStatus(_providerPaymentId) {
    throw new Error('fetchPaymentStatus not implemented');
  }

  verifyWebhookSignature(_rawBody, _signature, _secret) {
    throw new Error('verifyWebhookSignature not implemented');
  }

  mapProviderEventToDomainEvent(_event) {
    throw new Error('mapProviderEventToDomainEvent not implemented');
  }
}

module.exports = BaseAdapter;
