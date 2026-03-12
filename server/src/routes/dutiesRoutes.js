const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getDailyDuties,
  assignDailyDuties,
  downloadFunctionaryDutyRecord,
  rebuildAllSupervisionHistory,
  getReplacementCandidates,
} = require('../controllers/dutiesController');
const {
  getDutySelections,
  saveDutySelections,
  getDutyAllocationMode,
  updateDutyAllocationMode,
  getDutySelectionCounts,
} = require('../controllers/dutySelectionController');

const router = express.Router();

router.use(protect);

router.get('/', getDailyDuties);
router.post('/assign', authorize('admin', 'staff'), assignDailyDuties);
router.post('/replacement-candidates', authorize('admin', 'staff'), getReplacementCandidates);
router.get('/functionary-duty-record', downloadFunctionaryDutyRecord);

// Duty selections (pre-assignment)
router.get('/selections/counts', getDutySelectionCounts);
router.get('/selections', getDutySelections);
router.post('/selections', authorize('admin', 'staff'), saveDutySelections);
router.get('/allocation-mode', getDutyAllocationMode);
router.put('/allocation-mode', authorize('admin', 'staff'), updateDutyAllocationMode);

// Rebuild supervision history from existing duty assignments (migration/recovery)
router.post('/rebuild-supervision-history', authorize('admin'), rebuildAllSupervisionHistory);

module.exports = router;
