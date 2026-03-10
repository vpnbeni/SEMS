const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resendForgotPasswordOtp,
  resetPassword,
  getUsers,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/authController');

const { protect, authorize } = require('../middleware/auth');
const { validateJoi, validateParams, validateQuery } = require('../middleware/validation');
const {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  forgotPasswordResendOtpSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  updateProfileSchema,
  objectIdSchema,
  userQuerySchema
} = require('../validations/authValidation');

const router = express.Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const forgotPasswordLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PASSWORD_RESET_FORGOT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PASSWORD_RESET_FORGOT_RATE_LIMIT_MAX, 8),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many forgot password requests. Please try again later.',
    errorCode: 'rate_limit_exceeded',
  },
});

const forgotPasswordResendLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PASSWORD_RESET_RESEND_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PASSWORD_RESET_RESEND_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many resend OTP requests. Please try again later.',
    errorCode: 'rate_limit_exceeded',
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: parsePositiveInt(process.env.PASSWORD_RESET_SUBMIT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parsePositiveInt(process.env.PASSWORD_RESET_SUBMIT_RATE_LIMIT_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many reset attempts. Please try again later.',
    errorCode: 'rate_limit_exceeded',
  },
});

// Public routes
router.post('/register', validateJoi(registerSchema), register);
router.post('/login', validateJoi(loginSchema), login);
router.post('/refresh', validateJoi(refreshTokenSchema), refreshToken);
router.post('/forgot-password', forgotPasswordLimiter, validateJoi(forgotPasswordSchema), forgotPassword);
router.post(
  '/forgot-password/resend-otp',
  forgotPasswordResendLimiter,
  validateJoi(forgotPasswordResendOtpSchema),
  resendForgotPasswordOtp
);
router.post('/reset-password', resetPasswordLimiter, validateJoi(resetPasswordSchema), resetPassword);

// Protected routes (require authentication)
router.use(protect);

// User profile routes
router.get('/me', getMe);
router.put('/me', validateJoi(updateProfileSchema), updateProfile);
router.put('/change-password', validateJoi(changePasswordSchema), changePassword);
router.post('/logout', logout);

// Admin only routes
router.get('/users', authorize('admin'), validateQuery(userQuerySchema), getUsers);
router.get('/stats', authorize('admin'), getUserStats);
router.put('/users/:id', 
  authorize('admin'), 
  validateParams(Joi.object({ id: objectIdSchema.required() })),
  validateJoi(updateProfileSchema),
  updateUser
);
router.delete('/users/:id', 
  authorize('admin'),
  validateParams(Joi.object({ id: objectIdSchema.required() })),
  deleteUser
);

module.exports = router;
