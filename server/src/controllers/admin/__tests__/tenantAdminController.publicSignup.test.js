jest.mock('../../../tenancy/provisionTenant', () => ({
  provisionTenant: jest.fn(),
}));

jest.mock('../../../tenancy/onboardingTicketService', () => ({
  createOnboardingTicket: jest.fn(),
  consumeOnboardingTicket: jest.fn(),
  refreshOnboardingTicketEmailOtp: jest.fn(),
  TICKET_REASONS: {
    INVALID: 'invalid_ticket',
    EXPIRED: 'expired_ticket',
    USED: 'used_ticket',
    OTP_REQUIRED: 'otp_required',
    OTP_INVALID: 'invalid_otp',
    OTP_EXPIRED: 'otp_expired',
    OTP_ATTEMPTS_EXCEEDED: 'otp_attempts_exceeded',
  },
}));

jest.mock('../../../tenancy/tenantConnectionManager', () => ({
  getTenantConnectionAndModels: jest.fn(),
  removeTenantFromCache: jest.fn(),
}));

jest.mock('../../../config/platformDatabase', () => ({
  getPlatformConnection: jest.fn(),
}));

jest.mock('../../../utils/jwt', () => ({
  generateTenantToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));

jest.mock('../../../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message' }),
}));

const { provisionTenant } = require('../../../tenancy/provisionTenant');
const {
  createOnboardingTicket,
  consumeOnboardingTicket,
} = require('../../../tenancy/onboardingTicketService');
const {
  getTenantConnectionAndModels,
  removeTenantFromCache,
} = require('../../../tenancy/tenantConnectionManager');
const { getPlatformConnection } = require('../../../config/platformDatabase');
const { generateTenantToken, generateRefreshToken } = require('../../../utils/jwt');

