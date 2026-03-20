const pdfParse = require('pdf-parse');

const ROW_START_PATTERN = /^\d+\s+[A-Za-z0-9/-]{2,}\s+[A-Za-z0-9/-]{2,}/;
const SERIALIZED_ROW_PREFIX = '__SCHOOL_DIR_ROW__';
const PDF_COLUMNS = [
  { key: 'srNo', label: 'S No' },
  { key: 'identity', label: 'Aff. No & School Code' },
  { key: 'geography', label: 'State & District' },
  { key: 'status', label: 'Status' },
  { key: 'schoolHead', label: 'School & Head Name' },
  { key: 'address', label: 'Address' },
  { key: 'details', label: 'Details' },
];

const normalizeInlineWhitespace = (value) => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

const cleanCell = (value) => normalizeInlineWhitespace(value)
  .replace(/\s*,\s*/g, ', ')
  .replace(/\s{2,}/g, ' ')
  .trim();

const isHeaderLine = (line) => {
  const normalized = cleanCell(line).toLowerCase();
  return normalized.includes('aff')
    && normalized.includes('sch')
    && normalized.includes('district')
    && normalized.includes('address');
};

const shouldSkipLine = (line) => {
  const normalized = cleanCell(line).toLowerCase();
  return !normalized
    || isHeaderLine(normalized)
    || normalized === 'school directory'
    || normalized.startsWith('page ')
    || normalized.startsWith('generated on ')
    || normalized.startsWith('cbse affiliation')
    || normalized.startsWith('affiliation no');
};

const buildDisplayLine = (items) => {
  const ordered = [...items].sort((a, b) => a.x - b.x);
  let line = '';
  let lastEndX = null;

  ordered.forEach((item, index) => {
    if (index === 0) {
      line += item.text;
      lastEndX = item.x + item.width;
      return;
    }

    const gap = Math.max(0, item.x - (lastEndX || 0));
    const spaces = gap > 18 ? Math.max(2, Math.round(gap / 8)) : 1;
    line += `${' '.repeat(spaces)}${item.text}`;
    lastEndX = item.x + item.width;
  });

  return line.trimEnd();
};

const renderPageWithRows = async (pageData) => {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  const rows = [];
  for (const item of textContent.items) {
    const text = cleanCell(item.str);
    if (!text) {
      continue;
    }

    const x = Number(item.transform?.[4] || 0);
    const y = Number(item.transform?.[5] || 0);
    const width = Number(item.width || 0);
    const existingRow = rows.find((row) => Math.abs(row.y - y) <= 2.5);

    const nextItem = { text, x, y, width };
    if (existingRow) {
      existingRow.items.push(nextItem);
    } else {
      rows.push({ y, items: [nextItem] });
    }
  }

  rows.sort((a, b) => b.y - a.y);

  return rows
    .map((row) => {
      const orderedItems = row.items.sort((a, b) => a.x - b.x);
      return `${SERIALIZED_ROW_PREFIX}${Buffer.from(JSON.stringify({
        y: row.y,
        text: buildDisplayLine(orderedItems),
        items: orderedItems,
      })).toString('base64')}`;
    })
    .join('\n');
};

