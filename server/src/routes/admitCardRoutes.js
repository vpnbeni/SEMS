const express = require('express');
const router = express.Router();
const {
  generateAdmitCards,
  getAdmitCardDesign,
  saveAdmitCardDesign,
  uploadAdmitCardSignature,
} = require('../controllers/admitCardController');

router.get('/design', getAdmitCardDesign);
router.put('/design', saveAdmitCardDesign);
router.post('/design/image', require('../controllers/formatCanvasController').uploadFormatCanvasImage);
router.post('/design/signature/:role', uploadAdmitCardSignature);
router.get('/', generateAdmitCards);
router.post('/', generateAdmitCards);

module.exports = router;
