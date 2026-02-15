const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const normalizeHost = (host = '') => host.split(':')[0].trim().toLowerCase();

const isLocalHost = (hostname) => LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost');

const sanitizeSlug = (value = '') => value.trim().toLowerCase();

const isValidSlug = (slug) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug);

const buildHostCandidates = (req) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const normalizedForwardedHost = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : (forwardedHost || '');
  const firstForwardedHost = (normalizedForwardedHost.split(',')[0] || '').trim();
  const hostHeader = (req.headers.host || '').trim();

  const candidates = [hostHeader, firstForwardedHost]
    .map((candidate) => normalizeHost(candidate))
    .filter(Boolean);

  return [...new Set(candidates)];
};

const resolveTenantFromHostname = (hostname, req, rootApiDomain) => {
  if (!hostname) {
    return {
      tenantSlug: null,
      source: 'none',
      isPlatformHost: false,
      host: hostname,
    };
  }

  if (hostname === rootApiDomain) {
    // Single API host: tenant comes from x-tenant-slug header.
    const headerSlug = sanitizeSlug(req.headers['x-tenant-slug'] || '');
    const tenantSlug = headerSlug && isValidSlug(headerSlug) ? headerSlug : null;
    return {
      tenantSlug,
      source: tenantSlug ? 'header' : 'host',
      isPlatformHost: !tenantSlug,
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

const selectBestResolution = (resolutions) => {
  return resolutions.find((resolution) => Boolean(resolution.tenantSlug))
    || resolutions.find((resolution) => Boolean(resolution.isPlatformHost))
    || resolutions.find((resolution) => Boolean(resolution.isLocalHost))
    || resolutions[0];
};

const resolveTenantFromRequest = (req) => {
  const rootApiDomain = (process.env.ROOT_API_DOMAIN || 'api.vpnbeni.com').toLowerCase();
  const hostCandidates = buildHostCandidates(req);

  if (!hostCandidates.length) {
    return {
      tenantSlug: null,
      source: 'none',
      isPlatformHost: false,
      host: '',
    };
  }

  const resolutions = hostCandidates.map((hostname) => (
    resolveTenantFromHostname(hostname, req, rootApiDomain)
  ));

  return selectBestResolution(resolutions);
};

module.exports = {
  resolveTenantFromRequest,
  isValidSlug,
};
