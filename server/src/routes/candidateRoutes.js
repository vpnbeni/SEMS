const express = require('express');
const {
  getCandidates,
  getCandidate,
  getCandidateSubjectSerials,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  importCandidatesFromPDF,
  getCandidateStats,
  removeSubjectCodeFromCandidates
} = require('../controllers/candidateController');

const { linkCandidateSubjects } = require('../controllers/linkCandidateSubjects');
const {
  reimportCompare,
  reimportImpact,
  reimportApply,
} = require('../controllers/candidateReimportController');

const { protect, authorize } = require('../middleware/auth');
const { validateCandidate } = require('../validations/candidateValidation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Routes
router
  .route('/')
  .get(getCandidates)
  .post(authorize('admin', 'staff'), validateCandidate, createCandidate);

router
  .route('/stats')
  .get(getCandidateStats);

router
  .route('/import')
  .post(authorize('admin', 'staff'), importCandidatesFromPDF);

router
  .route('/link-subjects')
  .post(authorize('admin', 'staff'), linkCandidateSubjects);

router
  .route('/subject-code')
  .delete(authorize('admin'), removeSubjectCodeFromCandidates);

router
  .route('/reimport-compare')
  .post(authorize('admin'), reimportCompare);

router
  .route('/reimport-impact')
  .post(authorize('admin'), reimportImpact);

router
  .route('/reimport-apply')
  .post(authorize('admin'), reimportApply);

router
  .route('/:id/subject-serials')
  .get(getCandidateSubjectSerials);

router
  .route('/:id')
  .get(getCandidate)
  .put(authorize('admin', 'staff'), validateCandidate, updateCandidate)
  .delete(authorize('admin'), deleteCandidate);

module.exports = router;