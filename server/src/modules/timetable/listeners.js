/**
 * Timetable module event listeners.
 *
 * Reacts to core teacher events (deactivated/deleted/updated) by syncing
 * the local teacher snapshots inside TimetableState documents.
 */
const timetableListeners = require('../../events/listeners/timetableListeners');

const register = (eventBus) => {
  timetableListeners.register(eventBus);
};

module.exports = { register };
