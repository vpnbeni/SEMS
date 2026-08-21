const express = require('express');
const { protect } = require('../middleware/auth');
const { requireTenantFeature } = require('../middleware/tenantFeatureAccess');
const {
  clubs,
  houses,
  tours,
  sports,
  functions,
  events,
  points,
  certificates,
  ranking,
} = require('../controllers/actvtController');

const mountCrud = (router, path, handlers) => {
  router.get(path, handlers.list);
  router.post(path, handlers.create);
  router.put(`${path}/:id`, handlers.update);
  router.delete(`${path}/:id`, handlers.remove);
};

const router = express.Router();
router.use(protect);
router.use(requireTenantFeature('actvt_activities'));

router.get('/clubs/:id/details', clubs.details);
mountCrud(router, '/clubs', clubs);
router.get('/houses/stats', houses.stats);
router.get('/houses/:id/details', houses.details);
mountCrud(router, '/houses', houses);
mountCrud(router, '/tours', tours);
mountCrud(router, '/sports', sports);
mountCrud(router, '/functions', functions);
mountCrud(router, '/events', events);
mountCrud(router, '/points', points);
router.get('/ranking', ranking.summary);
mountCrud(router, '/certificates', certificates);

module.exports = router;
