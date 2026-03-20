const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending'
  },
  completedAt: Date,
  recordCount: Number,
  fileUrl: String,
  validationWarnings: [String]
}, { _id: false });

const onboardingSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionType: {
    type: String,
    enum: ['initial', 'reimport'],
    default: 'initial'
  },
  steps: {
    candidateImportX: stepSchema,
    candidateImportXII: stepSchema,
    form66UploadX: stepSchema,
    form66UploadXII: stepSchema,
    attendanceUploadX: stepSchema,
    attendanceUploadXII: stepSchema
  },
  validationReport: {
    candidateCountX: Number,
    candidateCountXII: Number,
    form66MismatchesX: [mongoose.Schema.Types.Mixed],
    form66MismatchesXII: [mongoose.Schema.Types.Mixed],
    attendanceMismatchesX: [mongoose.Schema.Types.Mixed],
    attendanceMismatchesXII: [mongoose.Schema.Types.Mixed],
    overallStatus: {
      type: String,
      enum: ['valid', 'warnings', 'errors'],
      default: 'valid'
    }
  },
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OnboardingSession', onboardingSessionSchema);
