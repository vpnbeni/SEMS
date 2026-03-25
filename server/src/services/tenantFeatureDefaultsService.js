const { normalizeTenantFeatureToggles } = require('../constants/tenantFeatures');
const { getPlatformModels } = require('../tenancy/platformModels');

const getTenantFeatureDefaultsModel = (platformModels) => {
  return platformModels?.TenantFeatureDefaults || getPlatformModels().TenantFeatureDefaults;
};

const getDefaultTenantFeatureToggles = async ({ platformModels } = {}) => {
  const TenantFeatureDefaults = getTenantFeatureDefaultsModel(platformModels);
  const doc = await TenantFeatureDefaults.findOne({ isActive: true })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return normalizeTenantFeatureToggles(doc?.toggles);
};

const updateDefaultTenantFeatureToggles = async ({
  toggles,
  updatedBy = null,
  platformModels,
} = {}) => {
  const TenantFeatureDefaults = getTenantFeatureDefaultsModel(platformModels);
  const normalizedToggles = normalizeTenantFeatureToggles(toggles);

  const doc = await TenantFeatureDefaults.findOneAndUpdate(
    { isActive: true },
    {
      $set: {
        toggles: normalizedToggles,
        isActive: true,
        updatedBy,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return normalizeTenantFeatureToggles(doc?.toggles);
};

module.exports = {
  getDefaultTenantFeatureToggles,
  updateDefaultTenantFeatureToggles,
};
