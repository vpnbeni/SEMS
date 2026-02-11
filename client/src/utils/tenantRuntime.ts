const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const getHostname = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.hostname.toLowerCase();
};

const getSearchParams = () => {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
};

export const getRootAppDomain = () => import.meta.env.VITE_ROOT_APP_DOMAIN || 'becms.vpnbeni.com';
export const getRootApiDomain = () => import.meta.env.VITE_ROOT_API_DOMAIN || 'api.vpnbeni.com';
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const isLocalRuntime = () => {
  const hostname = getHostname();
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost');
};

export const resolveTenantSlug = (): string | null => {
  const hostname = getHostname();

  if (!hostname) {
    return null;
  }

  if (isLocalRuntime()) {
    const params = getSearchParams();
    return (params.get('tenant') || localStorage.getItem('tenantSlug') || '').trim().toLowerCase() || null;
  }

  const rootAppDomain = getRootAppDomain().toLowerCase();

  if (hostname === rootAppDomain) {
    return null;
  }

  if (hostname.endsWith(`.${rootAppDomain}`)) {
    return hostname.replace(`.${rootAppDomain}`, '').trim().toLowerCase() || null;
  }

  return null;
};

export const resolveApiBaseUrl = (): string => {
  if (isLocalRuntime()) {
    return trimTrailingSlash(import.meta.env.VITE_LOCAL_API_URL
      || import.meta.env.VITE_API_URL
      || 'http://localhost:5000/api');
  }

  const tenantSlug = resolveTenantSlug();
  const rootApiDomain = getRootApiDomain();

  if (tenantSlug) {
    return `https://${tenantSlug}.${rootApiDomain}/api`;
  }

  return `https://${rootApiDomain}/api`;
};

export const resolvePlatformAdminApiBaseUrl = (): string => {
  if (isLocalRuntime()) {
    const localApiBase = trimTrailingSlash(
      import.meta.env.VITE_LOCAL_API_URL
      || import.meta.env.VITE_API_URL
      || 'http://localhost:5000/api'
    );
    return `${localApiBase}/admin`;
  }

  return `https://${getRootApiDomain()}/api/admin`;
};

export const buildTenantAppRedirectUrl = (tenantSlug: string, ticket: string): string => {
  const encodedSlug = encodeURIComponent(tenantSlug);
  const encodedTicket = encodeURIComponent(ticket);

  if (isLocalRuntime()) {
    return `${window.location.origin}/?tenant=${encodedSlug}#/signup/complete?ticket=${encodedTicket}`;
  }

  return `https://${tenantSlug}.${getRootAppDomain()}/#/signup/complete?ticket=${encodedTicket}`;
};

export const getTenantHeader = (): string | null => {
  if (!isLocalRuntime()) {
    return null;
  }

  return resolveTenantSlug();
};
