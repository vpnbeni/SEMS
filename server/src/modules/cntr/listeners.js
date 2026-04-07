/**
 * Cntr module event listeners — Exam Centre Management.
 *
 * Duty listeners react to core teacher events (deactivated/deleted)
 * by updating future DutyAssignment records for the affected tenant.
 */
const dutyListeners = require('../../events/listeners/dutyListeners');

const register = (eventBus) => {
  dutyListeners.register(eventBus);
};

module.exports = { register };
