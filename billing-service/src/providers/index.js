const RazorpayAdapter = require('./razorpayAdapter');
const StripeAdapter = require('./stripeAdapter');

const getProviderAdapter = (provider = 'razorpay') => {
  if (provider === 'stripe') {
    return new StripeAdapter();
  }

  return new RazorpayAdapter();
};

module.exports = {
  getProviderAdapter,
};
