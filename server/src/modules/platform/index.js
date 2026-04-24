/**
 * Platform module — Central control plane.
 *
 * Platform admin operations: tenant management, master data curation,
 * data rollouts, feature flag defaults, billing administration.
 *
 * This module is NOT part of the tenant-scoped module registry. It mounts
 * its routes directly on the Express app with platformContextMiddleware.
 */
const { mountRoutes } = require('./routes');

module.exports = {
  key: 'platform',
  label: 'Platform Admin',
  mountRoutes,
};
