const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { handleRazorpayWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/razorpay', asyncHandler(handleRazorpayWebhook));

module.exports = router;
