const mongoose = require('mongoose');
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [160, 'Email cannot exceed 160 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    message: {
      type: String,
      required: [true, 'Feedback message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

feedbackSchema.index({ createdAt: -1 });

module.exports = createContextModelProxy('Feedback', feedbackSchema);

