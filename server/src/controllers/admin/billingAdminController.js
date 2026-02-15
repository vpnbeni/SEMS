const asyncHandler = require('../../middleware/asyncHandler');
const {
  listBillingTenants,
  getBillingTenantById,
  changeBillingTenantPlan,
  grantBillingTenantExtension,
  createBillingPlan,
  createBillingCoupon,
  createBillingAddon
} = require('../../services/billingServiceClient');

const listTenants = asyncHandler(async (req, res) => {
  const response = await listBillingTenants(req.query || {});

  res.status(200).json({
    success: true,
    data: response?.data || {
      items: [],
      total: 0,
      page: 1,
      pages: 1,
      limit: 20
    }
  });
});

const getTenantById = asyncHandler(async (req, res) => {
  const response = await getBillingTenantById(req.params.tenantId);

  if (!response?.data) {
    return res.status(404).json({
      success: false,
      message: 'Billing tenant not found'
    });
  }

  return res.status(200).json({
    success: true,
    data: response.data
  });
});

const changePlan = asyncHandler(async (req, res) => {
  const response = await changeBillingTenantPlan(req.params.tenantId, req.body || {});

  res.status(200).json({
    success: Boolean(response?.success),
    message: response?.message || 'Plan updated',
    data: response?.data || null
  });
});

const grantExtension = asyncHandler(async (req, res) => {
  const response = await grantBillingTenantExtension(req.params.tenantId, req.body || {});

  res.status(200).json({
    success: Boolean(response?.success),
    message: response?.message || 'Extension granted',
    data: response?.data || null
  });
});

const createPlan = asyncHandler(async (req, res) => {
  const response = await createBillingPlan(req.body || {});

  res.status(201).json({
    success: Boolean(response?.success),
    message: response?.message || 'Plan saved',
    data: response?.data || null
  });
});

const createCoupon = asyncHandler(async (req, res) => {
  const response = await createBillingCoupon(req.body || {});

  res.status(201).json({
    success: Boolean(response?.success),
    message: response?.message || 'Coupon saved',
    data: response?.data || null
  });
});

const createAddon = asyncHandler(async (req, res) => {
  const response = await createBillingAddon(req.body || {});

  res.status(201).json({
    success: Boolean(response?.success),
    message: response?.message || 'Addon saved',
    data: response?.data || null
  });
});

module.exports = {
  listTenants,
  getTenantById,
  changePlan,
  grantExtension,
  createPlan,
  createCoupon,
  createAddon
};
