const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getDailyDuties, assignDailyDuties } = require('../controllers/dutiesController');
const {
  getDutySelections,
  saveDutySelections,
  getDutyAllocationMode,
  updateDutyAllocationMode,
} = require('../controllers/dutySelectionController');

const router = express.Router();

router.use(protect);

router.get('/', getDailyDuties);
router.post('/assign', authorize('admin', 'staff'), assignDailyDuties);

// Duty selections (pre-assignment)
router.get('/selections', getDutySelections);
router.post('/selections', authorize('admin', 'staff'), saveDutySelections);
router.get('/allocation-mode', getDutyAllocationMode);
router.put('/allocation-mode', authorize('admin', 'staff'), updateDutyAllocationMode);

module.exports = router;
