const mongoose = require('mongoose');

const DEFAULT_GOVT_SCHOOL_KEYWORDS = [
  'Govt.',
  'Government',
  'PM SHRI',
  'GMSSSS',
  'G.M.S.S.S.S',
];

const schoolDirectoryTypeSettingsSchema = new mongoose.Schema({
  govtKeywords: {
    type: [String],
    default: DEFAULT_GOVT_SCHOOL_KEYWORDS,
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

schoolDirectoryTypeSettingsSchema.index({ isActive: 1 });

const MODEL_NAME = 'SchoolDirectoryTypeSettings';

const getSchoolDirectoryTypeSettingsModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get SchoolDirectoryTypeSettings model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, schoolDirectoryTypeSettingsSchema);
};

module.exports = {
  DEFAULT_GOVT_SCHOOL_KEYWORDS,
  schoolDirectoryTypeSettingsSchema,
  getSchoolDirectoryTypeSettingsModel,
  MODEL_NAME,
};
