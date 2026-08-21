const express = require('express');
const { protect } = require('../middleware/auth');
const { requireTenantFeature } = require('../middleware/tenantFeatureAccess');
const { cases, supplies } = require('../controllers/mdclController');

const mountCrud = (router, path, handlers) => {
  router.get(path, handlers.list);
  router.post(path, handlers.create);
  router.put(`${path}/:id`, handlers.update);
  router.delete(`${path}/:id`, handlers.remove);
};

const router = express.Router();
router.use(protect);
router.use(requireTenantFeature('mdcl_clinic'));

mountCrud(router, '/cases', cases);
mountCrud(router, '/supplies', supplies);

module.exports = router;