const parseStructuredRows = (rawText) => String(rawText || '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith(SERIALIZED_ROW_PREFIX))
  .map((line) => {
    const payload = line.slice(SERIALIZED_ROW_PREFIX.length);
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  });

const buildSegments = (items) => {
  const ordered = [...items].sort((a, b) => a.x - b.x);
  const segments = [];

  ordered.forEach((item) => {
    const previous = segments[segments.length - 1];
    if (!previous) {
      segments.push({
        text: item.text,
        x: item.x,
        endX: item.x + item.width,
      });
      return;
    }

    const gap = item.x - previous.endX;
    if (gap <= 14) {
      previous.text = `${previous.text} ${item.text}`;
      previous.endX = item.x + item.width;
      return;
    }

    segments.push({
      text: item.text,
      x: item.x,
      endX: item.x + item.width,
    });
  });

  return segments;
};

const inferColumnBoundaries = (rows) => {
  const headerRow = rows.find((row) => isHeaderLine(row.text));
  if (!headerRow) {
    return null;
  }

  const segments = buildSegments(headerRow.items);
  if (segments.length < PDF_COLUMNS.length) {
    return null;
  }

  const starts = PDF_COLUMNS.map((field, index) => ({
    key: field.key,
    startX: segments[index]?.x ?? null,
  })).filter((field) => field.startX !== null);

  if (starts.length < PDF_COLUMNS.length) {
    return null;
  }

  return starts.map((field, index) => {
    const next = starts[index + 1];
    return {
      key: field.key,
      startX: field.startX,
      endX: next ? (field.startX + next.startX) / 2 : Number.POSITIVE_INFINITY,
    };
  });
};

const createEmptySchool = () => ({
  srNo: 0,
  affiliationNo: '',
  schoolCode: '',
  state: '',
  district: '',
  status: '',
  name: '',
  headName: '',
  website: '',
  addressDetails: '',
  _continuations: {
    identity: null,
    geography: null,
    schoolHead: null,
    address: null,
  },
});

const appendFieldValue = (target, key, value) => {
  const nextValue = cleanCell(value);
  if (!nextValue) {
    return;
  }

  if (!target[key]) {
    target[key] = nextValue;
    return;
  }

  target[key] = cleanCell(`${target[key]} ${nextValue}`);
};

const extractLineCells = (items, boundaries) => {
  const cells = {};

  items.forEach((item) => {
    const boundary = boundaries.find((candidate) => item.x >= candidate.startX && item.x < candidate.endX);
    if (!boundary) {
      return;
    }

    if (!cells[boundary.key]) {
      cells[boundary.key] = '';
    }

    cells[boundary.key] = cleanCell(`${cells[boundary.key]} ${item.text}`);
  });

  return cells;
};

const extractLabelValue = (text, labels) => {
  const source = cleanCell(text);
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp(`${escaped}\\s*:?\\s*(.+)$`, 'i'));
    if (match && match[1]) {
      return cleanCell(match[1]);
    }
  }

  return '';
};

const appendNormalizedField = (school, key, value) => {
  const nextValue = cleanCell(value);
  if (!nextValue) {
    return;
  }

  const finalValue = key === 'schoolCode' ? nextValue.toUpperCase() : nextValue;
  appendFieldValue(school, key, finalValue);
};

const parseIdentityCell = (school, text) => {
  const value = cleanCell(text);
  if (!value) {
    return;
  }

  const affNo = extractLabelValue(value, ['Aff. No.', 'Aff No', 'Aff.No']);
  if (affNo) {
    appendNormalizedField(school, 'affiliationNo', affNo);
    school._continuations.identity = 'affiliationNo';
    return;
  }

  const schoolCode = extractLabelValue(value, ['Sch. Code', 'Sch Code', 'School Code', 'Sch.Code']);
  if (schoolCode) {
    appendNormalizedField(school, 'schoolCode', schoolCode);
    school._continuations.identity = 'schoolCode';
    return;
  }

  if (school._continuations.identity) {
    appendNormalizedField(school, school._continuations.identity, value);
  }
};

const parseGeographyCell = (school, text) => {
  const value = cleanCell(text);
  if (!value) {
    return;
  }

  const state = extractLabelValue(value, ['State']);
  if (state) {
    appendNormalizedField(school, 'state', state);
    school._continuations.geography = 'state';
    return;
  }

  const district = extractLabelValue(value, ['District']);
  if (district) {
    appendNormalizedField(school, 'district', district);
    school._continuations.geography = 'district';
    return;
  }

  if (school._continuations.geography) {
    appendNormalizedField(school, school._continuations.geography, value);
  }
};

