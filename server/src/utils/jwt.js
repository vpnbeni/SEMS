const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (payload, secret = process.env.JWT_SECRET, expiresIn = process.env.JWT_EXPIRE) => {
  return jwt.sign(payload, secret, { expiresIn });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );
};

// Verify token
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  return jwt.verify(token, secret);
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// Decode token without verification (for expired tokens)
const decodeToken = (token) => {
  return jwt.decode(token);
};

// Get token from request
const getTokenFromRequest = (req) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  return token;
};

// Create token response
const createTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Remove password from output
  const userResponse = {
    _id: user._id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .cookie('refreshToken', refreshToken, {
      ...options,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    })
    .json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: userResponse
      }
    });
};

// Clear token cookies
const clearTokenCookies = (res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  getTokenFromRequest,
  createTokenResponse,
  clearTokenCookies
};
