const express = require('express');
const undertakingController = require('../controllers/undertakingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/current', undertakingController.getCurrentUndertaking);
router.get('/download', undertakingController.downloadCurrentUndertaking);

module.exports = router;
