const mongoose = require('mongoose');

const masterSchoolDirectorySchema = new mongoose.Schema({
  srNo: {
    type: Number,
    default: 0,
    min: 0,
  },
  affiliationNo: {
    type: String,
    trim: true,
    maxlength: [40, 'Affiliation number cannot be more than 40 characters'],
  },
  schoolCode: {
    type: String,
    required: [true, 'School code is required'],
    trim: true,
    uppercase: true,
    maxlength: [40, 'School code cannot be more than 40 characters'],
  },
  state: {
    type: String,
    trim: true,
    maxlength: [120, 'State cannot be more than 120 characters'],
    default: '',
  },
  district: {
    type: String,
    trim: true,
    maxlength: [120, 'District cannot be more than 120 characters'],
    default: '',
  },
  status: {
    type: String,
    trim: true,
    maxlength: [120, 'Status cannot be more than 120 characters'],
    default: '',
  },
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    maxlength: [300, 'School name cannot be more than 300 characters'],
  },
  headName: {
    type: String,
    trim: true,
    maxlength: [200, 'Head name cannot be more than 200 characters'],
    default: '',
  },
  website: {
    type: String,
    trim: true,
    maxlength: [500, 'Website cannot be more than 500 characters'],
    default: '',
  },
  addressDetails: {
    type: String,
    trim: true,
    maxlength: [1500, 'Address details cannot be more than 1500 characters'],
    default: '',
  },
  manualType: {
    type: String,
    enum: ['Govt.', 'Private', ''],
    default: '',
  },
  sourceFileName: {
    type: String,
    trim: true,
    maxlength: [260, 'Source file name cannot be more than 260 characters'],
    default: '',
  },
  lastImportedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformAdmin',
    default: null,
  },
}, {
  timestamps: true,
});

masterSchoolDirectorySchema.index({ schoolCode: 1 }, { unique: true });
masterSchoolDirectorySchema.index({ state: 1, district: 1 });
masterSchoolDirectorySchema.index({ isActive: 1, schoolCode: 1 });

const MODEL_NAME = 'MasterSchoolDirectory';

const getMasterSchoolDirectoryModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterSchoolDirectory model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, masterSchoolDirectorySchema);
};

module.exports = {
  masterSchoolDirectorySchema,
  getMasterSchoolDirectoryModel,
  MODEL_NAME,
};
