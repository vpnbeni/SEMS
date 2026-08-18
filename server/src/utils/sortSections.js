const SENIOR_SECONDARY_SECTION_ORDER = ['science', 'commerce', 'humanities'];

const isSeniorSecondaryClass = (className) => {
  const key = String(className || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  return /^(11th|12th|11|12|xi|xii|class11|class12)$/.test(key);
};

const sortSectionNames = (left, right, className = '') => {
  if (isSeniorSecondaryClass(className)) {
    const rank = (name) => {
      const index = SENIOR_SECONDARY_SECTION_ORDER.indexOf(String(name || '').trim().toLowerCase());
      return index === -1 ? 1000 : index;
    };
    const diff = rank(left) - rank(right);
    if (diff !== 0) return diff;
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
};

module.exports = { isSeniorSecondaryClass, sortSectionNames };
