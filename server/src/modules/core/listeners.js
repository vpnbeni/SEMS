/**
 * Core module event listeners.
 *
 * The logging listener is part of the core module because it observes
 * ALL events across ALL modules for debugging/auditing purposes.
 */
const loggingListener = require('../../events/listeners/loggingListener');

const register = (eventBus) => {
  loggingListener.register(eventBus);
};

module.exports = { register };
