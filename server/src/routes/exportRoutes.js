const express = require('express');
const { 
  exportTeachers, 
  exportStudents,
  getTeachersPreview,
  getStudentsPreview 
} = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Preview routes (must come before export routes to avoid route conflicts)
router.get('/teachers/preview', getTeachersPreview);
router.get('/students/preview', getStudentsPreview);

// Export routes
router.get('/teachers', exportTeachers);
router.get('/students', exportStudents);

module.exports = router;
