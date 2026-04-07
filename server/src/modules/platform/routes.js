/**
 * Platform module route registrar — Central control plane.
 *
 * Mounts admin routes with platformContextMiddleware. These routes serve
 * the platform admin panel (tenant CRUD, master data, rollouts, billing).
 *
 * Unlike tenant modules, platform routes mount directly on the Express app
 * (not on the tenantScopedRouter) because they use platformContextMiddleware
 * instead of tenantContextMiddleware.
 */
const { platformContextMiddleware } = require('../../tenancy/tenantContextMiddleware');
const adminRoutes = require('../../routes/adminRoutes');

const mountRoutes = (app) => {
  app.use('/api/admin', platformContextMiddleware, adminRoutes);
};

module.exports = { mountRoutes };
