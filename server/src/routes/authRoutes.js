const express = require('express');
const Joi = require('joi');
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
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
  resetPasswordSchema,
  refreshTokenSchema,
  updateProfileSchema,
  objectIdSchema,
  userQuerySchema
} = require('../validations/authValidation');

const router = express.Router();

// Public routes
router.post('/register', validateJoi(registerSchema), register);
router.post('/login', validateJoi(loginSchema), login);
router.post('/refresh', validateJoi(refreshTokenSchema), refreshToken);
router.post('/forgot-password', validateJoi(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateJoi(resetPasswordSchema), resetPassword);

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