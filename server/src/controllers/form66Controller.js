const fs = require('fs').promises;
const http = require('http');
const https = require('https');
const { Form66, Form66Upload } = require('../models/Form66');
const CBSEDatesheet = require('../models/CBSEDatesheet');
const form66Parser = require('../utils/form66Parser');
const { convertTxtToPdf, splitIntoPages } = require('../utils/form66TxtToPdf');
const { processAndReorderContent } = require('../utils/form66PdfReorderer');
const { uploadForm66ToCloudinary } = require('../config/cloudinary');

const RETRYABLE_DB_ERROR_PATTERNS = [
  'buffering timed out',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
  'ECONNRESET',
  'timed out'
];

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const isRetryableDbError = (error) => {
  const message = String(error?.message || '');
  return RETRYABLE_DB_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

const withDbRetry = async (operation, operationName, attempts = 3) => {
  const attemptOperation = async (attempt) => {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableDbError(error) || attempt === attempts) {
        throw error;
      }

      const waitMs = 1200 * attempt;
      console.warn(
        `⚠️ ${operationName} failed (attempt ${attempt}/${attempts}). Retrying in ${waitMs}ms...`,
        error.message
      );
      await sleep(waitMs);
      return attemptOperation(attempt + 1);
    }
  };

  return attemptOperation(1);
};

const normalizeClassLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['x', '10', '10th', 'class x', 'class 10'].includes(normalized)) return 'X';
  if (['xii', '12', '12th', 'class xii', 'class 12'].includes(normalized)) return 'XII';
  return null;
};

const normalizeClassQueryParam = (value) => normalizeClassLabel(value);

const detectClassHintFromFileName = (fileName = '') => {
  const name = String(fileName).toLowerCase();
  if (/(^|[^a-z0-9])(10|10th|x)([^a-z0-9]|$)/.test(name)) return 'X';
  if (/(^|[^a-z0-9])(12|12th|xii)([^a-z0-9]|$)/.test(name)) return 'XII';
  return null;
};

