const express = require('express');
const router = express.Router();
const {
  generateSingle,
  generateBulk,
  getReportCardDesign,
  saveReportCardDesign,
  uploadReportCardImage,
} = require('../controllers/reportCardController');

router.get('/design', getReportCardDesign);
router.put('/design', saveReportCardDesign);
router.post('/design/image', uploadReportCardImage);
router.get('/single', generateSingle);
router.get('/bulk', generateBulk);

module.exports = router;