const parseSchoolHeadCell = (school, text) => {
  const value = cleanCell(text);
  if (!value) {
    return;
  }

  const schoolName = extractLabelValue(value, ['Name']);
  if (schoolName) {
    appendNormalizedField(school, 'name', schoolName);
    school._continuations.schoolHead = 'name';
    return;
  }

  const headName = extractLabelValue(value, ['Head/Principal Name', 'Head / Principal Name', 'Head Name', 'Principal Name']);
  if (headName) {
    appendNormalizedField(school, 'headName', headName);
    school._continuations.schoolHead = 'headName';
    return;
  }

  if (school._continuations.schoolHead) {
    appendNormalizedField(school, school._continuations.schoolHead, value);
  }
};

const parseAddressCell = (school, text) => {
  const value = cleanCell(text);
  if (!value || /^view$/i.test(value)) {
    return;
  }

  if (/^website\s*:/i.test(value)) {
    const website = extractLabelValue(value, ['Website']);
    if (website) {
      appendNormalizedField(school, 'website', website);
    }
    school._continuations.address = 'website';
    return;
  }

  const address = extractLabelValue(value, ['Address']);
  if (address) {
    appendNormalizedField(school, 'addressDetails', address);
    school._continuations.address = 'addressDetails';
    return;
  }

  if (school._continuations.address) {
    appendNormalizedField(school, school._continuations.address, value);
  }
};

const mergeLineCellsIntoSchool = (school, cells) => {
  const serialValue = cleanCell(cells.srNo || '');
  if (/^\d+$/.test(serialValue) && !school.srNo) {
    school.srNo = Number.parseInt(serialValue, 10);
  }

  if (cells.status) {
    const statusValue = cleanCell(cells.status);
    if (statusValue && !/^status$/i.test(statusValue)) {
      school.status = statusValue;
    }
  }

  parseIdentityCell(school, cells.identity || '');
  parseGeographyCell(school, cells.geography || '');
  parseSchoolHeadCell(school, cells.schoolHead || '');
  parseAddressCell(school, cells.address || '');
};

const normalizeSchoolRecord = (school) => {
  const srNo = Number.parseInt(cleanCell(school.srNo), 10);

  return {
    srNo: Number.isFinite(srNo) ? srNo : 0,
    affiliationNo: cleanCell(school.affiliationNo),
    schoolCode: cleanCell(school.schoolCode).toUpperCase(),
    state: cleanCell(school.state),
    district: cleanCell(school.district),
    status: cleanCell(school.status),
    name: cleanCell(school.name),
    headName: cleanCell(school.headName),
    website: cleanCell(school.website),
    addressDetails: cleanCell(school.addressDetails),
  };
};

const fallbackParseFromText = (rows) => {
  const rowBuffers = [];
  let currentRow = '';

  rows.forEach((row) => {
    const line = cleanCell(row.text);
    if (shouldSkipLine(line)) {
      return;
    }

    if (ROW_START_PATTERN.test(line)) {
      if (currentRow) {
        rowBuffers.push(currentRow);
      }
      currentRow = line;
      return;
    }

    if (currentRow) {
      currentRow = `${currentRow} ${line}`;
    }
  });

  if (currentRow) {
    rowBuffers.push(currentRow);
  }

  return rowBuffers.map((buffer) => {
    const match = buffer.match(/^(\d+)\s+([A-Za-z0-9/-]{2,})\s+([A-Za-z0-9/-]{2,})\s*(.*)$/);
    if (!match) {
      return null;
    }

    const parts = String(match[4] || '').split(/\s{2,}/).map(cleanCell).filter(Boolean);
    if (parts.length < 4) {
      return null;
    }

    const [state = '', district = '', status = '', name = '', headName = '', ...addressParts] = parts;
    return normalizeSchoolRecord({
      srNo: match[1],
      affiliationNo: match[2],
      schoolCode: match[3],
      state,
      district,
      status,
      name,
      headName,
      addressDetails: addressParts.join(' '),
    });
  }).filter(Boolean);
};

const extractBlockValue = (block, startPattern, endPattern) => {
  const match = block.match(new RegExp(`${startPattern}\\s*:?\\s*([\\s\\S]*?)${endPattern}`, 'i'));
  return cleanCell(match?.[1] || '');
};

