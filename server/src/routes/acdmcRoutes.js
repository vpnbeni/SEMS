const express = require('express');
const { protect } = require('../middleware/auth');
const { requireTenantFeature } = require('../middleware/tenantFeatureAccess');
const { lessonPlans, homework, assignments, quizzes, curriculum } = require('../controllers/acdmcController');

const mountCrud = (router, path, handlers) => {
  router.get(path, handlers.list);
  router.post(path, handlers.create);
  router.put(`${path}/:id`, handlers.update);
  router.delete(`${path}/:id`, handlers.remove);
};

const router = express.Router();
router.use(protect);
router.use(requireTenantFeature('acdmc_academics'));

mountCrud(router, '/lesson-plans', lessonPlans);
mountCrud(router, '/homework', homework);
mountCrud(router, '/assignments', assignments);
mountCrud(router, '/quizzes', quizzes);
mountCrud(router, '/curriculum', curriculum);

module.exports = router;
