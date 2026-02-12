const mongoose = require('mongoose');

const masterUndertakingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Undertaking title is required'],
    trim: true,
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
  },
  cloudinaryUrl: {
    type: String,
    required: [true, 'Cloudinary URL is required'],
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, 'Cloudinary public ID is required'],
  },
  metadata: {
    pages: Number,
    fileSize: Number,
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

masterUndertakingSchema.index({ academicYear: 1, isActive: 1 });

const MODEL_NAME = 'MasterUndertaking';

const getMasterUndertakingModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterUndertaking model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, masterUndertakingSchema);
};

module.exports = {
  masterUndertakingSchema,
  getMasterUndertakingModel,
  MODEL_NAME,
};
