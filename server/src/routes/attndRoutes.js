const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getStaffDirectory,
  getStudentDirectory,
  getStudentFilters,
  getStaffAttendance,
  saveStaffAttendance,
  getStudentAttendance,
  saveStudentAttendance,
  getDashboard,
} = require('../controllers/attndController');
const { requireTenantFeature, requireAnyTenantFeature } = require('../middleware/tenantFeatureAccess');

const router = express.Router();

router.use(protect);

router.get(
  '/dashboard',
  requireAnyTenantFeature('attnd_staff_attendance', 'attnd_student_attendance'),
  getDashboard
);

router.get('/staff-directory', requireTenantFeature('attnd_staff_attendance'), getStaffDirectory);
router.get('/student-directory', requireTenantFeature('attnd_student_attendance'), getStudentDirectory);
router.get('/student-filters', requireTenantFeature('attnd_student_attendance'), getStudentFilters);

router.get('/staff', requireTenantFeature('attnd_staff_attendance'), getStaffAttendance);
router.put('/staff', requireTenantFeature('attnd_staff_attendance'), saveStaffAttendance);

router.get('/students', requireTenantFeature('attnd_student_attendance'), getStudentAttendance);
router.put('/students', requireTenantFeature('attnd_student_attendance'), saveStudentAttendance);

module.exports = router;
