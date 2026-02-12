const ExcelJS = require('exceljs');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const ALLOWED_EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);
const ALLOWED_PDF_MIME_TYPES = new Set(['application/pdf']);

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && value.text) {
    return String(value.text).trim();
  }

  return String(value).trim();
};

const parseBooleanCell = (value, defaultValue) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', 'n', '0'].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const normalizeClassValue = (classValue) => {
  const normalized = classValue.toLowerCase().replace(/\s+/g, '');
  if (['10', '10th', 'x', 'class10', 'classx'].includes(normalized) || normalized.includes('10')) {
    return '10th';
  }
  if (['12', '12th', 'xii', 'class12', 'classxii'].includes(normalized) || normalized.includes('12')) {
    return '12th';
  }
  return null;
};

const normalizeDuration = (value) => {
  const parsed = parseInt(normalizeString(value), 10);
  return [2, 3].includes(parsed) ? parsed : 3;
};

const normalizeAnswerSheet = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized || normalized === 'none') return 'none';
  if (normalized.includes('32')) return '32_pages';
  if (normalized.includes('20')) return '20_pages';
  if (normalized.includes('40') || normalized.includes('graph')) return '40_graph';
  return 'none';
};

const getFileBuffer = (file) => {
  if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
    return fs.readFileSync(file.tempFilePath);
  }

  if (file?.data && Buffer.isBuffer(file.data) && file.data.length > 0) {
    return file.data;
  }

  throw new Error('Uploaded file is empty or unavailable');
};

const parseSubjectsFromPdfText = (text) => {
  const subjects = [];
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const subjectPattern = /^(\d{3})\s*(.+?)\s*(10th|12th)\s*(\d)\s*(.+)$/i;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('subcode') || lowerLine.includes('subjectname')) {
      continue;
    }

    const match = line.match(subjectPattern);
    if (!match) {
      continue;
    }

    const code = normalizeString(match[1]).toUpperCase();
    const name = normalizeString(match[2]).replace(/\s+/g, ' ');
    const classValue = normalizeString(match[3]);

    const normalizedClass = normalizeClassValue(classValue);
    if (!normalizedClass) {
      continue;
    }

    subjects.push({
      code,
      name,
      class: normalizedClass,
      duration: normalizeDuration(match[4]),
      answerSheet: normalizeAnswerSheet(match[5]),
      boardCode: code,
      isTheorySubject: true,
      isPracticalSubject: false,
      isActive: true,
    });
  }

  return subjects;
};

