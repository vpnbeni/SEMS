const express = require('express');
const {
  getCandidates,
  getCandidate,
  getCandidateSubjectSerials,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  importCandidatesFromPDF,
  getCandidateStats
} = require('../controllers/candidateController');

const { linkCandidateSubjects } = require('../controllers/linkCandidateSubjects');

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
  .route('/:id/subject-serials')
  .get(getCandidateSubjectSerials);

router
  .route('/:id')
  .get(getCandidate)
  .put(authorize('admin', 'staff'), validateCandidate, updateCandidate)
  .delete(authorize('admin'), deleteCandidate);

module.exports = router;