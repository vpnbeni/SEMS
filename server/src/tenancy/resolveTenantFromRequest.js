const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const normalizeHost = (host = '') => host.split(':')[0].trim().toLowerCase();

const isLocalHost = (hostname) => LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost');

const sanitizeSlug = (value = '') => value.trim().toLowerCase();

const isValidSlug = (slug) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug);

const resolveTenantFromRequest = (req) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const normalizedForwardedHost = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : (forwardedHost || '');
  const rawHost = (normalizedForwardedHost.split(',')[0] || req.headers.host || '').trim();
  const hostname = normalizeHost(rawHost);

  const rootApiDomain = (process.env.ROOT_API_DOMAIN || 'api.vpnbeni.com').toLowerCase();

  if (!hostname) {
    return {
      tenantSlug: null,
      source: 'none',
      isPlatformHost: false,
      host: hostname,
    };
  }

  if (hostname === rootApiDomain) {
    return {
      tenantSlug: null,
      source: 'host',
      isPlatformHost: true,
      host: hostname,
    };
  }

  if (hostname.endsWith(`.${rootApiDomain}`)) {
    const slug = sanitizeSlug(hostname.replace(`.${rootApiDomain}`, ''));

    return {
      tenantSlug: isValidSlug(slug) ? slug : null,
      source: 'host',
      isPlatformHost: false,
      host: hostname,
    };
  }

  if (isLocalHost(hostname)) {
    const headerSlug = sanitizeSlug(req.headers['x-tenant-slug'] || '');
    const querySlug = sanitizeSlug(req.query.tenant || '');
    const tenantSlug = headerSlug || querySlug || null;

    return {
      tenantSlug: tenantSlug && isValidSlug(tenantSlug) ? tenantSlug : null,
      source: headerSlug ? 'header' : querySlug ? 'query' : 'none',
      isPlatformHost: false,
      isLocalHost: true,
      host: hostname,
    };
  }

  return {
    tenantSlug: null,
    source: 'none',
    isPlatformHost: false,
    host: hostname,
  };
};

module.exports = {
  resolveTenantFromRequest,
  isValidSlug,
};
