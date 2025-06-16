const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

router.route('/')
  .get(getSubjects)
  .post(createSubject);

router.route('/:id')
  .get(getSubject)
  .put(updateSubject)
  .delete(deleteSubject);

module.exports = router;