const buildSubjectCodeKeys = (subjectCode) => {
  const raw = String(subjectCode || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return [];
  const digits = raw.replace(/\D/g, '');
  if (!digits) return [raw];
  const numeric = String(parseInt(digits, 10));
  return [...new Set([raw, digits, numeric])];
};

const buildClassBySubjectCodeMap = (cbseDatesheet) => {
  const codeToClasses = new Map();

  if (!cbseDatesheet?.entries?.length) return codeToClasses;

  cbseDatesheet.entries.forEach((entry) => {
    const classLabel = normalizeClassLabel(entry?.subject?.class);
    if (!classLabel) return;

    const codeKeys = buildSubjectCodeKeys(entry?.subject?.code);
    codeKeys.forEach((key) => {
      if (!codeToClasses.has(key)) codeToClasses.set(key, new Set());
      codeToClasses.get(key).add(classLabel);
    });
  });

  return codeToClasses;
};

const resolveClassFromCodeMap = (subjectCode, codeMap, fileClassHint) => {
  const keys = buildSubjectCodeKeys(subjectCode);

  const matchingSet = keys
    .map((key) => codeMap.get(key))
    .find((classSet) => classSet && classSet.size > 0);

  if (!matchingSet) return null;
  if (matchingSet.size === 1) return [...matchingSet][0];
  if (fileClassHint && matchingSet.has(fileClassHint)) return fileClassHint;
  return null;
};

const enrichForm66Classes = (records, { codeMap, fileClassHint }) => records.map((record) => {
  const classFromCode = resolveClassFromCodeMap(record.subjectCode, codeMap, fileClassHint);
  const normalizedExisting = normalizeClassLabel(record.class);
  return {
    ...record,
    class: classFromCode || fileClassHint || normalizedExisting || 'XII'
  };
});

const findLatestUploadForClass = async (requestedClass) => {
  let latestUpload = await Form66Upload.findOne({
    status: 'completed',
    uploadedClasses: requestedClass
  }).sort({ createdAt: -1 });

  if (latestUpload) return latestUpload;

  // Backward compatibility for old uploads that don't have uploadedClasses.
  const recentUploads = await Form66Upload.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(30);

  latestUpload = recentUploads.find((upload) => {
    const inferredClass = detectClassHintFromFileName(upload?.originalFileName);
    return inferredClass === requestedClass;
  }) || null;

  return latestUpload;
};

// Upload Form 66 text file (Cloud-based workflow)
exports.uploadForm66 = async (req, res) => {
  let tempFilePath = null;
  let uploadRecord = null;

  try {
    console.log('📄 Form 66 upload request received (Cloud-based workflow)');
    const Form66Model = req.models?.Form66 || Form66;
    const Form66UploadModel = req.models?.Form66Upload || Form66Upload;
    const CBSEDatesheetModel = req.models?.CBSEDatesheet || CBSEDatesheet;

    if (!req.files || !req.files.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { file } = req.files;
    tempFilePath = file.tempFilePath;

    console.log(`📁 File received: ${file.name} (${file.mimetype})`);

    // Only accept TXT files
    const isTxtFile = file.name.toLowerCase().endsWith('.txt')
      || file.mimetype === 'text/plain';

    if (!isTxtFile) {
      console.log(`❌ Invalid file type: ${file.name} (${file.mimetype})`);
      return res.status(400).json({
        message: `Only .txt files are allowed. Received: ${file.name} (${file.mimetype})`
      });
    }

    // Create upload record to track progress
    uploadRecord = await withDbRetry(
      () => Form66UploadModel.create({
        originalFileName: file.name,
        status: 'processing'
      }),
      'Creating Form66 upload record'
    );

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
    const parsedRecords = form66Parser.parseTextFile(content);
    console.log(`✅ Parsed ${parsedRecords.length} records`);

    if (parsedRecords.length === 0) {
      uploadRecord.status = 'failed';
      uploadRecord.errorMessage = 'No valid records found in file';
      await withDbRetry(
        () => uploadRecord.save(),
        'Saving failed Form66 upload record'
      );
      console.log('❌ No valid records found');
      return res.status(400).json({ message: 'No valid records found in file' });
    }

    // Step 6.1: Resolve class labels robustly for separate class files
    const fileClassHint = detectClassHintFromFileName(file.name);
    const activeCbseDatesheet = await withDbRetry(
      () => CBSEDatesheetModel.getActive(),
      'Fetching active CBSE datesheet for class mapping',
      2
    ).catch(() => null);
    const codeMap = buildClassBySubjectCodeMap(activeCbseDatesheet);
    const records = enrichForm66Classes(parsedRecords, { codeMap, fileClassHint });

    // Step 7: Replace records only for classes present in this upload
    const classesInUpload = [...new Set(records.map((record) => record.class).filter(Boolean))];
    console.log(`🧹 Step 7: Clearing previous Form 66 records for class(es): ${classesInUpload.join(', ')}`);
    const deleteResult = await withDbRetry(
      () => Form66Model.deleteMany({ class: { $in: classesInUpload } }),
      'Clearing previous Form66 records by class'
    );
    console.log(`✅ Cleared ${deleteResult.deletedCount || 0} previous records`);

    console.log('💾 Step 8: Saving records to database...');
    const savedRecords = await withDbRetry(
      () => Form66Model.insertMany(records),
      'Saving Form66 records'
    );
    console.log(`✅ Saved ${savedRecords.length} records`);

    // Update upload record
    uploadRecord.recordCount = savedRecords.length;
    uploadRecord.dateCount = summary.uniqueDates;
    uploadRecord.uploadedClasses = classesInUpload;
    uploadRecord.status = 'completed';
    await withDbRetry(
      () => uploadRecord.save(),
      'Saving completed Form66 upload record'
    );

    // Clean up temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch((err) => console.log('Temp file cleanup error:', err));
    }

    res.status(200).json({
      message: 'Form 66 uploaded and processed successfully',
      count: savedRecords.length,
      replacedCount: deleteResult.deletedCount || 0,
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
      await withDbRetry(
        () => uploadRecord.save(),
        'Saving failed upload status'
      ).catch(() => { });
    }

    // Clean up temp file on error
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch((err) => console.log('Temp file cleanup error:', err));
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
      subjectCode,
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
      response.on('data', (chunk) => { data += chunk; });
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
    const filteredPages = allPages.filter((page) => page.date === date);
    console.log(`📄 Pages matching date ${date}: ${filteredPages.length}`);

    if (filteredPages.length === 0) {
      return res.status(404).json({
        message: `No pages found for date ${date} in the original file`
      });
    }

    // Reconstruct TXT content from filtered pages (preserving original formatting)
    const filteredContent = filteredPages.map((p) => p.content).join('\f');

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
    const requestedClass = normalizeClassQueryParam(req.query.class);
    const latestUpload = requestedClass
      ? await findLatestUploadForClass(requestedClass)
      : await Form66Upload.findOne({ status: 'completed' }).sort({ createdAt: -1 });

    if (!latestUpload || !latestUpload.processedPdfUrl) {
      return res.status(404).json({
        message: requestedClass
          ? `No processed PDF found for class ${requestedClass}`
          : 'No processed PDF found'
      });
    }

    res.json({
      url: latestUpload.processedPdfUrl,
      fileName: latestUpload.originalFileName.replace('.txt', '.pdf'),
      uploadedAt: latestUpload.createdAt,
      uploadedClasses: latestUpload.uploadedClasses || []
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
    const requestedClass = normalizeClassQueryParam(req.query.class);
    const latestUpload = requestedClass
      ? await findLatestUploadForClass(requestedClass)
      : await Form66Upload.findOne({ status: 'completed' }).sort({ createdAt: -1 });

    if (!latestUpload || !latestUpload.originalFileUrl) {
      return res.status(404).json({
        message: requestedClass
          ? `No original file found for class ${requestedClass}`
          : 'No original file found'
      });
    }

    res.json({
      url: latestUpload.originalFileUrl,
      fileName: latestUpload.originalFileName,
      uploadedAt: latestUpload.createdAt,
      uploadedClasses: latestUpload.uploadedClasses || []
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
