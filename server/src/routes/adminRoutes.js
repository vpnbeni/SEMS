const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  loginPlatformAdmin,
  getPlatformMe,
  logoutPlatformAdmin
} = require('../controllers/admin/platformAuthController');
const {
  listTenants,
  getTenantById,
  resolveTenantByEmail,
  createTenant,
  startPublicTenantSignup,
  resendPublicTenantSignupOtp,
  exchangePublicTenantSignup,
  updateTenant,
  activateTenant,
  suspendTenant,
  deleteTenant
} = require('../controllers/admin/tenantAdminController');
const auth = require('../middleware/auth');
const { validateJoi, validateQuery, validateParams } = require('../middleware/validation');
const {
  platformLoginSchema,
  createTenantSchema,
  publicTenantSignupStartSchema,
  publicTenantSignupResendOtpSchema,
  publicTenantSignupExchangeSchema,
  publicTenantResolveByEmailSchema,
  updateTenantSchema,
  deleteTenantSchema,
  tenantQuerySchema,
  tenantIdParamSchema,
  tenantFeatureUpdateSchema
} = require('../validations/adminValidation');
const masterSubjectsController = require('../controllers/admin/masterSubjectsController');
const masterDatesheetController = require('../controllers/admin/masterDatesheetController');
const masterGuidelinesController = require('../controllers/admin/masterGuidelinesController');
const masterUndertakingsController = require('../controllers/admin/masterUndertakingsController');
const rolloutController = require('../controllers/admin/rolloutController');
const masterTeacherTemplateController = require('../controllers/admin/masterTeacherTemplateController');
const billingAdminController = require('../controllers/admin/billingAdminController');
const tenantFeaturesController = require('../controllers/admin/tenantFeaturesController');

const router = express.Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
};

const publicSignupStartLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PUBLIC_SIGNUP_START_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  max: parsePositiveInt(process.env.PUBLIC_SIGNUP_START_RATE_LIMIT_MAX, 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many signup attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded'
  }
});

const publicSignupExchangeLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PUBLIC_SIGNUP_EXCHANGE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PUBLIC_SIGNUP_EXCHANGE_RATE_LIMIT_MAX, 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many signup exchange attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded'
  }
});

const publicSignupResendOtpLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PUBLIC_SIGNUP_OTP_RESEND_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PUBLIC_SIGNUP_OTP_RESEND_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP resend attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded'
  }
});

const publicTenantResolveLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PUBLIC_TENANT_RESOLVE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PUBLIC_TENANT_RESOLVE_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many tenant lookup attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded'
  }
});

router.post('/auth/login', validateJoi(platformLoginSchema), loginPlatformAdmin);
router.post(
  '/public/auth/resolve-tenant',
  publicTenantResolveLimiter,
  validateJoi(publicTenantResolveByEmailSchema),
  resolveTenantByEmail
);
router.post(
  '/public/tenant-signup/start',
  publicSignupStartLimiter,
  validateJoi(publicTenantSignupStartSchema),
  startPublicTenantSignup
);
router.post(
  '/public/tenant-signup/resend-otp',
  publicSignupResendOtpLimiter,
  validateJoi(publicTenantSignupResendOtpSchema),
  resendPublicTenantSignupOtp
);
router.post(
  '/public/tenant-signup/exchange',
  publicSignupExchangeLimiter,
  validateJoi(publicTenantSignupExchangeSchema),
  exchangePublicTenantSignup
);

router.use(auth.protectPlatform);

router.get('/auth/me', getPlatformMe);
router.post('/auth/logout', logoutPlatformAdmin);

router.get('/tenants', validateQuery(tenantQuerySchema), listTenants);
router.post('/tenants', validateJoi(createTenantSchema), createTenant);
router.get('/tenants/:id', validateParams(tenantIdParamSchema), getTenantById);
router.patch(
  '/tenants/:id',
  validateParams(tenantIdParamSchema),
  validateJoi(updateTenantSchema),
  updateTenant
);
router.post('/tenants/:id/activate', validateParams(tenantIdParamSchema), activateTenant);
router.post('/tenants/:id/suspend', validateParams(tenantIdParamSchema), suspendTenant);
router.delete(
  '/tenants/:id',
  validateParams(tenantIdParamSchema),
  validateJoi(deleteTenantSchema),
  deleteTenant
);

// Tenant feature toggle routes
router.get('/features/pages', tenantFeaturesController.listFeaturePages);
router.get('/features/tenants', tenantFeaturesController.listFeatureTenants);
router.get('/features/tenants/:id', validateParams(tenantIdParamSchema), tenantFeaturesController.getTenantFeatures);
router.put(
  '/features/tenants/:id',
  validateParams(tenantIdParamSchema),
  validateJoi(tenantFeatureUpdateSchema),
  tenantFeaturesController.updateTenantFeatures
);

// Master Subjects routes
router.post('/master-subjects/upload', masterSubjectsController.uploadSubjects);
router.get('/master-subjects', masterSubjectsController.listSubjects);
router.get('/master-subjects/stats', masterSubjectsController.getSubjectStats);
router.patch('/master-subjects/:id', masterSubjectsController.updateSubject);
router.delete('/master-subjects/:id', masterSubjectsController.deleteSubject);

// Master Datesheet routes
router.post('/master-datesheet/upload', masterDatesheetController.uploadDatesheet);
router.get('/master-datesheet', masterDatesheetController.listDatesheets);
router.get('/master-datesheet/:id', masterDatesheetController.getDatesheet);
router.delete('/master-datesheet/:id', masterDatesheetController.deleteDatesheet);

// Master Guidelines routes
router.post('/master-guidelines/upload', masterGuidelinesController.uploadGuidelines);
router.get('/master-guidelines', masterGuidelinesController.listGuidelines);
router.get('/master-guidelines/current', masterGuidelinesController.getCurrentGuideline);
router.get('/master-guidelines/:id', masterGuidelinesController.getGuideline);
router.delete('/master-guidelines/:id', masterGuidelinesController.deleteGuideline);

// Master Undertaking routes
router.post('/master-undertakings/upload', masterUndertakingsController.uploadUndertaking);
router.get('/master-undertakings', masterUndertakingsController.listUndertakings);
router.get('/master-undertakings/current', masterUndertakingsController.getCurrentUndertaking);
router.get('/master-undertakings/:id', masterUndertakingsController.getUndertaking);
router.delete('/master-undertakings/:id', masterUndertakingsController.deleteUndertaking);

// Rollout routes
router.post('/rollouts/initiate', rolloutController.initiateRollout);
router.get('/rollouts', rolloutController.listRollouts);
router.get('/rollouts/:id', rolloutController.getRollout);
router.post('/rollouts/:id/retry', rolloutController.retryRollout);

// Master teacher import template routes
router.get('/master-teacher-template', masterTeacherTemplateController.getTemplate);
router.put('/master-teacher-template', masterTeacherTemplateController.updateTemplate);

// Billing admin routes
router.get('/billing/tenants', billingAdminController.listTenants);
router.get('/billing/tenants/:tenantId', billingAdminController.getTenantById);
router.post('/billing/tenants/:tenantId/change-plan', billingAdminController.changePlan);
router.post('/billing/tenants/:tenantId/grant-extension', billingAdminController.grantExtension);
router.post('/billing/plans', billingAdminController.createPlan);
router.post('/billing/coupons', billingAdminController.createCoupon);
router.post('/billing/addons', billingAdminController.createAddon);

module.exports = router;
