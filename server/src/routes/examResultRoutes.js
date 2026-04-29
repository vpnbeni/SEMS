const express = require('express');
const { getResults, upsertResults } = require('../controllers/examResultController');

const router = express.Router();

router.get('/', getResults);
router.post('/bulk', upsertResults);

module.exports = router;
