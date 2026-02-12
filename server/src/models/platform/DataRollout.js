const mongoose = require('mongoose');

const ROLLOUT_MODULES = {
  SUBJECTS: 'subjects',
  DATESHEET: 'datesheet',
  GUIDELINES: 'guidelines',
  UNDERTAKING: 'undertaking',
};

const ROLLOUT_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PARTIAL_FAILURE: 'partial_failure',
};

const TENANT_ROLLOUT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

const dataRolloutSchema = new mongoose.Schema({
  module: {
    type: String,
    required: [true, 'Module is required'],
    enum: Object.values(ROLLOUT_MODULES),
  },
  versionLabel: {
    type: String,
    required: [true, 'Version label is required'],
    trim: true,
  },
  masterDataId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Master data ID is required'],
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Initiator is required'],
    ref: 'PlatformAdmin',
  },
  initiatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: Object.values(ROLLOUT_STATUS),
    default: ROLLOUT_STATUS.IN_PROGRESS,
  },
  summary: {
    totalTenants: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  tenantStatuses: [{
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    tenantSlug: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TENANT_ROLLOUT_STATUS),
      default: TENANT_ROLLOUT_STATUS.PENDING,
    },
    error: {
      type: String,
    },
    recordsAffected: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  }],
}, {
  timestamps: true,
});

dataRolloutSchema.index({ module: 1, status: 1 });
dataRolloutSchema.index({ initiatedAt: -1 });

const MODEL_NAME = 'DataRollout';

const getDataRolloutModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get DataRollout model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, dataRolloutSchema);
};

module.exports = {
  ROLLOUT_MODULES,
  ROLLOUT_STATUS,
  TENANT_ROLLOUT_STATUS,
  dataRolloutSchema,
  getDataRolloutModel,
  MODEL_NAME,
};
