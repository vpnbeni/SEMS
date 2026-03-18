const express = require('express');
const { protect } = require('../middleware/auth');
const { getRemunerationRates } = require('../controllers/remunerationController');

const router = express.Router();

router.use(protect);

router.get('/rates', getRemunerationRates);

module.exports = router;

