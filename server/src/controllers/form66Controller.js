const Form66 = require('../models/Form66');
const form66Parser = require('../utils/form66Parser');
const { generateForm66HTML, recordsToRollRanges } = require('../utils/form66PDFTemplate');
const fs = require('fs').promises;
const pdf = require('pdf-parse');
const puppeteer = require('puppeteer');

// Upload Form 66 text file
exports.uploadForm66 = async (req, res) => {
  let tempFilePath = null;

  try {
    console.log('📄 Form 66 upload request received');

    if (!req.files || !req.files.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.files.file;
    tempFilePath = file.tempFilePath;

    console.log(`📁 File received: ${file.name} (${file.mimetype})`);

    // Check file type - accept both PDF and TXT files
    const isPdfFile = file.name.toLowerCase().endsWith('.pdf') ||
      file.mimetype === 'application/pdf';
    const isTxtFile = file.name.toLowerCase().endsWith('.txt') ||
      file.mimetype === 'text/plain';

    if (!isPdfFile && !isTxtFile) {
      console.log(`❌ Invalid file type: ${file.name} (${file.mimetype})`);
      return res.status(400).json({
        message: `Only .pdf or .txt files are allowed. Received: ${file.name} (${file.mimetype})`
      });
    }

    let content;

    if (isPdfFile) {
      // Read and parse PDF file
      console.log('📖 Reading PDF file...');
      const dataBuffer = await fs.readFile(tempFilePath);
      const pdfData = await pdf(dataBuffer);
      content = pdfData.text;
      console.log(`📄 Extracted text from PDF: ${content.length} characters`);
    } else {
      // Read TXT file directly
      console.log('📖 Reading TXT file...');
      content = await fs.readFile(tempFilePath, 'utf-8');
      console.log(`📄 Read TXT file: ${content.length} characters`);
    }

    // Parse the content
    console.log('🔍 Parsing Form 66 content...');
    const records = form66Parser.parseTextFile(content);
    console.log(`✅ Parsed ${records.length} records`);

    if (records.length === 0) {
      console.log('❌ No valid records found');
      return res.status(400).json({ message: 'No valid records found in file' });
    }

    // Save records to database
    console.log('💾 Saving records to database...');
    const savedRecords = await Form66.insertMany(records);
    console.log(`✅ Saved ${savedRecords.length} records`);

    // Clean up temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(err => console.log('Temp file cleanup error:', err));
    }

    res.status(200).json({
      message: 'Form 66 uploaded successfully',
      count: savedRecords.length,
      records: savedRecords.slice(0, 10) // Only return first 10 for preview
    });
  } catch (error) {
    console.error('❌ Upload Form 66 Error:', error);

    // Clean up temp file on error
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(err => console.log('Temp file cleanup error:', err));
    }

    res.status(500).json({
      message: 'Failed to upload Form 66',
      error: error.message
    });
  }
};

// Get all Form 66 records
exports.getForm66Records = async (req, res) => {
  try {
    const records = await Form66.find({ isActive: true }).sort({ examDate: 1, rollNo: 1 });
    res.json(records);
  } catch (error) {
    console.error('Get Form 66 Records Error:', error);
    res.status(500).json({
      message: 'Failed to fetch Form 66 records',
      error: error.message
    });
  }
};

// Get Form 66 records by date
exports.getForm66RecordsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const records = await Form66.find({
      examDate: date,
      isActive: true
    }).sort({ rollNo: 1 });

    res.json(records);
  } catch (error) {
    console.error('Get Form 66 Records By Date Error:', error);
    res.status(500).json({
      message: 'Failed to fetch Form 66 records',
      error: error.message
    });
  }
};

// Get Form 66 records by date and subject
exports.getForm66RecordsByDateAndSubject = async (req, res) => {
  try {
    const { date, subjectCode } = req.params;
    const records = await Form66.find({
      examDate: date,
      subjectCode: subjectCode,
      isActive: true
    }).sort({ rollNo: 1 });

    res.json(records);
  } catch (error) {
    console.error('Get Form 66 Records By Date and Subject Error:', error);
    res.status(500).json({
      message: 'Failed to fetch Form 66 records',
      error: error.message
    });
  }
};

// Get unique exam dates from Form 66
exports.getForm66Dates = async (req, res) => {
  try {
    const dates = await Form66.distinct('examDate', { isActive: true });

    // Sort dates
    const sortedDates = dates.sort((a, b) => {
      const dateA = a.split('.').reverse().join('');
      const dateB = b.split('.').reverse().join('');
      return dateA.localeCompare(dateB);
    });

    res.json(sortedDates);
  } catch (error) {
    console.error('Get Form 66 Dates Error:', error);
    res.status(500).json({
      message: 'Failed to fetch Form 66 dates',
      error: error.message
    });
  }
};

