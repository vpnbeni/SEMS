const express = require('express');
const router = express.Router();
const {
  getOnboardingStatus,
  startOnboarding,
  completeStep,
  getValidationReport,
  completeOnboarding,
  getOnboardingHistory
} = require('../controllers/onboardingController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get current onboarding status
router.get('/status', getOnboardingStatus);

// Start new onboarding session
router.post('/start', startOnboarding);

// Complete a specific step
router.post('/step/:stepNumber/complete', completeStep);

// Get validation report
router.get('/validation-report', getValidationReport);

// Complete onboarding
router.post('/complete', completeOnboarding);

// Get onboarding history
router.get('/history', getOnboardingHistory);

module.exports = router;
