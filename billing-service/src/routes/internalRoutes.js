const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { ensureServiceAuth } = require('../middleware/serviceAuth');
const internalController = require('../controllers/internalController');

const router = express.Router();

router.use(ensureServiceAuth);

router.post('/tenants/onboard', asyncHandler(internalController.onboardTenant));
router.post('/tenants/grandfather', asyncHandler(internalController.grandfatherTenantHandler));

router.get('/entitlements/:tenantSlug', asyncHandler(internalController.getTenantEntitlement));

router.get('/tenant/:tenantSlug', asyncHandler(internalController.getTenantBilling));
router.get('/tenant/:tenantSlug/invoices', asyncHandler(internalController.listTenantInvoices));
router.post('/tenant/:tenantSlug/pay-now', asyncHandler(internalController.payNow));
router.post('/tenant/:tenantSlug/profile', asyncHandler(internalController.updateTenantProfile));

router.get('/admin/tenants', asyncHandler(internalController.listBillingTenants));
router.get('/admin/tenants/:tenantId', asyncHandler(internalController.getBillingTenantById));
router.post('/admin/tenants/:tenantId/change-plan', asyncHandler(internalController.changeTenantPlan));
router.post('/admin/tenants/:tenantId/grant-extension', asyncHandler(internalController.grantTenantExtension));
router.post('/admin/plans', asyncHandler(internalController.createPlan));
router.post('/admin/coupons', asyncHandler(internalController.createCoupon));
router.post('/admin/addons', asyncHandler(internalController.createAddon));

module.exports = router;
