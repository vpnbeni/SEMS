const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  loginPlatformAdmin,
  getPlatformMe,
  logoutPlatformAdmin,
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
  deleteTenant,
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
} = require('../validations/adminValidation');

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
    errorCode: 'rate_limit_exceeded',
  },
});

const publicSignupExchangeLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PUBLIC_SIGNUP_EXCHANGE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PUBLIC_SIGNUP_EXCHANGE_RATE_LIMIT_MAX, 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many signup exchange attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded',
  },
});

const publicSignupResendOtpLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PUBLIC_SIGNUP_OTP_RESEND_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PUBLIC_SIGNUP_OTP_RESEND_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP resend attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded',
  },
});

const publicTenantResolveLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PUBLIC_TENANT_RESOLVE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PUBLIC_TENANT_RESOLVE_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many tenant lookup attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded',
  },
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

module.exports = router;
