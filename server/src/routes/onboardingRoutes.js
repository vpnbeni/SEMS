const express = require('express');
const router = express.Router();
const {
  getOnboardingStatus,
  startOnboarding,
  completeStep,
  getValidationReport,
  completeOnboarding,
  getOnboardingHistory,
  queueAttendanceUpload,
  getJobStatus,
} = require('../controllers/onboardingController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get current onboarding status
router.get('/status', getOnboardingStatus);

// Start new onboarding session
router.post('/start', startOnboarding);

// Complete a specific step (steps 1–4)
router.post('/step/:stepNumber/complete', completeStep);

// Queue both attendance PDFs for background processing (replaces steps 5 & 6)
router.post('/attendance-upload', queueAttendanceUpload);

// Poll the status of a background attendance job
router.get('/jobs/:jobId/status', getJobStatus);

// Get validation report
router.get('/validation-report', getValidationReport);

// Complete onboarding
router.post('/complete', completeOnboarding);

// Get onboarding history
router.get('/history', getOnboardingHistory);

module.exports = router;
