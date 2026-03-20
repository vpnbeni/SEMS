const fs = require('fs');
const { parseSchoolDirectoryPdf } = require('../../utils/schoolDirectoryParser');

const ALLOWED_CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]);

const getFileBuffer = (file) => {
  if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
    return fs.readFileSync(file.tempFilePath);
  }

  if (file?.data && Buffer.isBuffer(file.data) && file.data.length > 0) {
    return file.data;
  }

  throw new Error('Uploaded file is empty or unavailable');
};

const cleanCell = (value) => String(value || '').replace(/\u00a0/g, ' ').trim();

const normalizeHeader = (value) => cleanCell(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const parseCsvText = (text) => {
  const rows = [];
  let currentCell = '';
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = '';
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const parseSchoolDirectoryCsv = (csvBuffer) => {
  const csvText = csvBuffer.toString('utf8').replace(/^\uFEFF/, '');
  const rows = parseCsvText(csvText)
    .map((row) => row.map(cleanCell))
    .filter((row) => row.some((cell) => cell));

  if (rows.length === 0) {
    return {
      schools: [],
      errors: [{ row: 0, message: 'CSV file is empty' }],
      metadata: { rawRows: 0 },
    };
  }

  const headerRow = rows[0];
  const headerMap = new Map(headerRow.map((header, index) => [normalizeHeader(header), index]));

  const requiredColumns = {
    srNo: ['srno', 'sr_no', 'sno'],
    affiliationNo: ['affno', 'affiliationno', 'affno'],
    schoolCode: ['schcode', 'schoolcode'],
    state: ['state'],
    district: ['district'],
    status: ['status'],
    name: ['name', 'schoolname'],
    headName: ['headname', 'headprincipalname', 'principalname'],
    website: ['website'],
    addressDetails: ['addressdetails', 'address'],
  };

  const getIndex = (keys) => {
    for (const key of keys) {
      if (headerMap.has(key)) {
        return headerMap.get(key);
      }
    }
    return -1;
  };

  const columnIndex = {
    srNo: getIndex(requiredColumns.srNo),
    affiliationNo: getIndex(requiredColumns.affiliationNo),
    schoolCode: getIndex(requiredColumns.schoolCode),
    state: getIndex(requiredColumns.state),
    district: getIndex(requiredColumns.district),
    status: getIndex(requiredColumns.status),
    name: getIndex(requiredColumns.name),
    headName: getIndex(requiredColumns.headName),
    website: getIndex(requiredColumns.website),
    addressDetails: getIndex(requiredColumns.addressDetails),
  };

  if (columnIndex.schoolCode < 0 || columnIndex.name < 0) {
    return {
      schools: [],
      errors: [{
        row: 0,
        message: 'CSV must include at least Sch. Code and Name columns',
      }],
      metadata: { rawRows: rows.length - 1 },
    };
  }

  const schools = [];
  const errors = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const getValue = (index) => (index >= 0 ? cleanCell(row[index]) : '');
    const schoolCode = getValue(columnIndex.schoolCode).toUpperCase();
    const name = getValue(columnIndex.name);

    if (!schoolCode && !name) {
      return;
    }

    if (!schoolCode || !name) {
      errors.push({
        row: rowIndex + 2,
        message: 'School Code and Name are required',
      });
      return;
    }

    const srNo = Number.parseInt(getValue(columnIndex.srNo), 10);
    schools.push({
      srNo: Number.isFinite(srNo) ? srNo : 0,
      affiliationNo: getValue(columnIndex.affiliationNo),
      schoolCode,
      state: getValue(columnIndex.state),
      district: getValue(columnIndex.district),
      status: getValue(columnIndex.status),
      name,
      headName: getValue(columnIndex.headName),
      website: getValue(columnIndex.website),
      addressDetails: getValue(columnIndex.addressDetails),
    });
  });

  const dedupedBySchoolCode = new Map();
  schools.forEach((school) => {
    dedupedBySchoolCode.set(school.schoolCode, school);
  });

  return {
    schools: Array.from(dedupedBySchoolCode.values()),
    errors,
    metadata: { rawRows: rows.length - 1 },
  };
};

