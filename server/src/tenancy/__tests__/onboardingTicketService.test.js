jest.mock('../platformModels', () => ({
  getPlatformModels: jest.fn(),
}));

const { getPlatformModels } = require('../platformModels');
const {
  hashTicket,
  hashOtp,
  createOnboardingTicket,
  consumeOnboardingTicket,
  TICKET_REASONS,
} = require('../onboardingTicketService');

describe('onboardingTicketService', () => {
  let mockTicketModel;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PUBLIC_SIGNUP_TICKET_TTL_MINUTES = '10';
    process.env.PUBLIC_SIGNUP_EMAIL_OTP_TTL_MINUTES = '10';
    process.env.PUBLIC_SIGNUP_EMAIL_OTP_MAX_ATTEMPTS = '5';

    mockTicketModel = {
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    getPlatformModels.mockReturnValue({
      TenantOnboardingTicket: mockTicketModel,
    });
  });

  it('creates ticket with hashed values and expiry', async () => {
    const result = await createOnboardingTicket({
      tenantSlug: 'alpha-school',
      tenantAdminUserId: '507f1f77bcf86cd799439011',
      createdIp: '127.0.0.1',
      createdUserAgent: 'jest',
    });

    expect(result.ticket).toBeTruthy();
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.emailOtpCode).toMatch(/^\d{6}$/);
    expect(result.emailOtpExpiresAt).toBeInstanceOf(Date);
    expect(mockTicketModel.create).toHaveBeenCalledTimes(1);

    const payload = mockTicketModel.create.mock.calls[0][0];
    expect(payload.ticketHash).toBe(hashTicket(result.ticket));
    expect(payload.ticketHash).not.toBe(result.ticket);
    expect(payload.emailOtpHash).toBe(hashOtp(result.emailOtpCode));
    expect(payload.emailOtpHash).not.toBe(result.emailOtpCode);
    expect(payload.tenantSlug).toBe('alpha-school');
  });

  it('consumes valid ticket exactly once with otp', async () => {
    const ticket = 'test-ticket-value-1234567890';
    const ticketHash = hashTicket(ticket);

    mockTicketModel.findOneAndUpdate.mockResolvedValueOnce({
      _id: '1',
      ticketHash,
      tenantSlug: 'alpha-school',
      tenantAdminUserId: '507f1f77bcf86cd799439011',
    });

    const result = await consumeOnboardingTicket({
      ticket,
      expectedTenantSlug: 'alpha-school',
      emailOtp: '123456',
    });

    expect(result.success).toBe(true);
    expect(result.ticketRecord.tenantSlug).toBe('alpha-school');
    expect(mockTicketModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('returns used_ticket reason when ticket is already consumed', async () => {
    const ticket = 'already-used-ticket-value-1234567890';

    mockTicketModel.findOneAndUpdate.mockResolvedValueOnce(null);
    mockTicketModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce({
        ticketHash: hashTicket(ticket),
        tenantSlug: 'alpha-school',
        consumedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        emailOtpHash: hashOtp('123456'),
        emailOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        emailOtpAttemptCount: 0,
      }),
    });

    const result = await consumeOnboardingTicket({
      ticket,
      expectedTenantSlug: 'alpha-school',
      emailOtp: '123456',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe(TICKET_REASONS.USED);
  });

  it('returns expired_ticket reason for expired ticket', async () => {
    const ticket = 'expired-ticket-value-1234567890';

    mockTicketModel.findOneAndUpdate.mockResolvedValueOnce(null);
    mockTicketModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce({
        ticketHash: hashTicket(ticket),
        tenantSlug: 'alpha-school',
        consumedAt: null,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000),
        emailOtpHash: hashOtp('123456'),
        emailOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        emailOtpAttemptCount: 0,
      }),
    });

    const result = await consumeOnboardingTicket({
      ticket,
      expectedTenantSlug: 'alpha-school',
      emailOtp: '123456',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe(TICKET_REASONS.EXPIRED);
  });

  it('returns invalid_otp reason and increments attempts', async () => {
    const ticket = 'otp-mismatch-ticket-value-1234567890';

    mockTicketModel.findOneAndUpdate.mockResolvedValueOnce(null);
    mockTicketModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439012',
        ticketHash: hashTicket(ticket),
        tenantSlug: 'alpha-school',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        emailOtpHash: hashOtp('654321'),
        emailOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        emailOtpAttemptCount: 0,
      }),
    });
    mockTicketModel.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

    const result = await consumeOnboardingTicket({
      ticket,
      expectedTenantSlug: 'alpha-school',
      emailOtp: '123456',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe(TICKET_REASONS.OTP_INVALID);
    expect(mockTicketModel.updateOne).toHaveBeenCalledTimes(1);
  });
});
