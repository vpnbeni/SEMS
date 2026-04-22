const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');
const academicSessionPlugin = require('./plugins/academicSessionPlugin');

const examCircularSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

examCircularSchema.index({ status: 1, updatedAt: -1 });
examCircularSchema.index({ isActive: 1, updatedAt: -1 });

examCircularSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('ExamCircular', examCircularSchema);
