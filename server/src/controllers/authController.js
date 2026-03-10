const crypto = require('crypto');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const { createTokenResponse, clearTokenCookies, verifyRefreshToken, generateToken } = require('../utils/jwt');
const { generateResponse } = require('../utils/helpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');
const { getTenantEntitlement } = require('../services/billingServiceClient');
const { sendMail } = require('../utils/mailer');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PASSWORD_RESET_ERROR_CODES = {
  USER_NOT_FOUND: 'user_not_found',
  USER_INACTIVE: 'user_inactive',
  OTP_REQUIRED: 'otp_required',
  OTP_INVALID: 'invalid_otp',
  OTP_EXPIRED: 'otp_expired',
  OTP_ATTEMPTS_EXCEEDED: 'otp_attempts_exceeded',
  OTP_NOT_REQUESTED: 'otp_not_requested',
};

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const resolvePasswordResetOtpTtlMinutes = () => parsePositiveInt(process.env.PASSWORD_RESET_OTP_TTL_MINUTES, 10);
const resolvePasswordResetOtpMaxAttempts = () => parsePositiveInt(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS, 5);
const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const generatePasswordResetOtp = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const clearPasswordResetOtpState = (user) => {
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetOtpSentAt = null;
  user.passwordResetOtpAttemptCount = 0;
  user.passwordResetOtpLastAttemptAt = null;
};

const getOtpExpiryMinutes = (otpExpiresAt) => {
  if (!otpExpiresAt) return null;
  const diffMs = new Date(otpExpiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 0;
  }
  return Math.ceil(diffMs / (60 * 1000));
};

const sendPasswordResetOtpEmail = async ({ email, otp, otpExpiresAt }) => {
  const expiresInMinutes = getOtpExpiryMinutes(otpExpiresAt);
  const expiryLine = expiresInMinutes && expiresInMinutes > 0
    ? `This code expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? '' : 's'}.`
    : 'Use this code as soon as possible.';

  const subject = 'BECMS Password Reset Verification Code';
  const text = [
    `Your BECMS password reset verification code is ${otp}.`,
    expiryLine,
    'If you did not request this reset, you can safely ignore this email.',
  ].join('\n');

  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">',
    '<h2 style="margin:0 0 12px;">BECMS Password Reset</h2>',
    '<p style="margin:0 0 12px;">Use the OTP below to reset your password:</p>',
    `<p style="margin:0 0 12px;font-size:28px;letter-spacing:6px;font-weight:700;">${otp}</p>`,
    `<p style="margin:0 0 12px;">${expiryLine}</p>`,
    '<p style="margin:0;">If you did not request this reset, you can safely ignore this email.</p>',
    '</div>',
  ].join('');

  await sendMail({
    to: email,
    subject,
    text,
    html,
  });
};

