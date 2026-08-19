const express = require('express');
const router = express.Router();
const {
  generateAwardList,
  getAwardListDesign,
  saveAwardListDesign,
} = require('../controllers/awardListController');
const { uploadFormatCanvasImage } = require('../controllers/formatCanvasController');

router.get('/design', getAwardListDesign);
router.put('/design', saveAwardListDesign);
router.post('/design/image', uploadFormatCanvasImage);
router.get('/', generateAwardList);
router.post('/', generateAwardList);

module.exports = router;
