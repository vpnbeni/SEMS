const ExcelJS = require('exceljs');

const EXPECTED_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

// Upload Excel file with subjects
exports.uploadSubjects = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const file = req.files.file;
    if (file.mimetype !== EXPECTED_MIME_TYPE) {
      return res.status(400).json({ success: false, message: 'Only Excel (.xlsx) files are allowed' });
    }

    const { MasterSubject } = req.platformModels;

    // Parse Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.data);
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

    // Parse rows
    const operations = [];
    const errors = [];
    let skipped = 0;

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

    if (operations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid subjects found in the Excel file',
        errors,
      });
    }

    const result = await MasterSubject.bulkWrite(operations);

    res.json({
      success: true,
      message: `Successfully processed ${operations.length} subjects`,
      data: {
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
