const mongoose = require('mongoose');

const DUTY_TYPES = [
  'CS',
  'QP Collection',
  'AB Deposit',
  'Centre Superintendent',
  'Deputy Centre Superintendent',
  'Observer',
  'Invigilator',
  'ASI (CCTV)',
  'ASI (Frisking Male)',
  'ASI (Frisking Female)',
  'Clerk',
  'Class IV',
];

const masterRemunerationRateSchema = new mongoose.Schema({
  dutyType: {
    type: String,
    required: [true, 'Duty type is required'],
    enum: DUTY_TYPES,
    trim: true,
  },
  rates: {
    remuneration: {
      type: Number,
      default: 0,
      min: 0,
    },
    conveyance: {
      type: Number,
      default: 0,
      min: 0,
    },
    refreshment: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformAdmin',
    default: null,
  },
}, {
  timestamps: true,
});

masterRemunerationRateSchema.index({ dutyType: 1 }, { unique: true });
masterRemunerationRateSchema.index({ isActive: 1 });

const MODEL_NAME = 'MasterRemunerationRate';

const getMasterRemunerationRateModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterRemunerationRate model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, masterRemunerationRateSchema);
};

module.exports = {
  DUTY_TYPES,
  masterRemunerationRateSchema,
  getMasterRemunerationRateModel,
  MODEL_NAME,
};

