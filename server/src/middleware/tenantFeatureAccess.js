const { normalizeTenantFeatureToggles } = require('../constants/tenantFeatures');

const requireTenantFeature = (featureKey) => {
  return (req, res, next) => {
    const toggles = normalizeTenantFeatureToggles(req.tenant?.featureToggles);
    const isEnabled = toggles[featureKey] !== false;

    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        message: `Feature '${featureKey}' is not available for your account`,
        featureKey,
      });
    }

    return next();
  };
};

const requireAnyTenantFeature = (...featureKeys) => {
  return (req, res, next) => {
    const toggles = normalizeTenantFeatureToggles(req.tenant?.featureToggles);
    const isEnabled = featureKeys.some((featureKey) => toggles[featureKey] !== false);
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        message: 'This feature is not available for your account',
        featureKeys,
      });
    }
    return next();
  };
};

module.exports = {
  requireTenantFeature,
  requireAnyTenantFeature,
};
