/**
 * Core module — Shared kernel.
 *
 * Always active for every tenant. Provides auth, sessions, teachers, subjects,
 * rooms, dashboard, billing, support, export, and onboarding.
 */
const { mountRoutes } = require('./routes');
const models = require('./models');
const listeners = require('./listeners');

module.exports = {
  key: 'core',
  label: 'Core',
  mountRoutes,
  models,
  listeners,
};
