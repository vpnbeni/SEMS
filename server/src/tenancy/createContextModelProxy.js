const mongoose = require('mongoose');
const { getRequestContext } = require('./requestContext');

const createContextModelProxy = (modelName, schema) => {
  const getModel = (connection = mongoose.connection) => {
    return connection.models[modelName] || connection.model(modelName, schema);
  };

  const getActiveModel = () => {
    const context = getRequestContext();

    if (context?.models?.[modelName]) {
      return context.models[modelName];
    }

    return getModel();
  };

  const proxyTarget = function modelProxy(...args) {
    const Model = getActiveModel();
    return new Model(...args);
  };

  proxyTarget.modelName = modelName;
  proxyTarget.schema = schema;
  proxyTarget.getModel = getModel;
  proxyTarget.getActiveModel = getActiveModel;

  return new Proxy(proxyTarget, {
    get(target, prop) {
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop);
      }

      const Model = getActiveModel();
      const value = Model[prop];

      if (typeof value === 'function') {
        return value.bind(Model);
      }

      return value;
    },

    set(target, prop, value) {
      const Model = getActiveModel();
      Model[prop] = value;
      return true;
    },

    apply(target, thisArg, argArray) {
      const Model = getActiveModel();
      return Model(...argArray);
    },

    construct(target, argArray) {
      const Model = getActiveModel();
      return new Model(...argArray);
    },
  });
};

module.exports = createContextModelProxy;
