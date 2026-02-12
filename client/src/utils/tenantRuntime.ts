const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

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

const sanitizeTenantSlug = (value: string | null | undefined): string | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  return TENANT_SLUG_PATTERN.test(normalized) ? normalized : null;
};

const decodeJwtPayload = (token: string | null): Record<string, any> | null => {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
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
    const fromQuery = sanitizeTenantSlug(params.get('tenant'));
    if (fromQuery) {
      localStorage.setItem('tenantSlug', fromQuery);
      return fromQuery;
    }

    const fromStorage = sanitizeTenantSlug(localStorage.getItem('tenantSlug'));
    if (fromStorage) {
      return fromStorage;
    }

    const tokenPayload = decodeJwtPayload(localStorage.getItem('token'));
    const fromToken = sanitizeTenantSlug(tokenPayload?.tenantSlug);
    if (fromToken) {
      localStorage.setItem('tenantSlug', fromToken);
      return fromToken;
    }

    return null;
  }

  const rootAppDomain = getRootAppDomain().toLowerCase();

  if (hostname === rootAppDomain) {
    return null;
  }

  if (hostname.endsWith(`.${rootAppDomain}`)) {
    return sanitizeTenantSlug(hostname.replace(`.${rootAppDomain}`, ''));
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
