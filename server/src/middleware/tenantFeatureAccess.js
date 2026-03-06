const { normalizeTenantFeatureToggles } = require('../constants/tenantFeatures');

const requireTenantFeature = (featureKey) => {
  return (req, res, next) => {
    const toggles = normalizeTenantFeatureToggles(req.tenant?.featureToggles);
    const isEnabled = toggles[featureKey] !== false;

    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        message: `Feature '${featureKey}' is disabled by platform admin for this tenant`,
        featureKey,
      });
    }

    return next();
  };
};

module.exports = {
  requireTenantFeature,
};
