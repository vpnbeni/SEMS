const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getTimetableState,
  upsertTimetableState,
  getBellTimings,
  upsertBellTimings,
} = require('../controllers/timetableController');

const router = express.Router();

router.use(protect);

router.route('/state')
  .get(getTimetableState)
  .put(upsertTimetableState);

router.route('/bell-timings')
  .get(getBellTimings)
  .put(upsertBellTimings);

module.exports = router;
