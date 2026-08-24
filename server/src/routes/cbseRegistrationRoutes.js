const express = require('express');
const {
  getMatrix,
  saveMatrix,
  getClassSubjectMatrix,
  saveClassSubjectMatrix,
} = require('../controllers/cbseRegistrationController');

const router = express.Router();

router.get('/class-subjects', getClassSubjectMatrix);
router.put('/class-subjects', saveClassSubjectMatrix);
router.get('/', getMatrix);
router.put('/', saveMatrix);

module.exports = router;