// Upload Excel/PDF file with subjects
exports.uploadSubjects = async (req, res) => {
  let file = null;
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    file = req.files.file;
    const fileName = String(file.name || '').toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || ALLOWED_PDF_MIME_TYPES.has(file.mimetype);
    const isExcel = fileName.endsWith('.xlsx') || ALLOWED_EXCEL_MIME_TYPES.has(file.mimetype);

    if (!isExcel && !isPdf) {
      return res.status(400).json({ success: false, message: 'Only .xlsx or .pdf files are allowed' });
    }

    const { MasterSubject } = req.platformModels;
    const operations = [];
    const errors = [];
    let skipped = 0;

    const fileBuffer = getFileBuffer(file);
    if (isPdf) {
      let pdfText = '';
      try {
        const parsed = await pdfParse(fileBuffer);
        pdfText = parsed.text || '';
      } catch (_error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or unsupported PDF file. Please upload a valid text-based PDF.',
        });
      }

      const subjects = parseSubjectsFromPdfText(pdfText);
      if (subjects.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid subjects found in PDF. Ensure it follows the CBSE subjects format.',
        });
      }

      subjects.forEach((subject) => {
        operations.push({
          updateOne: {
            filter: { code: subject.code, class: subject.class },
            update: { $set: subject },
            upsert: true,
          },
        });
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      try {
        await workbook.xlsx.load(fileBuffer);
      } catch (_error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or unsupported Excel file. Please upload a valid .xlsx file.',
        });
      }
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        return res.status(400).json({ success: false, message: 'Excel file has no worksheets' });
      }

      // Find header row and map columns
      const headerRow = worksheet.getRow(1);
      const columnMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const value = String(cell.value || '').trim().toLowerCase();
        if (value.includes('code') && !value.includes('board')) columnMap.code = colNumber;
        else if (value.includes('name') || value.includes('subject')) columnMap.name = colNumber;
        else if (value.includes('class')) columnMap.class = colNumber;
        else if (value.includes('duration')) columnMap.duration = colNumber;
        else if (value.includes('answer') || value.includes('sheet')) columnMap.answerSheet = colNumber;
        else if (value.includes('board')) columnMap.boardCode = colNumber;
        else if (value.includes('theory')) columnMap.isTheorySubject = colNumber;
        else if (value.includes('practical')) columnMap.isPracticalSubject = colNumber;
      });

      if (!columnMap.code || !columnMap.name || !columnMap.class) {
        return res.status(400).json({
          success: false,
          message: 'Excel must have columns: Code, Name/Subject, Class. Optional: Duration, Answer Sheet, Board Code, Theory, Practical',
        });
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const code = normalizeString(row.getCell(columnMap.code).value).toUpperCase();
        const name = normalizeString(row.getCell(columnMap.name).value);
        const classValue = normalizeString(row.getCell(columnMap.class).value);

        if (!code || !name || !classValue) {
          if (code || name || classValue) {
            errors.push({ row: rowNumber, message: `Missing required field(s): ${!code ? 'Code' : ''} ${!name ? 'Name' : ''} ${!classValue ? 'Class' : ''}`.trim() });
          } else {
            skipped += 1;
          }
          return;
        }

        const normalizedClass = normalizeClassValue(classValue);

        if (!normalizedClass) {
          errors.push({ row: rowNumber, message: `Invalid class value: ${classValue}` });
          return;
        }

        const subject = {
          code,
          name,
          class: normalizedClass,
          duration: columnMap.duration ? normalizeDuration(row.getCell(columnMap.duration).value) : 3,
          answerSheet: columnMap.answerSheet ? normalizeAnswerSheet(row.getCell(columnMap.answerSheet).value) : 'none',
          boardCode: columnMap.boardCode ? normalizeString(row.getCell(columnMap.boardCode).value || code).toUpperCase() : code,
          isTheorySubject: columnMap.isTheorySubject ? parseBooleanCell(row.getCell(columnMap.isTheorySubject).value, true) : true,
          isPracticalSubject: columnMap.isPracticalSubject ? parseBooleanCell(row.getCell(columnMap.isPracticalSubject).value, false) : false,
          isActive: true,
        };
        operations.push({
          updateOne: {
            filter: { code: subject.code, class: subject.class },
            update: { $set: subject },
            upsert: true,
          },
        });
      });
    }

    if (operations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid subjects found in the uploaded file',
        errors,
      });
    }

    const result = await MasterSubject.bulkWrite(operations);

    res.json({
      success: true,
      message: `Successfully processed ${operations.length} subjects`,
      data: {
        source: isPdf ? 'pdf' : 'excel',
        total: operations.length,
        inserted: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
        skipped,
        errors,
      },
    });
  } catch (error) {
    console.error('Subject upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing subject upload',
      error: error.message,
    });
  } finally {
    if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
  }
};

// List all master subjects
exports.listSubjects = async (req, res) => {
  try {
    const { MasterSubject } = req.platformModels;
    const { class: classFilter } = req.query;

    const filter = { isActive: true };
    if (classFilter && ['10th', '12th'].includes(classFilter)) {
      filter.class = classFilter;
    }

    const subjects = await MasterSubject.find(filter).sort({ class: 1, code: 1 }).lean();

    res.json({
      success: true,
      data: {
        subjects,
        total: subjects.length,
        class10th: subjects.filter(s => s.class === '10th').length,
        class12th: subjects.filter(s => s.class === '12th').length,
      },
    });
  } catch (error) {
    console.error('List subjects error:', error);
    res.status(500).json({ success: false, message: 'Error listing subjects', error: error.message });
  }
};

// Get subject statistics
exports.getSubjectStats = async (req, res) => {
  try {
    const { MasterSubject } = req.platformModels;

    const total = await MasterSubject.countDocuments({ isActive: true });
    const class10th = await MasterSubject.countDocuments({ isActive: true, class: '10th' });
    const class12th = await MasterSubject.countDocuments({ isActive: true, class: '12th' });

    res.json({
      success: true,
      data: { total, class10th, class12th },
    });
  } catch (error) {
    console.error('Subject stats error:', error);
    res.status(500).json({ success: false, message: 'Error getting subject stats', error: error.message });
  }
};

// Update a single master subject
exports.updateSubject = async (req, res) => {
  try {
    const { MasterSubject } = req.platformModels;
    const { id } = req.params;

    const allowedFields = ['name', 'code', 'class', 'duration', 'answerSheet', 'boardCode', 'isTheorySubject', 'isPracticalSubject'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const subject = await MasterSubject.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, data: subject });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ success: false, message: 'Error updating subject', error: error.message });
  }
};

// Soft delete a master subject
exports.deleteSubject = async (req, res) => {
  try {
    const { MasterSubject } = req.platformModels;
    const { id } = req.params;

    const subject = await MasterSubject.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, message: 'Subject deleted', data: subject });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ success: false, message: 'Error deleting subject', error: error.message });
  }
};
