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
    circularDate: {
      type: Date,
      required: true,
    },
    referenceSeries: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    referenceNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
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
    pageSize: {
      type: String,
      enum: ['A4', 'legal', 'letter'],
      default: 'A4',
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
examCircularSchema.index({ referenceNumber: 1, isActive: 1 });
examCircularSchema.index({ circularDate: -1, updatedAt: -1 });

examCircularSchema.plugin(academicSessionPlugin);

module.exports = createContextModelProxy('ExamCircular', examCircularSchema);
