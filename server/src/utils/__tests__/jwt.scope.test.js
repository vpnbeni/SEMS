const {
  generateTenantToken,
  generatePlatformToken,
  verifyTenantToken,
  verifyPlatformToken,
} = require('../jwt');

describe('jwt scope behavior', () => {
  const originalEnv = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE,
    PLATFORM_JWT_SECRET: process.env.PLATFORM_JWT_SECRET,
    PLATFORM_JWT_EXPIRE: process.env.PLATFORM_JWT_EXPIRE,
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'tenant-secret-test';
    process.env.JWT_EXPIRE = '1h';
    process.env.JWT_REFRESH_SECRET = 'tenant-refresh-secret-test';
    process.env.JWT_REFRESH_EXPIRE = '7d';
    process.env.PLATFORM_JWT_SECRET = 'platform-secret-test';
    process.env.PLATFORM_JWT_EXPIRE = '1h';
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  it('creates and verifies tenant token with tenant slug', () => {
    const token = generateTenantToken({ id: 'abc123', tenantSlug: 'school-a' });
    const decoded = verifyTenantToken(token);

    expect(decoded.scope).toBe('tenant');
    expect(decoded.tenantSlug).toBe('school-a');
  });

  it('rejects platform token in tenant verifier', () => {
    const token = generatePlatformToken({ id: 'admin-1' });

    expect(() => verifyTenantToken(token)).toThrow();
  });

  it('creates and verifies platform token', () => {
    const token = generatePlatformToken({ id: 'admin-2' });
    const decoded = verifyPlatformToken(token);

    expect(decoded.scope).toBe('platform');
    expect(decoded.id).toBe('admin-2');
  });
});
