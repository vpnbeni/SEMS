const FEATURE_CATALOG = Object.freeze(require('../../../client/src/constants/tenantFeatureCatalog.json'));

const TENANT_FEATURE_PAGES = Object.freeze(
  FEATURE_CATALOG.map(({ key, label, path, group }) => ({
    key,
    label,
    path,
    group,
  }))
);

const TENANT_FEATURE_KEYS = Object.freeze(TENANT_FEATURE_PAGES.map((entry) => entry.key));

// Features listed here are disabled by default for new tenants.
// Platform admins can enable them per-tenant from the admin panel.
const FEATURES_DISABLED_BY_DEFAULT = new Set(['school_hub']);

const createAllEnabledFeatureToggles = () => {
  return TENANT_FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = !FEATURES_DISABLED_BY_DEFAULT.has(key);
    return acc;
  }, {});
};

const normalizeFeatureSource = (source) => {
  if (!source) {
    return {};
  }

  if (source instanceof Map) {
    return Object.fromEntries(source.entries());
  }

  if (typeof source === 'object') {
    return source;
  }

  return {};
};

const normalizeTenantFeatureToggles = (source) => {
  const normalized = createAllEnabledFeatureToggles();
  const sourceObject = normalizeFeatureSource(source);

  TENANT_FEATURE_KEYS.forEach((key) => {
    if (sourceObject[key] === false) {
      normalized[key] = false;
      return;
    }

    if (sourceObject[key] === true) {
      normalized[key] = true;
    }
  });

  return normalized;
};

module.exports = {
  TENANT_FEATURE_PAGES,
  TENANT_FEATURE_KEYS,
  createAllEnabledFeatureToggles,
  normalizeTenantFeatureToggles,
};
