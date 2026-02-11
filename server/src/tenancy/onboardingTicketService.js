const crypto = require('crypto');
const { getPlatformModels } = require('./platformModels');

const TICKET_REASONS = {
  INVALID: 'invalid_ticket',
  EXPIRED: 'expired_ticket',
  USED: 'used_ticket',
  OTP_REQUIRED: 'otp_required',
  OTP_INVALID: 'invalid_otp',
  OTP_EXPIRED: 'otp_expired',
  OTP_ATTEMPTS_EXCEEDED: 'otp_attempts_exceeded',
};

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
};

const resolveTicketTtlMinutes = () => {
  return parsePositiveInt(process.env.PUBLIC_SIGNUP_TICKET_TTL_MINUTES, 10);
};

const resolveOtpTtlMinutes = () => {
  return parsePositiveInt(process.env.PUBLIC_SIGNUP_EMAIL_OTP_TTL_MINUTES, 10);
};

const resolveOtpMaxAttempts = () => {
  return parsePositiveInt(process.env.PUBLIC_SIGNUP_EMAIL_OTP_MAX_ATTEMPTS, 5);
};

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashTicket = (ticket) => hashValue(ticket);
const hashOtp = (otp) => hashValue(otp);

const generateEmailOtp = () => {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
};

const resolveOtpExpiry = (ticketExpiresAt) => {
  const otpTtlMinutes = resolveOtpTtlMinutes();
  const otpExpiryCandidate = new Date(Date.now() + otpTtlMinutes * 60 * 1000);

  if (ticketExpiresAt && otpExpiryCandidate > ticketExpiresAt) {
    return ticketExpiresAt;
  }

  return otpExpiryCandidate;
};

const createOnboardingTicket = async ({
  tenantSlug,
  tenantAdminUserId,
  createdIp = null,
  createdUserAgent = null,
}) => {
  const rawTicket = crypto.randomBytes(32).toString('base64url');
  const ticketHash = hashTicket(rawTicket);
  const ttlMinutes = resolveTicketTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const emailOtpCode = generateEmailOtp();
  const emailOtpExpiresAt = resolveOtpExpiry(expiresAt);
  const emailOtpSentAt = new Date();

  const { TenantOnboardingTicket } = getPlatformModels();

  await TenantOnboardingTicket.create({
    ticketHash,
    tenantSlug,
    tenantAdminUserId: tenantAdminUserId.toString(),
    expiresAt,
    emailOtpHash: hashOtp(emailOtpCode),
    emailOtpExpiresAt,
    emailOtpSentAt,
    emailOtpVerifiedAt: null,
    emailOtpAttemptCount: 0,
    emailOtpLastAttemptAt: null,
    createdIp,
    createdUserAgent: createdUserAgent ? String(createdUserAgent).slice(0, 300) : null,
  });

  return {
    ticket: rawTicket,
    expiresAt,
    ttlMinutes,
    emailOtpCode,
    emailOtpExpiresAt,
  };
};

const resolveTicketFailureReason = ({
  existingTicket,
  expectedTenantSlug,
  now,
  maxOtpAttempts,
}) => {
  if (!existingTicket) {
    return TICKET_REASONS.INVALID;
  }

  if (expectedTenantSlug && existingTicket.tenantSlug !== expectedTenantSlug) {
    return TICKET_REASONS.INVALID;
  }

  if (existingTicket.consumedAt) {
    return TICKET_REASONS.USED;
  }

  if (existingTicket.expiresAt <= now) {
    return TICKET_REASONS.EXPIRED;
  }

  if (!existingTicket.emailOtpHash || !existingTicket.emailOtpExpiresAt) {
    return TICKET_REASONS.OTP_REQUIRED;
  }

  if ((existingTicket.emailOtpAttemptCount || 0) >= maxOtpAttempts) {
    return TICKET_REASONS.OTP_ATTEMPTS_EXCEEDED;
  }

  if (existingTicket.emailOtpExpiresAt <= now) {
    return TICKET_REASONS.OTP_EXPIRED;
  }

  return TICKET_REASONS.INVALID;
};