const parseSchoolsFromLabeledText = (rawText) => {
  const normalizedText = cleanCell(
    String(rawText || '')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/S\s*No\s+Aff\.?\s*No\s*&\s*School\s*Code\s+State\s*&\s*District\s+Status\s+School\s*&\s*Head\s*Name\s+Address\s+Details/ig, ' ')
      .replace(/\bView\b/ig, ' View ')
  );

  const starts = [];
  const recordStartRegex = /(?:^|\s)(\d+)\s+Aff\.?\s*No\.?\s*:/ig;
  let startMatch = recordStartRegex.exec(normalizedText);
  while (startMatch) {
    starts.push({
      srNo: Number.parseInt(startMatch[1], 10),
      index: startMatch.index + startMatch[0].search(/\d/),
    });
    startMatch = recordStartRegex.exec(normalizedText);
  }

  if (starts.length === 0) {
    return { schools: [], errors: [] };
  }

  const schools = [];
  const errors = [];

  starts.forEach((start, index) => {
    const nextStartIndex = starts[index + 1]?.index ?? normalizedText.length;
    const block = cleanCell(normalizedText.slice(start.index, nextStartIndex));

    const school = normalizeSchoolRecord({
      srNo: start.srNo,
      affiliationNo: extractBlockValue(block, 'Aff\\.?\\s*No\\.?', '(?=\\s+Sch\\.?\\s*Code\\s*:|$)'),
      schoolCode: extractBlockValue(block, 'Sch\\.?\\s*Code', '(?=\\s+State\\s*:|$)'),
      state: extractBlockValue(block, 'State', '(?=\\s+District\\s*:|$)'),
      district: extractBlockValue(block, 'District', '(?=\\s+(?:Senior|Higher|Secondary|Middle|Primary|Name\\s*:)|$)'),
      status: extractBlockValue(block, 'District\\s*:[\\s\\S]*?(?:District\\s*:\\s*[^:]+)?', '(?=\\s+Name\\s*:|$)'),
      name: extractBlockValue(block, 'Name', '(?=\\s+Head\\s*\\/?\\s*Principal\\s*Name\\s*:|$)'),
      headName: extractBlockValue(block, 'Head\\s*\\/?\\s*Principal\\s*Name', '(?=\\s+Address\\s*:|$)'),
      addressDetails: extractBlockValue(block, 'Address', '(?=\\s+Website\\s*:|\\s+View\\b|$)'),
      website: extractBlockValue(block, 'Website', '(?=\\s+View\\b|$)'),
    });

    if (!school.status) {
      const statusMatch = block.match(/District\s*:\s*.*?\s+((?:Senior|Higher|Secondary|Middle|Primary)[\s\S]*?)(?=\s+Name\s*:|$)/i);
      school.status = cleanCell(statusMatch?.[1] || '');
    }

    if (!school.schoolCode || !school.name) {
      errors.push({
        row: school.srNo || index + 1,
        message: `Could not fully parse row for school code "${school.schoolCode || '-'}"`,
      });
      return;
    }

    schools.push(school);
  });

  const dedupedBySchoolCode = new Map();
  schools.forEach((school) => {
    dedupedBySchoolCode.set(school.schoolCode, school);
  });

  return {
    schools: Array.from(dedupedBySchoolCode.values()),
    errors,
  };
};

