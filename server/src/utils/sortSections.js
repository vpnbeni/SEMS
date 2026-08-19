const SENIOR_SECONDARY_SECTION_ORDER = ['science', 'commerce', 'humanities'];
const JUNIOR_SECTION_ORDER = ['rose', 'lily', 'lotus', 'tulip'];

const isSeniorSecondaryClass = (className) => {
  const key = String(className || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  return /^(11th|12th|11|12|xi|xii|class11|class12)$/.test(key);
};

const sortSectionNames = (left, right, className = '') => {
  const ordered = isSeniorSecondaryClass(className)
    ? SENIOR_SECONDARY_SECTION_ORDER
    : JUNIOR_SECTION_ORDER;
  const rank = (name) => {
    const index = ordered.indexOf(String(name || '').trim().toLowerCase());
    return index === -1 ? 1000 : index;
  };
  const diff = rank(left) - rank(right);
  if (diff !== 0) return diff;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
};

const CLASS_ORDER = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const sortClassNames = (left, right) => {
  const rank = (name) => {
    const index = CLASS_ORDER.indexOf(String(name || '').trim().toLowerCase());
    return index === -1 ? 1000 : index;
  };
  const diff = rank(left) - rank(right);
  if (diff !== 0) return diff;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
};

module.exports = { isSeniorSecondaryClass, sortSectionNames, sortClassNames };
