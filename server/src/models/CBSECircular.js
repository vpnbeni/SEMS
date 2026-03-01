const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const cbseCircularSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  circularNumber: {
    type: String,
    trim: true
  },
  publishDate: {
    type: Date,
    required: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

cbseCircularSchema.index({ publishDate: -1, createdAt: -1 });

cbseCircularSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('CBSECircular', cbseCircularSchema);