const parseSchoolDirectoryPdf = async (pdfBuffer) => {
  let parsed;
  try {
    parsed = await pdfParse(pdfBuffer, { pagerender: renderPageWithRows });
  } catch (error) {
    throw new Error(`Failed to read PDF text: ${error.message}`);
  }

  let plainParsed = null;
  try {
    plainParsed = await pdfParse(pdfBuffer);
  } catch {
    plainParsed = null;
  }

  const labeledFallback = parseSchoolsFromLabeledText(plainParsed?.text || '');

  const rows = parseStructuredRows(parsed?.text);
  const boundaries = inferColumnBoundaries(rows);
  const errors = [];
  const dedupedBySchoolCode = new Map();

  if (!rows.length) {
    return {
      schools: labeledFallback.schools,
      errors: labeledFallback.schools.length
        ? labeledFallback.errors
        : [{ row: 0, message: 'No readable text rows were extracted from the PDF.' }, ...labeledFallback.errors],
      metadata: {
        pages: plainParsed?.numpages || parsed?.numpages || 0,
        totalCharacters: String(plainParsed?.text || parsed?.text || '').length,
        rawRows: labeledFallback.schools.length,
      },
    };
  }

  if (!boundaries) {
    const rowFallbackSchools = fallbackParseFromText(rows);
    rowFallbackSchools.forEach((school, index) => {
      if (!school || !school.schoolCode || !school.name) {
        errors.push({
          row: index + 1,
          message: `Could not parse row: ${cleanCell(rows[index]?.text || '').slice(0, 180)}`,
        });
        return;
      }

      dedupedBySchoolCode.set(school.schoolCode, school);
    });

    if (!dedupedBySchoolCode.size) {
      labeledFallback.schools.forEach((school) => {
        dedupedBySchoolCode.set(school.schoolCode, school);
      });
      errors.push(...labeledFallback.errors);
    }

    if (labeledFallback.schools.length > dedupedBySchoolCode.size) {
      return {
        schools: labeledFallback.schools,
        errors: labeledFallback.errors,
        metadata: {
          pages: plainParsed?.numpages || parsed?.numpages || 0,
          totalCharacters: String(plainParsed?.text || parsed?.text || '').length,
          rawRows: labeledFallback.schools.length,
        },
      };
    }

    return {
      schools: Array.from(dedupedBySchoolCode.values()),
      errors,
      metadata: {
        pages: parsed?.numpages || 0,
        totalCharacters: String(parsed?.text || '').length,
        rawRows: rows.length,
      },
    };
  }

  let currentSchool = null;
  let rawRows = 0;

  const finalizeCurrentSchool = () => {
    if (!currentSchool) {
      return;
    }

    const normalized = normalizeSchoolRecord(currentSchool);
    if (!normalized.schoolCode || !normalized.name) {
      errors.push({
        row: rawRows,
        message: `Could not fully parse row: ${cleanCell(currentSchool.name || currentSchool.schoolCode || '').slice(0, 180)}`,
      });
      currentSchool = null;
      return;
    }

    dedupedBySchoolCode.set(normalized.schoolCode, normalized);
    currentSchool = null;
  };

  rows.forEach((row) => {
    const line = cleanCell(row.text);
    if (shouldSkipLine(line)) {
      return;
    }

    const cells = extractLineCells(row.items, boundaries);
    const serialValue = cleanCell(cells.srNo || '');

    if ((serialValue && /^\d+$/.test(serialValue)) || ROW_START_PATTERN.test(line)) {
      finalizeCurrentSchool();
      currentSchool = createEmptySchool();
      rawRows += 1;
      mergeLineCellsIntoSchool(currentSchool, cells);
      return;
    }

    if (currentSchool) {
      mergeLineCellsIntoSchool(currentSchool, cells);
    }
  });

  finalizeCurrentSchool();

  if (!dedupedBySchoolCode.size) {
    labeledFallback.schools.forEach((school) => {
      dedupedBySchoolCode.set(school.schoolCode, school);
    });
    errors.push(...labeledFallback.errors);
  }

  if (labeledFallback.schools.length > dedupedBySchoolCode.size) {
    return {
      schools: labeledFallback.schools,
      errors: labeledFallback.errors,
      metadata: {
        pages: plainParsed?.numpages || parsed?.numpages || 0,
        totalCharacters: String(plainParsed?.text || parsed?.text || '').length,
        rawRows: labeledFallback.schools.length,
      },
    };
  }

  return {
    schools: Array.from(dedupedBySchoolCode.values()),
    errors,
    metadata: {
      pages: parsed?.numpages || 0,
      totalCharacters: String(parsed?.text || '').length,
      rawRows,
    },
  };
};

module.exports = {
  parseSchoolDirectoryPdf,
};
