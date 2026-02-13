const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCirculars,
  createCircular,
  deleteCircular
} = require('../controllers/cbseCircularController');

const router = express.Router();

router.use(protect);

router.get('/', getCirculars);
router.post('/', createCircular);
router.delete('/:id', deleteCircular);

module.exports = router;
