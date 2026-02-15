const express = require('express');
const { protect } = require('../middleware/auth');
const billingController = require('../controllers/billingController');

const router = express.Router();

router.use(protect);

router.get('/me', billingController.getBillingMe);
router.get('/me/invoices', billingController.getBillingInvoices);
router.post('/me/pay-now', billingController.payNow);
router.post('/me/update-billing-profile', billingController.updateBillingProfile);

module.exports = router;
