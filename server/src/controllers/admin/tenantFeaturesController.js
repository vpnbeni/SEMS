const asyncHandler = require('../../middleware/asyncHandler');
const {
  TENANT_FEATURE_PAGES,
  normalizeTenantFeatureToggles,
} = require('../../constants/tenantFeatures');

const listFeaturePages = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: TENANT_FEATURE_PAGES,
  });
});

const listFeatureTenants = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const query = {};

  if (search) {
    query.$or = [
      { slug: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { adminEmail: { $regex: search, $options: 'i' } },
    ];
  }

  const { Tenant } = req.platformModels;
  const tenants = await Tenant.find(query)
    .select('slug name adminEmail status dbName featureToggles createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  const items = tenants.map((tenant) => {
    const toggles = normalizeTenantFeatureToggles(tenant.featureToggles);
    const disabledCount = Object.values(toggles).filter((value) => value === false).length;

    return {
      ...tenant,
      featureSummary: {
        total: TENANT_FEATURE_PAGES.length,
        disabled: disabledCount,
        enabled: TENANT_FEATURE_PAGES.length - disabledCount,
      },
    };
  });

  res.status(200).json({
    success: true,
    data: items,
  });
});

const getTenantFeatures = asyncHandler(async (req, res) => {
  const { Tenant } = req.platformModels;
  const { id } = req.params;

  const tenant = await Tenant.findById(id)
    .select('slug name adminEmail status dbName featureToggles createdAt updatedAt')
    .lean();

  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Tenant not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      tenant,
      toggles: normalizeTenantFeatureToggles(tenant.featureToggles),
      pages: TENANT_FEATURE_PAGES,
    },
  });
});

const updateTenantFeatures = asyncHandler(async (req, res) => {
  const { Tenant } = req.platformModels;
  const { id } = req.params;
  const toggles = normalizeTenantFeatureToggles(req.body.toggles);

  const tenant = await Tenant.findById(id);

  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Tenant not found',
    });
  }

  tenant.featureToggles = toggles;
  await tenant.save();

  return res.status(200).json({
    success: true,
    message: 'Tenant feature flags updated successfully',
    data: {
      tenant,
      toggles,
      pages: TENANT_FEATURE_PAGES,
    },
  });
});

module.exports = {
  listFeaturePages,
  listFeatureTenants,
  getTenantFeatures,
  updateTenantFeatures,
};
