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

const createAllEnabledFeatureToggles = () => {
  return TENANT_FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = true;
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
