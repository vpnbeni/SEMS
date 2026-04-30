const express = require('express');
const router = express.Router();
const { generateSingle, generateBulk } = require('../controllers/reportCardController');

router.get('/single', generateSingle);
router.get('/bulk', generateBulk);

module.exports = router;