exports.uploadSchoolDirectory = async (req, res) => {
  let file = null;

  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    file = req.files.file;
    const fileName = String(file.name || '').toLowerCase();
    const isPdf = file.mimetype === 'application/pdf' || fileName.endsWith('.pdf');
    const isCsv = fileName.endsWith('.csv') || ALLOWED_CSV_MIME_TYPES.has(file.mimetype);

    if (!isPdf && !isCsv) {
      return res.status(400).json({ success: false, message: 'Only PDF or CSV files are allowed' });
    }

    const fileBuffer = getFileBuffer(file);
    const { MasterSchoolDirectory } = req.platformModels;
    const parsed = isCsv
      ? parseSchoolDirectoryCsv(fileBuffer)
      : await parseSchoolDirectoryPdf(fileBuffer);

    if (!parsed.schools.length) {
      return res.status(400).json({
        success: false,
        message: isCsv
          ? 'No school rows could be parsed from this CSV. Please use the provided template.'
          : 'No school rows could be parsed from this PDF. Please upload a text-based school directory PDF.',
        errors: parsed.errors,
      });
    }

    const importedAt = new Date();
    const operations = parsed.schools.map((school) => ({
      updateOne: {
        filter: { schoolCode: school.schoolCode },
        update: {
          $set: {
            ...school,
            sourceFileName: file.name || '',
            lastImportedAt: importedAt,
            isActive: true,
            uploadedBy: req.platformUser?._id || null,
          },
        },
        upsert: true,
      },
    }));

    const result = await MasterSchoolDirectory.bulkWrite(operations);

    return res.json({
      success: true,
      message: `Imported ${parsed.schools.length} schools from ${isCsv ? 'CSV' : 'PDF'}`,
      data: {
        source: isCsv ? 'csv' : 'pdf',
        total: parsed.schools.length,
        inserted: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
        skipped: Math.max(0, parsed.metadata.rawRows - parsed.schools.length),
        errors: parsed.errors,
        metadata: parsed.metadata,
      },
    });
  } catch (error) {
    console.error('School directory upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading school directory PDF',
      error: error.message,
    });
  } finally {
    if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
  }
};

exports.listSchools = async (req, res) => {
  try {
    const { MasterSchoolDirectory } = req.platformModels;

    const schools = await MasterSchoolDirectory.find({ isActive: true })
      .sort({ srNo: 1, schoolCode: 1 })
      .lean();

    res.json({
      success: true,
      data: schools,
    });
  } catch (error) {
    console.error('List school directory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing school directory',
      error: error.message,
    });
  }
};

exports.deleteSchools = async (req, res) => {
  try {
    const { MasterSchoolDirectory } = req.platformModels;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((value) => typeof value === 'string') : [];

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one school record to delete',
      });
    }

    const result = await MasterSchoolDirectory.deleteMany({
      _id: { $in: ids },
    });

    return res.json({
      success: true,
      message: `Deleted ${result.deletedCount || 0} school records`,
      data: {
        deletedCount: result.deletedCount || 0,
      },
    });
  } catch (error) {
    console.error('Delete school directory error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting school directory records',
      error: error.message,
    });
  }
};

exports.updateSchoolType = async (req, res) => {
  try {
    const { MasterSchoolDirectory } = req.platformModels;
    const school = await MasterSchoolDirectory.findOneAndUpdate(
      {
        _id: req.params.id,
        isActive: true,
      },
      {
        $set: {
          manualType: req.body.type,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School record not found',
      });
    }

    return res.json({
      success: true,
      message: 'School type updated successfully',
      data: school,
    });
  } catch (error) {
    console.error('Update school type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating school type',
      error: error.message,
    });
  }
};
