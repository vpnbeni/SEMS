const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  deleteAllSubjects,
  importSubjectsFromPdf,
  getSubjectStats
} = require('../controllers/subjectController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

router.route('/')
  .get(getSubjects)
  .post(createSubject)
  .delete(deleteAllSubjects);

router.get('/stats', getSubjectStats);
router.post('/import-pdf', importSubjectsFromPdf);

router.route('/:id')
  .get(getSubject)
  .put(updateSubject)
  .delete(deleteSubject);

module.exports = router;
