const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const form66Controller = require('../controllers/form66Controller');

router.use(protect);

// Upload Form 66 text file
router.post('/upload', form66Controller.uploadForm66);

// Import Form 66 from pasted text
router.post('/paste', form66Controller.pasteForm66);

// Get all Form 66 records
router.get('/records', form66Controller.getForm66Records);

// Get unique exam dates
router.get('/dates', form66Controller.getForm66Dates);

// Get the latest processed PDF URL
router.get('/processed-pdf', form66Controller.getProcessedPdf);

// Get the latest original TXT file URL
router.get('/original-file', form66Controller.getOriginalFile);

// Get upload history
router.get('/upload-history', form66Controller.getUploadHistory);

// Get subjects for a specific date
router.get('/dates/:date/subjects', form66Controller.getForm66SubjectsByDate);

// Get Form 66 records by date
router.get('/dates/:date/records', form66Controller.getForm66RecordsByDate);

// Generate PDF for a specific date
router.get('/dates/:date/pdf', form66Controller.generateForm66PDF);

// Get Form 66 records by date and subject
router.get('/dates/:date/subjects/:subjectCode/records', form66Controller.getForm66RecordsByDateAndSubject);

// Generate PDF for a specific date and subject
router.get('/dates/:date/subjects/:subjectCode/pdf', form66Controller.generateForm66PDFBySubject);

// Delete Form 66 record
router.delete('/records/:id', form66Controller.deleteForm66Record);

// Clear all Form 66 records
router.delete('/records', form66Controller.clearAllForm66Records);

module.exports = router;
