const mongoose = require('mongoose');

const tenantOnboardingTicketSchema = new mongoose.Schema({
  ticketHash: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  tenantSlug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  tenantAdminUserId: {
    type: String,
    required: true,
    trim: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  consumedAt: {
    type: Date,
    default: null,
  },
  emailOtpHash: {
    type: String,
    trim: true,
    default: null,
  },
  emailOtpExpiresAt: {
    type: Date,
    default: null,
  },
  emailOtpSentAt: {
    type: Date,
    default: null,
  },
  emailOtpVerifiedAt: {
    type: Date,
    default: null,
  },
  emailOtpAttemptCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  emailOtpLastAttemptAt: {
    type: Date,
    default: null,
  },
  createdIp: {
    type: String,
    default: null,
  },
  createdUserAgent: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

tenantOnboardingTicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tenantOnboardingTicketSchema.index({ tenantSlug: 1, consumedAt: 1 });
tenantOnboardingTicketSchema.index({ tenantSlug: 1, emailOtpVerifiedAt: 1 });

const MODEL_NAME = 'TenantOnboardingTicket';

const getTenantOnboardingTicketModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get TenantOnboardingTicket model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, tenantOnboardingTicketSchema);
};

module.exports = {
  tenantOnboardingTicketSchema,
  getTenantOnboardingTicketModel,
  MODEL_NAME,
};
