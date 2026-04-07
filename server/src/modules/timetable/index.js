/**
 * Timetable module.
 *
 * School timetable generation: teacher-subject-class allocation, bell timings,
 * parallel subjects, conflict resolution, version management.
 */
const { mountRoutes } = require('./routes');
const models = require('./models');
const listeners = require('./listeners');

module.exports = {
  key: 'timetable',
  label: 'Timetable',
  mountRoutes,
  models,
  listeners,
};
