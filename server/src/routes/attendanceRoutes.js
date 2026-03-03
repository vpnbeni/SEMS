const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.use(protect);

// Save absentees (bulk upsert)
router.post('/absentees', attendanceController.saveAbsentees);

// Get absentees (optionally filtered by ?class=X or ?class=XII)
router.get('/absentees', attendanceController.getAbsentees);

// Upload attendance sheet document
router.post('/upload', attendanceController.uploadAttendanceSheet);

// Get uploaded attendance sheets (optionally filtered by ?class=X or ?class=XII)
router.get('/uploads', attendanceController.getAttendanceSheets);

module.exports = router;
