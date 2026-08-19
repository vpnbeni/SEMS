const express = require('express');
const { protect } = require('../middleware/auth');
const { listAlumni, syncAlumni } = require('../controllers/almniController');
const { requireTenantFeature } = require('../middleware/tenantFeatureAccess');

const router = express.Router();

router.use(protect);
router.use(requireTenantFeature('almni_directory'));

router.get('/', listAlumni);
router.post('/sync', syncAlumni);

module.exports = router;
