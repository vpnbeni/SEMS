const express = require('express');
const { protect } = require('../middleware/auth');
const {
  importFromPdf,
  getCBSEFullDatesheet,
  getCentreDatesheet,
  getAllDatesheets,
  getDatesheetById,
  createDatesheet,
  updateDatesheet,
  deleteDatesheet,
  publishDatesheet
} = require('../controllers/datesheetController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Import datesheet from PDF
router.post('/import-pdf', importFromPdf);

// Get CBSE full datesheet
router.get('/cbse-full', getCBSEFullDatesheet);

// Get centre-specific datesheet based on candidate subject choices
router.get('/centre-datesheet', getCentreDatesheet);

// CRUD operations
router.get('/', getAllDatesheets);
router.post('/', createDatesheet);
router.get('/:id', getDatesheetById);
router.put('/:id', updateDatesheet);
router.delete('/:id', deleteDatesheet);

// Publish datesheet
router.post('/:id/publish', publishDatesheet);

module.exports = router;