const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const guidelineSchema = new mongoose.Schema({
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
  },
  rolledOutAt: {
    type: Date,
  },
  rolledOutFrom: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

guidelineSchema.index({ academicYear: 1, isActive: 1 });

module.exports = createContextModelProxy('Guideline', guidelineSchema);
