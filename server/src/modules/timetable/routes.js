/**
 * Timetable module route registrar.
 *
 * Mounts the timetable route. Available only when the tenant has at least
 * one timetable feature enabled.
 */
const { requireTenantFeature } = require('../../middleware/tenantFeatureAccess');

const timetableRoutes = require('../../routes/timetableRoutes');

const mountRoutes = (router) => {
  router.use('/timetable', requireTenantFeature('timetable_classes'), timetableRoutes);
};

module.exports = { mountRoutes };
