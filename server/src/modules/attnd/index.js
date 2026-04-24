/**
 * ATTND module — Attendance Management.
 */
const { mountRoutes } = require('./routes');

module.exports = {
  key: 'attnd',
  label: 'ATTND — Attendance Management',
  mountRoutes,
  models: {},
  listeners: [],
};
