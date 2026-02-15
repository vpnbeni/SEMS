const HttpError = require('../utils/httpError');

const ensureServiceAuth = (req, _res, next) => {
  const expected = process.env.BILLING_SERVICE_TOKEN;
  if (!expected) {
    return next();
  }

  const received = req.headers['x-billing-service-token'];
  if (!received || received !== expected) {
    return next(new HttpError(401, 'Invalid service credentials'));
  }

  return next();
};

module.exports = {
  ensureServiceAuth,
};
