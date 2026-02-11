const mongoose = require('mongoose');

const masterGuidelineSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Guideline title is required'],
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
    totalCharacters: Number,
  },
  parsedStructure: {
    chapters: [{
      number: String,
      title: String,
      description: String,
    }],
    appendices: [{
      letter: String,
      title: String,
      subtitle: String,
    }],
    guidelines: [{
      number: String,
      text: String,
    }],
    headings: [String],
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

masterGuidelineSchema.index({ academicYear: 1, isActive: 1 });

const MODEL_NAME = 'MasterGuideline';

const getMasterGuidelineModel = (connection) => {
  if (!connection) {
    throw new Error('A mongoose connection is required to get MasterGuideline model');
  }

  return connection.models[MODEL_NAME] || connection.model(MODEL_NAME, masterGuidelineSchema);
};

module.exports = {
  masterGuidelineSchema,
  getMasterGuidelineModel,
  MODEL_NAME,
};
