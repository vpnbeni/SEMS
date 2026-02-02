const express = require('express');
const { getTodaysExams } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @route   GET /api/dashboard/todays-exams
// @desc    Get today's exams with candidate counts and room allocations
// @access  Private
router.get('/todays-exams', getTodaysExams);

module.exports = router;