const consumeOnboardingTicket = async ({ ticket, expectedTenantSlug, emailOtp }) => {
  const ticketHash = hashTicket(ticket || '');
  const otpHash = hashOtp(String(emailOtp || ''));
  const maxOtpAttempts = resolveOtpMaxAttempts();
  const now = new Date();
  const { TenantOnboardingTicket } = getPlatformModels();

  if (!emailOtp) {
    return { success: false, reason: TICKET_REASONS.OTP_REQUIRED };
  }

  const query = {
    ticketHash,
    consumedAt: null,
    expiresAt: { $gt: now },
    emailOtpHash: otpHash,
    emailOtpExpiresAt: { $gt: now },
    emailOtpAttemptCount: { $lt: maxOtpAttempts },
  };

  if (expectedTenantSlug) {
    query.tenantSlug = expectedTenantSlug;
  }

  const consumedTicket = await TenantOnboardingTicket.findOneAndUpdate(
    query,
    {
      $set: {
        consumedAt: now,
        emailOtpVerifiedAt: now,
        emailOtpLastAttemptAt: now,
      },
    },
    { new: true, lean: true }
  );

  if (consumedTicket) {
    return { success: true, ticketRecord: consumedTicket };
  }

  const existingTicket = await TenantOnboardingTicket.findOne({ ticketHash }).lean();
  const reason = resolveTicketFailureReason({
    existingTicket,
    expectedTenantSlug,
    now,
    maxOtpAttempts,
  });

  if (reason !== TICKET_REASONS.INVALID) {
    return { success: false, reason };
  }

  if (existingTicket && existingTicket.emailOtpHash !== otpHash) {
    const nextAttemptCount = (existingTicket.emailOtpAttemptCount || 0) + 1;

    await TenantOnboardingTicket.updateOne(
      { _id: existingTicket._id },
      {
        $set: { emailOtpLastAttemptAt: now },
        $inc: { emailOtpAttemptCount: 1 },
      }
    );

    if (nextAttemptCount >= maxOtpAttempts) {
      return { success: false, reason: TICKET_REASONS.OTP_ATTEMPTS_EXCEEDED };
    }

    return { success: false, reason: TICKET_REASONS.OTP_INVALID };
  }

  return { success: false, reason: TICKET_REASONS.INVALID };
};

const refreshOnboardingTicketEmailOtp = async ({ ticket, expectedTenantSlug }) => {
  const ticketHash = hashTicket(ticket || '');
  const maxOtpAttempts = resolveOtpMaxAttempts();
  const now = new Date();
  const { TenantOnboardingTicket } = getPlatformModels();

  const existingTicket = await TenantOnboardingTicket.findOne({ ticketHash }).lean();
  const reason = resolveTicketFailureReason({
    existingTicket,
    expectedTenantSlug,
    now,
    maxOtpAttempts,
  });

  if (reason === TICKET_REASONS.INVALID && !existingTicket) {
    return { success: false, reason: TICKET_REASONS.INVALID };
  }

  if (reason !== TICKET_REASONS.INVALID) {
    if (
      reason === TICKET_REASONS.OTP_REQUIRED
      || reason === TICKET_REASONS.OTP_EXPIRED
      || reason === TICKET_REASONS.OTP_ATTEMPTS_EXCEEDED
    ) {
      // Continue and rotate OTP for valid ticket lifecycle states.
    } else {
      return { success: false, reason };
    }
  }

  const emailOtpCode = generateEmailOtp();
  const emailOtpExpiresAt = resolveOtpExpiry(existingTicket.expiresAt);
  const emailOtpSentAt = new Date();

  const rotated = await TenantOnboardingTicket.findOneAndUpdate(
    {
      _id: existingTicket._id,
      consumedAt: null,
      expiresAt: { $gt: now },
      ...(expectedTenantSlug ? { tenantSlug: expectedTenantSlug } : {}),
    },
    {
      $set: {
        emailOtpHash: hashOtp(emailOtpCode),
        emailOtpExpiresAt,
        emailOtpSentAt,
        emailOtpVerifiedAt: null,
        emailOtpAttemptCount: 0,
        emailOtpLastAttemptAt: null,
      },
    },
    { new: true, lean: true }
  );

  if (!rotated) {
    return { success: false, reason: TICKET_REASONS.INVALID };
  }

  return {
    success: true,
    ticketRecord: rotated,
    emailOtpCode,
    emailOtpExpiresAt,
  };
};

module.exports = {
  TICKET_REASONS,
  hashTicket,
  hashOtp,
  resolveTicketTtlMinutes,
  resolveOtpTtlMinutes,
  resolveOtpMaxAttempts,
  createOnboardingTicket,
  consumeOnboardingTicket,
  refreshOnboardingTicketEmailOtp,
};
