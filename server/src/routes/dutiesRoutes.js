const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getDailyDuties, assignDailyDuties } = require('../controllers/dutiesController');

const router = express.Router();

router.use(protect);

router.get('/', getDailyDuties);
router.post('/assign', authorize('admin', 'staff'), assignDailyDuties);

module.exports = router;
