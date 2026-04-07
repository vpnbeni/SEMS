/**
 * Timetable module model barrel.
 *
 * Re-exports all model proxies that belong to the timetable module.
 * These models are registered only when at least one timetable feature is active.
 *
 * Canonical source of truth for timetable model ownership.
 * Keep in sync with MODULE_MODEL_KEYS.timetable in constants/moduleModelKeys.js.
 */
module.exports = {
  TimetableState: require('../../models/TimetableState'),
  TimetableVersion: require('../../models/TimetableVersion'),
};
