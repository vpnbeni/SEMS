const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getSessions,
  getAvailableSessions,
  createSession,
  carryForward,
} = require('../controllers/sessionController');

const router = express.Router();

// All session routes require authentication
router.use(protect);

// List existing sessions for the tenant
router.get('/', getSessions);

// Available sessions (generated from calendar)
router.get('/available', getAvailableSessions);

// Create / ensure a session (admin only)
router.post('/', authorize('admin'), createSession);

// Carry forward data from one session to another (admin only)
router.post('/:label/carry-forward', authorize('admin'), carryForward);

module.exports = router;
