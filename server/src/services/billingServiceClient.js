const http = require('http');
const https = require('https');

const DEFAULT_TIMEOUT_MS = 8000;

const getBaseUrl = () => String(process.env.BILLING_SERVICE_URL || '').trim();

const getServiceToken = () => String(process.env.BILLING_SERVICE_TOKEN || '').trim();

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const isConfigured = () => Boolean(getBaseUrl());

const buildUrl = (path, query) => {
  const base = getBaseUrl();
  if (!base) {
    throw new Error('Billing service URL is not configured');
  }

  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url;
};

const requestBillingService = (method, path, { body, query, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const url = buildUrl(path, query);
  const client = url.protocol === 'https:' ? https : http;

  const payload = body ? JSON.stringify(body) : null;

  const options = {
    method,
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(getServiceToken() ? { 'x-billing-service-token': getServiceToken() } : {})
    },
    timeout: timeoutMs
  };

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const parsed = parseJson(data) || { success: false, message: 'Invalid billing service response' };

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
          return;
        }

        const error = new Error(parsed.message || `Billing service request failed (${res.statusCode})`);
        error.statusCode = res.statusCode;
        error.response = parsed;
        reject(error);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Billing service request timed out'));
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
};

const fallbackEntitlement = {
  accessMode: 'full',
  state: 'active',
  allowedModules: ['*'],
  isReadOnly: false,
  reason: 'billing_service_not_configured',
  planCode: null,
  trialEndsAt: null,
  graceEndsAt: null
};

const safeCall = async (fn, fallback = null) => {
  if (!isConfigured()) {
    return fallback;
  }

  try {
    return await fn();
  } catch (error) {
    console.error('[billing-client] request_failed', {
      message: error.message,
      statusCode: error.statusCode,
      path: error?.response?.path
    });
    throw error;
  }
};

const getTenantEntitlement = async (tenantSlug) => {
  if (!isConfigured()) {
    return { ...fallbackEntitlement, tenantSlug };
  }

  const response = await requestBillingService('GET', `/internal/entitlements/${encodeURIComponent(tenantSlug)}`);
  return response.data;
};

const onboardTenantTrial = async (payload) => safeCall(
  () => requestBillingService('POST', '/internal/tenants/onboard', { body: payload }),
  null
);

const grandfatherTenant = async (payload) => safeCall(
  () => requestBillingService('POST', '/internal/tenants/grandfather', { body: payload }),
  null
);

const getTenantBilling = async (tenantSlug) => safeCall(
  () => requestBillingService('GET', `/internal/tenant/${encodeURIComponent(tenantSlug)}`),
  { success: false, data: null }
);

const getTenantInvoices = async (tenantSlug) => safeCall(
  () => requestBillingService('GET', `/internal/tenant/${encodeURIComponent(tenantSlug)}/invoices`),
  { success: true, data: [] }
);

const createPayNowLink = async (tenantSlug, payload = {}) => safeCall(
  () => requestBillingService('POST', `/internal/tenant/${encodeURIComponent(tenantSlug)}/pay-now`, { body: payload }),
  { success: false, message: 'Billing service unavailable' }
);

const updateTenantBillingProfile = async (tenantSlug, payload = {}) => safeCall(
  () => requestBillingService('POST', `/internal/tenant/${encodeURIComponent(tenantSlug)}/profile`, { body: payload }),
  { success: false, message: 'Billing service unavailable' }
);

const listBillingTenants = async (query = {}) => safeCall(
  () => requestBillingService('GET', '/internal/admin/tenants', { query }),
  { success: true, data: { items: [], total: 0, page: 1, pages: 1, limit: 20 } }
);

const getBillingTenantById = async (tenantId) => safeCall(
  () => requestBillingService('GET', `/internal/admin/tenants/${encodeURIComponent(tenantId)}`),
  { success: false, data: null }
);

const changeBillingTenantPlan = async (tenantId, payload = {}) => safeCall(
  () => requestBillingService(
    'POST',
    `/internal/admin/tenants/${encodeURIComponent(tenantId)}/change-plan`,
    { body: payload }
  ),
  { success: false, message: 'Billing service unavailable' }
);

const grantBillingTenantExtension = async (tenantId, payload = {}) => safeCall(
  () => requestBillingService(
    'POST',
    `/internal/admin/tenants/${encodeURIComponent(tenantId)}/grant-extension`,
    { body: payload }
  ),
  { success: false, message: 'Billing service unavailable' }
);

const createBillingPlan = async (payload = {}) => safeCall(
  () => requestBillingService('POST', '/internal/admin/plans', { body: payload }),
  { success: false, message: 'Billing service unavailable' }
);

const createBillingCoupon = async (payload = {}) => safeCall(
  () => requestBillingService('POST', '/internal/admin/coupons', { body: payload }),
  { success: false, message: 'Billing service unavailable' }
);

const createBillingAddon = async (payload = {}) => safeCall(
  () => requestBillingService('POST', '/internal/admin/addons', { body: payload }),
  { success: false, message: 'Billing service unavailable' }
);

module.exports = {
  isConfigured,
  getTenantEntitlement,
  onboardTenantTrial,
  grandfatherTenant,
  getTenantBilling,
  getTenantInvoices,
  createPayNowLink,
  updateTenantBillingProfile,
  listBillingTenants,
  getBillingTenantById,
  changeBillingTenantPlan,
  grantBillingTenantExtension,
  createBillingPlan,
  createBillingCoupon,
  createBillingAddon
};
