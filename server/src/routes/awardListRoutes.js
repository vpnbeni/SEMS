const express = require('express');
const router = express.Router();
const {
  generateAwardList,
  getAwardListDesign,
  saveAwardListDesign,
} = require('../controllers/awardListController');

router.get('/design', getAwardListDesign);
router.put('/design', saveAwardListDesign);
router.get('/', generateAwardList);
router.post('/', generateAwardList);

module.exports = router;
