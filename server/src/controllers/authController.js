const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const { createTokenResponse, clearTokenCookies, verifyRefreshToken, generateToken } = require('../utils/jwt');
const { generateResponse, errorResponse } = require('../utils/helpers');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

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

  // Generate token and send response
  createTokenResponse(user, HTTP_STATUS.CREATED, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');
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

  // Generate token and send response
  createTokenResponse(user, HTTP_STATUS.OK, res);
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

    // Generate new access token
    const accessToken = generateToken({ id: user._id });

    res.status(HTTP_STATUS.OK).json(
      generateResponse(true, 'Token refreshed successfully', {
        accessToken,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
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

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'User profile fetched successfully', user)
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
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      generateResponse(false, ERROR_MESSAGES.USER_NOT_FOUND)
    );
  }

  // In a real application, you would:
  // 1. Generate a reset token
  // 2. Save it to the user with expiry
  // 3. Send email with reset link
  
  // For now, just return success message
  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Password reset instructions sent to your email')
  );
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  // In a real application, you would:
  // 1. Hash the token
  // 2. Find user with matching reset token and valid expiry
  // 3. Update password and clear reset token
  
  // For now, just return success message
  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Password reset successfully')
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
  resetPassword,
  getUsers,
  updateUser,
  deleteUser,
  getUserStats
};