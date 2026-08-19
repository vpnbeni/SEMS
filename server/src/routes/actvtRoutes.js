const express = require('express');
const { protect } = require('../middleware/auth');
const { requireTenantFeature } = require('../middleware/tenantFeatureAccess');
const { clubs, houses, tours, sports, functions } = require('../controllers/actvtController');

const mountCrud = (router, path, handlers) => {
  router.get(path, handlers.list);
  router.post(path, handlers.create);
  router.put(`${path}/:id`, handlers.update);
  router.delete(`${path}/:id`, handlers.remove);
};

const router = express.Router();
router.use(protect);
router.use(requireTenantFeature('actvt_activities'));

mountCrud(router, '/clubs', clubs);
mountCrud(router, '/houses', houses);
mountCrud(router, '/tours', tours);
mountCrud(router, '/sports', sports);
mountCrud(router, '/functions', functions);

module.exports = router;