const buildBillingSnapshot = async (tenantSlug) => {
  if (!tenantSlug) {
    return null;
  }

  try {
    const entitlement = await getTenantEntitlement(tenantSlug);
    return {
      accessMode: entitlement.accessMode || 'full',
      planCode: entitlement.planCode || null,
      trialEndsAt: entitlement.trialEndsAt || null,
      graceEndsAt: entitlement.graceEndsAt || null,
      isReadOnly: Boolean(entitlement.isReadOnly),
      state: entitlement.state || 'active',
    };
  } catch (error) {
    console.error('[auth] billing snapshot fetch failed', {
      tenantSlug,
      message: error.message,
    });
    return null;
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (Admin only in production)
const register = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(HTTP_STATUS.CONFLICT).json(
      generateResponse(false, 'User with this email already exists')
    );
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role
  });

  const billing = await buildBillingSnapshot(req.tenant?.slug);

  // Generate token and send response
  createTokenResponse(user, HTTP_STATUS.CREATED, res, req.tenant?.slug, {
    billing,
    featureToggles: req.tenant?.featureToggles || null,
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const identifier = String(email || '').trim().toLowerCase();

  let user = null;
  if (identifier.includes('@')) {
    user = await User.findOne({ email: identifier }).select('+password');
  } else {
    const prefixRegex = new RegExp(`^${escapeRegex(identifier)}@`, 'i');
    const candidates = await User.find({ email: { $regex: prefixRegex } })
      .select('+password')
      .limit(2);

    if (candidates.length > 1) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        generateResponse(false, 'Multiple users matched this username. Please use full email to login.')
      );
    }

    [user] = candidates;
  }

  // Check for user
  if (!user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      generateResponse(false, ERROR_MESSAGES.INVALID_CREDENTIALS)
    );
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      generateResponse(false, ERROR_MESSAGES.USER_INACTIVE)
    );
  }

  // Check password
  const isPasswordMatch = await user.matchPassword(password);
  if (!isPasswordMatch) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      generateResponse(false, ERROR_MESSAGES.INVALID_CREDENTIALS)
    );
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const billing = await buildBillingSnapshot(req.tenant?.slug);

  // Generate token and send response
  createTokenResponse(user, HTTP_STATUS.OK, res, req.tenant?.slug, {
    billing,
    featureToggles: req.tenant?.featureToggles || null,
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // Remove refresh token from user
  if (refreshToken && req.user) {
    await req.user.removeRefreshToken(refreshToken);
  }

  // Clear cookies
  clearTokenCookies(res);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.LOGOUT_SUCCESS)
  );
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      generateResponse(false, 'Refresh token is required')
    );
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    if (!req.tenant?.slug || decoded.tenantSlug !== req.tenant.slug) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        generateResponse(false, ERROR_MESSAGES.INVALID_TOKEN)
      );
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        generateResponse(false, ERROR_MESSAGES.USER_NOT_FOUND)
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        generateResponse(false, ERROR_MESSAGES.USER_INACTIVE)
      );
    }

    // Check if refresh token exists in user's tokens
    const hasValidRefreshToken = user.refreshTokens.some(rt => rt.token === token);
    if (!hasValidRefreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        generateResponse(false, ERROR_MESSAGES.INVALID_TOKEN)
      );
    }

    const billing = await buildBillingSnapshot(req.tenant?.slug);

    // Generate new access token
    const accessToken = generateToken({ id: user._id, tenantSlug: req.tenant.slug });

    res.status(HTTP_STATUS.OK).json(
      generateResponse(true, 'Token refreshed successfully', {
        accessToken,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          featureToggles: req.tenant?.featureToggles || null,
        },
        billing
      })
    );
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      generateResponse(false, ERROR_MESSAGES.INVALID_TOKEN)
    );
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const billing = await buildBillingSnapshot(req.tenant?.slug);

  const payload = user.toObject ? user.toObject() : user;
  payload.billing = billing;
  payload.featureToggles = req.tenant?.featureToggles || null;

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'User profile fetched successfully', payload)
  );
});

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    email: req.body.email
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  // Check if email is being changed and if it already exists
  if (fieldsToUpdate.email && fieldsToUpdate.email !== req.user.email) {
    const existingUser = await User.findOne({ email: fieldsToUpdate.email });
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Email already in use')
      );
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.UPDATED, user)
  );
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isPasswordMatch = await user.matchPassword(currentPassword);
  if (!isPasswordMatch) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'Current password is incorrect')
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Remove all refresh tokens (force re-login on all devices)
  await user.removeAllRefreshTokens();

  // Clear cookies
  clearTokenCookies(res);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Password changed successfully. Please login again.')
  );
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      {
        ...generateResponse(false, 'No account associated with this email'),
        errorCode: PASSWORD_RESET_ERROR_CODES.USER_NOT_FOUND,
      }
    );
  }

  if (!user.isActive) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      {
        ...generateResponse(false, ERROR_MESSAGES.USER_INACTIVE),
        errorCode: PASSWORD_RESET_ERROR_CODES.USER_INACTIVE,
      }
    );
  }

  const otp = generatePasswordResetOtp();
  const ttlMinutes = resolvePasswordResetOtpTtlMinutes();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  user.passwordResetOtpHash = hashValue(otp);
  user.passwordResetOtpExpiresAt = expiresAt;
  user.passwordResetOtpSentAt = now;
  user.passwordResetOtpAttemptCount = 0;
  user.passwordResetOtpLastAttemptAt = null;
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetOtpEmail({
      email: user.email,
      otp,
      otpExpiresAt: expiresAt,
    });
  } catch (error) {
    console.error(`[auth:forgot-password] otp_delivery_failed email=${user.email} message=${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      ...generateResponse(false, 'Unable to send verification code right now. Please try again.'),
      errorCode: 'otp_delivery_failed',
    });
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Verification code sent to your email', {
      otpExpiresAt: expiresAt,
    })
  );
});

// @desc    Resend forgot password OTP
// @route   POST /api/auth/forgot-password/resend-otp
// @access  Public
const resendForgotPasswordOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      ...generateResponse(false, 'No account associated with this email'),
      errorCode: PASSWORD_RESET_ERROR_CODES.USER_NOT_FOUND,
    });
  }

  if (!user.isActive) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      ...generateResponse(false, ERROR_MESSAGES.USER_INACTIVE),
      errorCode: PASSWORD_RESET_ERROR_CODES.USER_INACTIVE,
    });
  }

  if (!user.passwordResetOtpHash || !user.passwordResetOtpSentAt) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...generateResponse(false, 'Request password reset first to get an OTP'),
      errorCode: PASSWORD_RESET_ERROR_CODES.OTP_NOT_REQUESTED,
    });
  }

  const otp = generatePasswordResetOtp();
  const ttlMinutes = resolvePasswordResetOtpTtlMinutes();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  user.passwordResetOtpHash = hashValue(otp);
  user.passwordResetOtpExpiresAt = expiresAt;
  user.passwordResetOtpSentAt = now;
  user.passwordResetOtpAttemptCount = 0;
  user.passwordResetOtpLastAttemptAt = null;
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetOtpEmail({
      email: user.email,
      otp,
      otpExpiresAt: expiresAt,
    });
  } catch (error) {
    console.error(`[auth:forgot-password:resend] otp_delivery_failed email=${user.email} message=${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      ...generateResponse(false, 'Unable to send verification code right now. Please try again.'),
      errorCode: 'otp_delivery_failed',
    });
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'A new verification code has been sent to your email', {
      otpExpiresAt: expiresAt,
    })
  );
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const { newPassword } = req.body;
  const now = new Date();
  const maxOtpAttempts = resolvePasswordResetOtpMaxAttempts();

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      ...generateResponse(false, 'No account associated with this email'),
      errorCode: PASSWORD_RESET_ERROR_CODES.USER_NOT_FOUND,
    });
  }

  if (!user.isActive) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      ...generateResponse(false, ERROR_MESSAGES.USER_INACTIVE),
      errorCode: PASSWORD_RESET_ERROR_CODES.USER_INACTIVE,
    });
  }

  if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...generateResponse(false, 'Password reset OTP has not been requested'),
      errorCode: PASSWORD_RESET_ERROR_CODES.OTP_NOT_REQUESTED,
    });
  }

  if ((user.passwordResetOtpAttemptCount || 0) >= maxOtpAttempts) {
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      ...generateResponse(false, 'Too many incorrect OTP attempts. Please request a new code.'),
      errorCode: PASSWORD_RESET_ERROR_CODES.OTP_ATTEMPTS_EXCEEDED,
    });
  }

  if (new Date(user.passwordResetOtpExpiresAt) <= now) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...generateResponse(false, 'OTP has expired. Please request a new code.'),
      errorCode: PASSWORD_RESET_ERROR_CODES.OTP_EXPIRED,
    });
  }

  if (!otp) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...generateResponse(false, 'OTP is required'),
      errorCode: PASSWORD_RESET_ERROR_CODES.OTP_REQUIRED,
    });
  }

  const otpHash = hashValue(otp);
  if (otpHash !== user.passwordResetOtpHash) {
    const nextAttemptCount = (user.passwordResetOtpAttemptCount || 0) + 1;
    user.passwordResetOtpAttemptCount = nextAttemptCount;
    user.passwordResetOtpLastAttemptAt = now;
    await user.save({ validateBeforeSave: false });

    if (nextAttemptCount >= maxOtpAttempts) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        ...generateResponse(false, 'Too many incorrect OTP attempts. Please request a new code.'),
        errorCode: PASSWORD_RESET_ERROR_CODES.OTP_ATTEMPTS_EXCEEDED,
      });
    }

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...generateResponse(false, 'Invalid verification code'),
      errorCode: PASSWORD_RESET_ERROR_CODES.OTP_INVALID,
    });
  }

  user.password = newPassword;
  user.refreshTokens = [];
  clearPasswordResetOtpState(user);
  await user.save();

  clearTokenCookies(res);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Password reset successfully. Please login with your new password.')
  );
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    search,
    role,
    isActive
  } = req.query;

  // Build query
  const query = {};
  
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) {
    query.role = role;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Execute query with pagination
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sort,
    lean: true
  };

  const users = await User.paginate(query, options);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, users)
  );
});

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, role, isActive } = req.body;

  // Check if email is being changed and if it already exists
  if (email) {
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        generateResponse(false, 'Email already in use')
      );
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { email, role, isActive },
    {
      new: true,
      runValidators: true
    }
  );

  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.USER_NOT_FOUND)
    );
  }

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.UPDATED, user)
  );
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (id === req.user._id.toString()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      generateResponse(false, 'You cannot delete your own account')
    );
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.USER_NOT_FOUND)
    );
  }

  await user.deleteOne();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.DELETED)
  );
});

// @desc    Get user statistics (Admin only)
// @route   GET /api/auth/stats
// @access  Private/Admin
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await User.getStats();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'User statistics fetched successfully', stats)
  );
});

module.exports = {
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
};
