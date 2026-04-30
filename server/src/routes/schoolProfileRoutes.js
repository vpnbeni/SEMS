const express = require('express');
const { getProfile, updateProfile, uploadLogo } = require('../controllers/schoolProfileController');

const router = express.Router();

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/logo', uploadLogo);

module.exports = router;
