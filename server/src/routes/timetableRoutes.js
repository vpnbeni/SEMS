const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getTimetableState,
  upsertTimetableState,
  getBellTimings,
  upsertBellTimings,
  generateTimetable,
  getVersions,
  getVersion,
  publishVersion,
  archiveVersion,
  deleteVersion,
  exportVersionExcel,
  exportVersionClassPDF,
  exportVersionTeacherPDF,
} = require('../controllers/timetableController');

const router = express.Router();

router.use(protect);

// ── Existing configuration endpoints ────────────────────────────────────────
router.route('/state').get(getTimetableState).put(upsertTimetableState);
router.route('/bell-timings').get(getBellTimings).put(upsertBellTimings);

// ── Generation ───────────────────────────────────────────────────────────────
router.post('/generate', generateTimetable);

// ── Version management ───────────────────────────────────────────────────────
router.route('/versions').get(getVersions);
router.route('/versions/:id').get(getVersion).delete(deleteVersion);
router.put('/versions/:id/publish', publishVersion);
router.put('/versions/:id/archive', archiveVersion);

// ── Exports ──────────────────────────────────────────────────────────────────
router.get('/versions/:id/export/excel', exportVersionExcel);
router.get('/versions/:id/export/class-pdf', exportVersionClassPDF);
router.get('/versions/:id/export/class-pdf/:classId', exportVersionClassPDF);
router.get('/versions/:id/export/teacher-pdf/:teacherId', exportVersionTeacherPDF);

module.exports = router;
