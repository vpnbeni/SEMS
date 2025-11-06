const express = require('express');
const router = express.Router();
const guidelinesController = require('../controllers/guidelinesController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Upload guidelines PDF
router.post('/upload', guidelinesController.uploadGuidelines);

// Check if guidelines exist
router.get('/check', guidelinesController.checkGuidelines);

// Parse guidelines and extract structure
router.get('/parse', guidelinesController.parseGuidelines);

// Search within guidelines
router.get('/search', guidelinesController.searchGuidelines);

// Delete guidelines
router.delete('/', guidelinesController.deleteGuidelines);

module.exports = router;
