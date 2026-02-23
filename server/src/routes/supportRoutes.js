const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createTicket,
  submitFeedback,
  getSystemStatus,
} = require('../controllers/supportController');

const router = express.Router();

router.use(protect);

router.post('/ticket', createTicket);
router.post('/feedback', submitFeedback);
router.get('/status', getSystemStatus);

module.exports = router;

