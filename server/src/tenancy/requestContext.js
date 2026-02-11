const { AsyncLocalStorage } = require('async_hooks');

const requestContext = new AsyncLocalStorage();

const requestContextMiddleware = (req, res, next) => {
  requestContext.run({}, () => {
    next();
  });
};

const getRequestContext = () => requestContext.getStore() || null;

const setRequestContext = (data = {}) => {
  const store = requestContext.getStore();
  if (!store) {
    return;
  }

  Object.assign(store, data);
};

module.exports = {
  requestContextMiddleware,
  getRequestContext,
  setRequestContext,
};