// Get subjects for a specific date
exports.getForm66SubjectsByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const subjects = await Form66.aggregate([
      { $match: { examDate: date, isActive: true } },
      {
        $group: {
          _id: { code: '$subjectCode', name: '$subject' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          code: '$_id.code',
          name: '$_id.name',
          count: 1
        }
      },
      { $sort: { code: 1 } }
    ]);

    res.json(subjects);
  } catch (error) {
    console.error('Get Form 66 Subjects By Date Error:', error);
    res.status(500).json({
      message: 'Failed to fetch Form 66 subjects',
      error: error.message
    });
  }
};

// Generate PDF for a specific date
exports.generateForm66PDF = async (req, res) => {
  let browser = null;

  try {
    const { date } = req.params;
    console.log(`📄 Generating Form 66 PDF for date: ${date}`);

    // Fetch all records for this date
    const records = await Form66.find({ examDate: date, isActive: true });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No records found for this date' });
    }

    // Get centre info from first record
    const centreNo = records[0].centreNo;
    const centreName = records[0].centreName;

    // Detect exam type from first record class
    const examType = records[0].class === 'X' ? 'SECONDARY' : 'SR SECONDARY';

    // Group records by subject
    const subjectMap = new Map();

    for (const record of records) {
      const key = `${record.subjectCode}-${record.subject}`;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          code: record.subjectCode,
          name: record.subject,
          records: []
        });
      }
      subjectMap.get(key).records.push(record);
    }

    // Convert to subjects array with roll ranges
    const subjects = Array.from(subjectMap.values()).map(subject => ({
      code: subject.code,
      name: subject.name,
      rollRanges: recordsToRollRanges(subject.records),
      totalCount: subject.records.length
    }));

    // Sort subjects by code
    subjects.sort((a, b) => a.code.localeCompare(b.code));

    // Generate HTML
    const html = generateForm66HTML({
      examDate: date,
      centreNo,
      centreName,
      examType,
      subjects
    });

    // Generate PDF using puppeteer
    console.log('🖨️ Launching puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });

    await browser.close();
    browser = null;

    console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Form66_${date.replace(/\./g, '-')}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate Form 66 PDF Error:', error);

    if (browser) {
      await browser.close().catch(() => { });
    }

    res.status(500).json({
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
};

// Delete Form 66 record
exports.deleteForm66Record = async (req, res) => {
  try {
    const record = await Form66.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete Form 66 Record Error:', error);
    res.status(500).json({
      message: 'Failed to delete record',
      error: error.message
    });
  }
};

// Clear all Form 66 records
exports.clearAllForm66Records = async (req, res) => {
  try {
    console.log('🗑️  Clear all Form 66 records request received');

    const count = await Form66.countDocuments();
    console.log(`Found ${count} Form 66 records`);

    const result = await Form66.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} records`);

    res.json({
      message: 'All Form 66 records cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Clear Form 66 Error:', error);
    res.status(500).json({
      message: 'Failed to clear Form 66 records',
      error: error.message
    });
  }
};

// Import Form 66 from pasted text
exports.pasteForm66 = async (req, res) => {
  try {
    console.log('📄 Form 66 paste import request received');

    const { content } = req.body;

    if (!content || !content.trim()) {
      console.log('❌ No content provided');
      return res.status(400).json({ message: 'No content provided' });
    }

    console.log(`📄 Content length: ${content.length} characters`);

    // Parse the content
    console.log('🔍 Parsing Form 66 content...');
    const records = form66Parser.parseTextFile(content);
    console.log(`✅ Parsed ${records.length} records`);

    if (records.length === 0) {
      console.log('❌ No valid records found');
      return res.status(400).json({ message: 'No valid records found in content' });
    }

    // Save records to database
    console.log('💾 Saving records to database...');
    const savedRecords = await Form66.insertMany(records);
    console.log(`✅ Saved ${savedRecords.length} records`);

    res.status(200).json({
      message: 'Form 66 imported successfully',
      count: savedRecords.length,
      records: savedRecords.slice(0, 10) // Only return first 10 for preview
    });
  } catch (error) {
    console.error('❌ Paste Form 66 Error:', error);
    res.status(500).json({
      message: 'Failed to import Form 66',
      error: error.message
    });
  }
};
