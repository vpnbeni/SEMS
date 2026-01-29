const express = require('express');
const router = express.Router();
const form66Controller = require('../controllers/form66Controller');

// Upload Form 66 text file
router.post('/upload', form66Controller.uploadForm66);

// Import Form 66 from pasted text
router.post('/paste', form66Controller.pasteForm66);

// Get all Form 66 records
router.get('/records', form66Controller.getForm66Records);

// Get unique exam dates
router.get('/dates', form66Controller.getForm66Dates);

// Get subjects for a specific date
router.get('/dates/:date/subjects', form66Controller.getForm66SubjectsByDate);

// Get Form 66 records by date
router.get('/dates/:date/records', form66Controller.getForm66RecordsByDate);

// Get Form 66 records by date and subject
router.get('/dates/:date/subjects/:subjectCode/records', form66Controller.getForm66RecordsByDateAndSubject);

// Delete Form 66 record
router.delete('/records/:id', form66Controller.deleteForm66Record);

module.exports = router;
