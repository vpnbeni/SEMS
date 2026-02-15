const asyncHandler = require('../middleware/asyncHandler');
const {
  getTenantBilling,
  getTenantInvoices,
  createPayNowLink,
  updateTenantBillingProfile,
  getTenantEntitlement
} = require('../services/billingServiceClient');

const getBillingMe = asyncHandler(async (req, res) => {
  const tenantSlug = req.tenant?.slug;

  const [billingResponse, entitlement] = await Promise.all([
    getTenantBilling(tenantSlug),
    getTenantEntitlement(tenantSlug)
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...(billingResponse?.data || {}),
      entitlement
    }
  });
});

const getBillingInvoices = asyncHandler(async (req, res) => {
  const tenantSlug = req.tenant?.slug;
  const response = await getTenantInvoices(tenantSlug);

  res.status(200).json({
    success: true,
    data: response?.data || []
  });
});

const payNow = asyncHandler(async (req, res) => {
  const tenantSlug = req.tenant?.slug;
  const response = await createPayNowLink(tenantSlug, req.body || {});

  res.status(200).json({
    success: Boolean(response?.success),
    message: response?.message || 'Payment link created',
    data: response?.data || null
  });
});

const updateBillingProfile = asyncHandler(async (req, res) => {
  const tenantSlug = req.tenant?.slug;
  const response = await updateTenantBillingProfile(tenantSlug, req.body || {});

  res.status(200).json({
    success: Boolean(response?.success),
    message: response?.message || 'Billing profile updated',
    data: response?.data || null
  });
});

module.exports = {
  getBillingMe,
  getBillingInvoices,
  payNow,
  updateBillingProfile
};
