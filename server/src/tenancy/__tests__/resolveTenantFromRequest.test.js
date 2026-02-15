const { resolveTenantFromRequest } = require('../resolveTenantFromRequest');

describe('resolveTenantFromRequest', () => {
  const originalRootApiDomain = process.env.ROOT_API_DOMAIN;

  beforeEach(() => {
    process.env.ROOT_API_DOMAIN = 'api.vpnbeni.com';
  });

  afterAll(() => {
    process.env.ROOT_API_DOMAIN = originalRootApiDomain;
  });

  it('resolves tenant slug from subdomain host', () => {
    const req = {
      headers: { host: 'xyz.api.vpnbeni.com' },
      query: {},
    };

    const result = resolveTenantFromRequest(req);

    expect(result.tenantSlug).toBe('xyz');
    expect(result.source).toBe('host');
    expect(result.isPlatformHost).toBe(false);
  });

  it('marks root api host as platform', () => {
    const req = {
      headers: { host: 'api.vpnbeni.com' },
      query: {},
    };

    const result = resolveTenantFromRequest(req);

    expect(result.tenantSlug).toBeNull();
    expect(result.isPlatformHost).toBe(true);
  });

  it('supports localhost tenant resolution from header', () => {
    const req = {
      headers: {
        host: 'localhost:5000',
        'x-tenant-slug': 'localtenant',
      },
      query: {},
    };

    const result = resolveTenantFromRequest(req);

    expect(result.tenantSlug).toBe('localtenant');
    expect(result.source).toBe('header');
    expect(result.isLocalHost).toBe(true);
  });

  it('supports localhost tenant resolution from query', () => {
    const req = {
      headers: {
        host: 'localhost:5000',
      },
      query: {
        tenant: 'school-a',
      },
    };

    const result = resolveTenantFromRequest(req);

    expect(result.tenantSlug).toBe('school-a');
    expect(result.source).toBe('query');
  });

  it('returns null for invalid tenant slug format', () => {
    const req = {
      headers: {
        host: 'invalid_slug.api.vpnbeni.com',
      },
      query: {},
    };

    const result = resolveTenantFromRequest(req);

    expect(result.tenantSlug).toBeNull();
  });

  it('uses host header tenant resolution when forwarded host does not match api domain', () => {
    const req = {
      headers: {
        host: 'api.vpnbeni.com',
        'x-forwarded-host': 'ib.vpnbeni.com',
        'x-tenant-slug': 'school-a',
      },
      query: {},
    };

    const result = resolveTenantFromRequest(req);

    expect(result.tenantSlug).toBe('school-a');
    expect(result.source).toBe('header');
    expect(result.host).toBe('api.vpnbeni.com');
  });

  it('falls back to forwarded host when host header cannot resolve tenant context', () => {
    const req = {
      headers: {
        host: 'internal.service',
        'x-forwarded-host': 'xyz.api.vpnbeni.com',
      },
      query: {},
    };

    const result = resolveTenantFromRequest(req);

    expect(result.tenantSlug).toBe('xyz');
    expect(result.source).toBe('host');
    expect(result.host).toBe('xyz.api.vpnbeni.com');
  });
});