const {
  startPublicTenantSignup,
  exchangePublicTenantSignup,
  deleteTenant,
} = require('../tenantAdminController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('tenantAdminController public signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts public tenant signup and returns onboarding ticket', async () => {
    const req = {
      body: {
        slug: 'alpha-school',
        name: 'Alpha School',
        adminEmail: 'admin@alpha.com',
        adminPassword: 'Password@123',
      },
      headers: {
        'user-agent': 'jest-test',
      },
      ip: '127.0.0.1',
    };
    const res = createRes();

    provisionTenant.mockResolvedValueOnce({
      tenant: { slug: 'alpha-school' },
      tenantAdmin: { _id: '507f1f77bcf86cd799439011' },
    });
    createOnboardingTicket.mockResolvedValueOnce({
      ticket: 'raw-ticket',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      emailOtpCode: '123456',
      emailOtpExpiresAt: new Date('2030-01-01T00:05:00.000Z'),
    });

    startPublicTenantSignup(req, res, jest.fn());
    await flush();

    expect(provisionTenant).toHaveBeenCalledTimes(1);
    expect(createOnboardingTicket).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        ticket: 'raw-ticket',
        tenantSlug: 'alpha-school',
      }),
    }));
  });

  it('returns deterministic slug_taken error code on conflict', async () => {
    const req = {
      body: {
        slug: 'alpha-school',
        name: 'Alpha School',
        adminEmail: 'admin@alpha.com',
        adminPassword: 'Password@123',
      },
      headers: {},
      ip: '127.0.0.1',
    };
    const res = createRes();

    const error = new Error('conflict');
    error.statusCode = 409;
    error.errorCode = 'slug_taken';
    provisionTenant.mockRejectedValueOnce(error);

    startPublicTenantSignup(req, res, jest.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      errorCode: 'slug_taken',
    }));
  });

  it('exchanges ticket and returns auth payload', async () => {
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      email: 'admin@alpha.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      addRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    const req = {
      body: {
        ticket: 'raw-ticket',
        tenantSlug: 'alpha-school',
        otp: '123456',
      },
      platformModels: {
        Tenant: {
          findOne: jest.fn().mockResolvedValue({
            slug: 'alpha-school',
            name: 'Alpha School',
            status: 'active',
            dbName: 'sems_tenant_alpha_school',
          }),
        },
      },
    };
    const res = createRes();

    consumeOnboardingTicket.mockResolvedValueOnce({
      success: true,
      ticketRecord: {
        tenantAdminUserId: '507f1f77bcf86cd799439011',
      },
    });
    getTenantConnectionAndModels.mockReturnValueOnce({
      models: {
        User: {
          findById: jest.fn().mockResolvedValue(userDoc),
        },
      },
    });
    generateTenantToken.mockReturnValueOnce('tenant-access-token');
    generateRefreshToken.mockReturnValueOnce('tenant-refresh-token');

    exchangePublicTenantSignup(req, res, jest.fn());
    await flush();

    expect(consumeOnboardingTicket).toHaveBeenCalledTimes(1);
    expect(generateTenantToken).toHaveBeenCalledTimes(1);
    expect(generateRefreshToken).toHaveBeenCalledTimes(1);
    expect(userDoc.addRefreshToken).toHaveBeenCalledWith('tenant-refresh-token');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        token: 'tenant-access-token',
        refreshToken: 'tenant-refresh-token',
      }),
    }));
  });

  it('returns used_ticket error code when exchange ticket is consumed', async () => {
    const req = {
      body: {
        ticket: 'raw-ticket',
        tenantSlug: 'alpha-school',
        otp: '123456',
      },
      platformModels: {
        Tenant: {
          findOne: jest.fn(),
        },
      },
    };
    const res = createRes();

    consumeOnboardingTicket.mockResolvedValueOnce({
      success: false,
      reason: 'used_ticket',
    });

    exchangePublicTenantSignup(req, res, jest.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      errorCode: 'used_ticket',
    }));
  });

  it('blocks tenant deletion when entered slug does not match', async () => {
    const req = {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { confirmSlug: 'wrong-slug' },
      platformModels: {
        Tenant: {
          findById: jest.fn().mockResolvedValue({
            _id: '507f1f77bcf86cd799439011',
            slug: 'alpha-school',
            dbName: 'sems_tenant_alpha_school',
          }),
        },
      },
    };
    const res = createRes();

    deleteTenant(req, res, jest.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
    }));
  });

  it('deletes tenant database and central records when slug matches', async () => {
    const dropDatabase = jest.fn().mockResolvedValue(undefined);
    const removeDb = jest.fn();
    const platformConnection = {
      useDb: jest.fn().mockReturnValue({ dropDatabase }),
      removeDb,
    };
    getPlatformConnection.mockReturnValue(platformConnection);

    const tenantDoc = {
      _id: '507f1f77bcf86cd799439011',
      slug: 'alpha-school',
      dbName: 'sems_tenant_alpha_school',
    };

    const Tenant = {
      findById: jest.fn().mockResolvedValue(tenantDoc),
      findByIdAndDelete: jest.fn().mockResolvedValue(tenantDoc),
    };
    const TenantOnboardingTicket = {
      deleteMany: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    const req = {
      params: { id: tenantDoc._id },
      body: { confirmSlug: tenantDoc.slug },
      platformModels: {
        Tenant,
        TenantOnboardingTicket,
      },
    };
    const res = createRes();

    deleteTenant(req, res, jest.fn());
    await flush();

    expect(platformConnection.useDb).toHaveBeenCalledWith(tenantDoc.dbName, { useCache: true });
    expect(dropDatabase).toHaveBeenCalledTimes(1);
    expect(TenantOnboardingTicket.deleteMany).toHaveBeenCalledWith({ tenantSlug: tenantDoc.slug });
    expect(Tenant.findByIdAndDelete).toHaveBeenCalledWith(tenantDoc._id);
    expect(removeTenantFromCache).toHaveBeenCalledWith(tenantDoc.dbName);
    expect(removeDb).toHaveBeenCalledWith(tenantDoc.dbName);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        slug: tenantDoc.slug,
      }),
    }));
  });
});
