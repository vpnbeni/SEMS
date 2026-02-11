const asyncHandler = require('./asyncHandler');
const {
  getTokenFromRequest,
  verifyTenantToken,
  verifyPlatformToken,
} = require('../utils/jwt');
const { getRequestContext } = require('../tenancy/requestContext');
const { getPlatformModels } = require('../tenancy/platformModels');

const unauthorized = (res, message = 'Not authorized to access this route') => {
  return res.status(401).json({
    success: false,
    error: message,
  });
};

const getTenantUserModel = (req) => {
  if (req.models?.User) {
    return req.models.User;
  }

  const context = getRequestContext();
  return context?.models?.User || null;
};

const getPlatformAdminModel = (req) => {
  if (req.platformModels?.PlatformAdmin) {
    return req.platformModels.PlatformAdmin;
  }

  const context = getRequestContext();
  if (context?.platformModels?.PlatformAdmin) {
    return context.platformModels.PlatformAdmin;
  }

  return getPlatformModels().PlatformAdmin;
};

const protectTenant = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return unauthorized(res);
  }

  let decoded;
  try {
    decoded = verifyTenantToken(token);
  } catch (error) {
    return unauthorized(res);
  }

  if (req.tenant && decoded.tenantSlug !== req.tenant.slug) {
    return unauthorized(res, 'Token tenant does not match request tenant');
  }

  const User = getTenantUserModel(req);
  if (!User) {
    return res.status(500).json({
      success: false,
      error: 'Tenant context is missing for authenticated route',
    });
  }

  req.user = await User.findById(decoded.id).select('-password');

  if (!req.user) {
    return unauthorized(res, 'No user found with this token');
  }

  if (!req.user.isActive) {
    return unauthorized(res, 'User account is deactivated');
  }

  return next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyTenantToken(token);

    if (req.tenant && decoded.tenantSlug !== req.tenant.slug) {
      req.user = null;
      return next();
    }

    const User = getTenantUserModel(req);
    if (!User) {
      req.user = null;
      return next();
    }

    req.user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    req.user = null;
  }

  return next();
});

const protectPlatform = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.platformToken) {
    token = req.cookies.platformToken;
  }

  if (!token) {
    return unauthorized(res);
  }

  let decoded;
  try {
    decoded = verifyPlatformToken(token);
  } catch (error) {
    return unauthorized(res);
  }

  const PlatformAdmin = getPlatformAdminModel(req);
  req.platformUser = await PlatformAdmin.findById(decoded.id).select('-password');

  if (!req.platformUser) {
    return unauthorized(res, 'Platform admin not found');
  }

  if (!req.platformUser.isActive) {
    return unauthorized(res, 'Platform admin is deactivated');
  }

  return next();
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user?.role || 'unknown'} is not authorized to access this route`,
      });
    }

    return next();
  };
};

const ownershipOrAdmin = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (req.user?.role === 'admin') {
      return next();
    }

    if (req.resource && req.resource[resourceUserField]) {
      if (req.resource[resourceUserField].toString() !== req.user?._id?.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this resource',
        });
      }
    }

    return next();
  };
};

// Backward-compatible default export for routes that import auth middleware as a function.
const auth = protectTenant;
auth.protect = protectTenant;
auth.protectTenant = protectTenant;
auth.protectPlatform = protectPlatform;
auth.optionalAuth = optionalAuth;
auth.authorize = authorize;
auth.ownershipOrAdmin = ownershipOrAdmin;

module.exports = auth;
