const { Form66, Form66Upload } = require('../models/Form66');
const form66Parser = require('../utils/form66Parser');
const { generateForm66HTML, recordsToRollRanges } = require('../utils/form66PDFTemplate');
const { convertTxtToPdf, splitIntoPages } = require('../utils/form66TxtToPdf');
const { processAndReorderContent } = require('../utils/form66PdfReorderer');
const { uploadForm66ToCloudinary } = require('../config/cloudinary');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');

// Upload Form 66 text file (Cloud-based workflow)
exports.uploadForm66 = async (req, res) => {
  let tempFilePath = null;
  let uploadRecord = null;

  try {
    console.log('📄 Form 66 upload request received (Cloud-based workflow)');

    if (!req.files || !req.files.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.files.file;
    tempFilePath = file.tempFilePath;

    console.log(`📁 File received: ${file.name} (${file.mimetype})`);

    // Only accept TXT files
    const isTxtFile = file.name.toLowerCase().endsWith('.txt') ||
      file.mimetype === 'text/plain';

    if (!isTxtFile) {
      console.log(`❌ Invalid file type: ${file.name} (${file.mimetype})`);
      return res.status(400).json({
        message: `Only .txt files are allowed. Received: ${file.name} (${file.mimetype})`
      });
    }

    // Create upload record to track progress
    uploadRecord = await Form66Upload.create({
      originalFileName: file.name,
      status: 'processing'
    });

    // Step 1: Read TXT file
    console.log('📖 Step 1: Reading TXT file...');
    const content = await fs.readFile(tempFilePath, 'utf-8');
    console.log(`📄 Read TXT file: ${content.length} characters`);

    // Step 2: Upload original TXT to Cloudinary
    console.log('☁️  Step 2: Uploading original TXT to Cloudinary...');
    const txtBuffer = Buffer.from(content, 'utf-8');
    const originalUpload = await uploadForm66ToCloudinary(txtBuffer, file.name, 'original');
    uploadRecord.originalFileUrl = originalUpload.url;
    uploadRecord.originalFilePublicId = originalUpload.publicId;
    console.log(`✅ Original TXT uploaded: ${originalUpload.url}`);

    // Step 3: Reorder pages by date
    console.log('🔄 Step 3: Analyzing and reordering pages by date...');
    const { reorderedContent, summary } = processAndReorderContent(content);
    console.log(`📊 Analysis: ${summary.uniqueDates} dates, ${summary.uniqueSubjects} subjects`);

    // Step 4: Convert reordered TXT to PDF
    console.log('📄 Step 4: Converting to PDF...');
    const pdfBuffer = await convertTxtToPdf(reorderedContent);
    console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

    // Step 5: Upload reordered PDF to Cloudinary
    console.log('☁️  Step 5: Uploading reordered PDF to Cloudinary...');
    const pdfUpload = await uploadForm66ToCloudinary(pdfBuffer, file.name.replace('.txt', '.pdf'), 'processed');
    uploadRecord.processedPdfUrl = pdfUpload.url;
    uploadRecord.processedPdfPublicId = pdfUpload.publicId;
    console.log(`✅ Processed PDF uploaded: ${pdfUpload.url}`);

    // Step 6: Parse content and save to database
    console.log('🔍 Step 6: Parsing Form 66 content...');
    const records = form66Parser.parseTextFile(content);
    console.log(`✅ Parsed ${records.length} records`);

    if (records.length === 0) {
      uploadRecord.status = 'failed';
      uploadRecord.errorMessage = 'No valid records found in file';
      await uploadRecord.save();
      console.log('❌ No valid records found');
      return res.status(400).json({ message: 'No valid records found in file' });
    }

    // Step 7: Save records to database
    console.log('💾 Step 7: Saving records to database...');
    const savedRecords = await Form66.insertMany(records);
    console.log(`✅ Saved ${savedRecords.length} records`);

    // Update upload record
    uploadRecord.recordCount = savedRecords.length;
    uploadRecord.dateCount = summary.uniqueDates;
    uploadRecord.status = 'completed';
    await uploadRecord.save();

    // Clean up temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(err => console.log('Temp file cleanup error:', err));
    }

    res.status(200).json({
      message: 'Form 66 uploaded and processed successfully',
      count: savedRecords.length,
      dateCount: summary.uniqueDates,
      dates: summary.dates,
      originalFileUrl: uploadRecord.originalFileUrl,
      processedPdfUrl: uploadRecord.processedPdfUrl,
      uploadId: uploadRecord._id,
      records: savedRecords.slice(0, 10) // Only return first 10 for preview
    });
  } catch (error) {
    console.error('❌ Upload Form 66 Error:', error);

    // Update upload record on error
    if (uploadRecord) {
      uploadRecord.status = 'failed';
      uploadRecord.errorMessage = error.message;
      await uploadRecord.save().catch(() => { });
    }

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

/**
 * Fetch content from a URL (http or https)
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} - The content as a string
 */
function fetchFromUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchFromUrl(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to fetch: ${response.statusCode}`));
      }

      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => resolve(data));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Generate PDF for a specific date - preserves original formatting from TXT file
exports.generateForm66PDF = async (req, res) => {
  try {
    const { date } = req.params;
    console.log(`📄 Generating Form 66 PDF for date: ${date} (preserving original format)`);

    // First, check if we have records for this date
    const recordCount = await Form66.countDocuments({ examDate: date, isActive: true });
    if (recordCount === 0) {
      return res.status(404).json({ message: 'No records found for this date' });
    }

    // Fetch the latest completed upload to get the original TXT content
    const latestUpload = await Form66Upload.findOne({ status: 'completed' })
      .sort({ createdAt: -1 });

    if (!latestUpload || !latestUpload.originalFileUrl) {
      return res.status(404).json({
        message: 'Original TXT file not found. Please re-upload the Form 66 file.'
      });
    }

    console.log(`📥 Fetching original TXT from: ${latestUpload.originalFileUrl}`);

    // Fetch the original TXT content from Cloudinary
    const originalContent = await fetchFromUrl(latestUpload.originalFileUrl);
    console.log(`📄 Fetched ${originalContent.length} characters`);

    // Split into pages and extract info
    const allPages = splitIntoPages(originalContent);
    console.log(`📄 Total pages in file: ${allPages.length}`);

    // Filter pages that match the requested date
    const filteredPages = allPages.filter(page => page.date === date);
    console.log(`📄 Pages matching date ${date}: ${filteredPages.length}`);

    if (filteredPages.length === 0) {
      return res.status(404).json({
        message: `No pages found for date ${date} in the original file`
      });
    }

    // Reconstruct TXT content from filtered pages (preserving original formatting)
    const filteredContent = filteredPages.map(p => p.content).join('\f');

    // Convert to PDF using the original content (preserving exact formatting)
    console.log('📄 Converting filtered pages to PDF...');
    const pdfBuffer = await convertTxtToPdf(filteredContent);
    console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="Form66_${date.replace(/\./g, '-')}.pdf"`);
    res.end(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Generate Form 66 PDF Error:', error);
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

    // Also clear upload records
    await Form66Upload.deleteMany({});

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

// Get the latest processed PDF URL
exports.getProcessedPdf = async (req, res) => {
  try {
    const latestUpload = await Form66Upload.findOne({ status: 'completed' })
      .sort({ createdAt: -1 });

    if (!latestUpload || !latestUpload.processedPdfUrl) {
      return res.status(404).json({ message: 'No processed PDF found' });
    }

    res.json({
      url: latestUpload.processedPdfUrl,
      fileName: latestUpload.originalFileName.replace('.txt', '.pdf'),
      uploadedAt: latestUpload.createdAt
    });
  } catch (error) {
    console.error('Get Processed PDF Error:', error);
    res.status(500).json({
      message: 'Failed to fetch processed PDF',
      error: error.message
    });
  }
};

// Get the latest original TXT file URL
exports.getOriginalFile = async (req, res) => {
  try {
    const latestUpload = await Form66Upload.findOne({ status: 'completed' })
      .sort({ createdAt: -1 });

    if (!latestUpload || !latestUpload.originalFileUrl) {
      return res.status(404).json({ message: 'No original file found' });
    }

    res.json({
      url: latestUpload.originalFileUrl,
      fileName: latestUpload.originalFileName,
      uploadedAt: latestUpload.createdAt
    });
  } catch (error) {
    console.error('Get Original File Error:', error);
    res.status(500).json({
      message: 'Failed to fetch original file',
      error: error.message
    });
  }
};

// Get upload history
exports.getUploadHistory = async (req, res) => {
  try {
    const uploads = await Form66Upload.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(uploads);
  } catch (error) {
    console.error('Get Upload History Error:', error);
    res.status(500).json({
      message: 'Failed to fetch upload history',
      error: error.message
    });
  }
};
