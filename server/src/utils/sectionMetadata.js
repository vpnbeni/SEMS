const SECTION_CATALOG = Object.freeze([
  {
    displayName: 'Science',
    abbreviations: ['Sci', 'Sci.', 'SCI', 'SCI.', 'Science'],
  },
  {
    displayName: 'Commerce',
    abbreviations: ['Comm', 'Comm.', 'COMM', 'COMM.', 'Commerce'],
  },
  {
    displayName: 'Humanities',
    abbreviations: ['Hum', 'Hum.', 'HUM', 'HUM.', 'Arts', 'Humanities'],
  },
]);

const normalizeSectionKey = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
);

const findMetadataForSection = (sectionName) => {
  const key = normalizeSectionKey(sectionName);
  if (!key) return null;

  return SECTION_CATALOG.find((entry) => {
    if (normalizeSectionKey(entry.displayName) === key) return true;
    return entry.abbreviations.some((item) => normalizeSectionKey(item) === key);
  }) || null;
};

const getCanonicalSectionName = (sectionName) => {
  const trimmed = String(sectionName || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const metadata = findMetadataForSection(trimmed);
  return metadata ? metadata.displayName : trimmed;
};

const getSectionDisplayName = (sectionName) => getCanonicalSectionName(sectionName);

const getSectionMatchKeys = (sectionName) => {
  const keys = new Set();
  const trimmed = String(sectionName || '').trim();
  if (!trimmed) return keys;

  keys.add(normalizeSectionKey(trimmed));

  const metadata = findMetadataForSection(trimmed);
  if (metadata) {
    keys.add(normalizeSectionKey(metadata.displayName));
    metadata.abbreviations.forEach((item) => keys.add(normalizeSectionKey(item)));
  }

  return keys;
};

const resolveSectionAgainstAllowed = (input, allowedSections = []) => {
  const normalizedInput = String(input || '').trim().replace(/\s+/g, ' ');
  const inputKey = normalizeSectionKey(normalizedInput);

  if (!inputKey) {
    return { section: '', error: 'Section is required.' };
  }

  const uniqueAllowed = [];
  const seen = new Set();
  allowedSections.forEach((sectionName) => {
    const canonical = getCanonicalSectionName(sectionName);
    const key = normalizeSectionKey(canonical);
    if (!key || seen.has(key)) return;
    seen.add(key);
    uniqueAllowed.push(canonical);
  });

  if (uniqueAllowed.length === 0) {
    return { section: getCanonicalSectionName(normalizedInput), error: null };
  }

  for (const allowedSection of uniqueAllowed) {
    const matrixSection = allowedSections.find((item) => (
      normalizeSectionKey(getCanonicalSectionName(item)) === normalizeSectionKey(allowedSection)
    )) || allowedSection;

    const matchKeys = getSectionMatchKeys(matrixSection);
    if (matchKeys.has(inputKey)) {
      return { section: allowedSection, error: null };
    }
  }

  return {
    section: normalizedInput,
    error: `Section "${normalizedInput}" is not configured for this class in Class Section Matrix.`,
  };
};

const normalizeAllowedSections = (sections = []) => {
  const canonical = [];
  const seen = new Set();

  sections.forEach((sectionName) => {
    const value = getCanonicalSectionName(sectionName);
    const key = normalizeSectionKey(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    canonical.push(value);
  });

  return canonical;
};

module.exports = {
  SECTION_CATALOG,
  normalizeSectionKey,
  findMetadataForSection,
  getCanonicalSectionName,
  getSectionDisplayName,
  getSectionMatchKeys,
  resolveSectionAgainstAllowed,
  normalizeAllowedSections,
};
