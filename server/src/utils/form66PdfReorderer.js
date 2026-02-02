const { splitIntoPages } = require('./form66TxtToPdf');

/**
 * Parse a date string in DD.MM.YYYY format to a Date object
 * @param {string} dateStr - Date string like "15.02.2025"
 * @returns {Date} - Parsed Date object
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('.');
  if (parts.length !== 3) return new Date(0);
  // Format: DD.MM.YYYY
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Reorder pages by date chronologically
 * @param {Array<{content: string, date: string, subjectCode: string, subject: string, pageIndex: number}>} pages
 * @returns {Array<{content: string, date: string, subjectCode: string, subject: string, pageIndex: number}>}
 */
function reorderPagesByDate(pages) {
  console.log('🔄 Reordering pages by date...');

  // Sort pages by date (earliest first), then by subject code
  const sortedPages = [...pages].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);

    // Compare dates first
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }

    // If same date, sort by subject code
    return (a.subjectCode || '').localeCompare(b.subjectCode || '');
  });

  console.log('📋 Reordered page sequence:');
  sortedPages.forEach((page, idx) => {
    console.log(`  ${idx + 1}. Date: ${page.date}, Subject: ${page.subjectCode} ${page.subject}`);
  });

  return sortedPages;
}

/**
 * Get unique dates from pages in chronological order
 * @param {Array<{date: string}>} pages
 * @returns {string[]} - Array of unique dates
 */
function getUniqueDates(pages) {
  const dates = [...new Set(pages.map(p => p.date).filter(Boolean))];
  return dates.sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());
}

/**
 * Analyze pages and return summary
 * @param {Array<{content: string, date: string, subjectCode: string, subject: string, pageIndex: number}>} pages
 * @returns {Object} - Summary info
 */
function analyzePages(pages) {
  const dates = getUniqueDates(pages);
  const subjects = [...new Set(pages.map(p => `${p.subjectCode}-${p.subject}`).filter(s => s !== '-'))];

  return {
    totalPages: pages.length,
    uniqueDates: dates.length,
    dates: dates,
    uniqueSubjects: subjects.length,
    subjects: subjects
  };
}

/**
 * Process TXT content and reorder pages by date
 * @param {string} txtContent - Original TXT content
 * @returns {Object} - { reorderedContent: string, summary: Object }
 */
function processAndReorderContent(txtContent) {
  // Split into pages and extract info
  const pages = splitIntoPages(txtContent);

  console.log(`📄 Found ${pages.length} pages in Form 66`);

  // Analyze before reordering
  const summary = analyzePages(pages);
  console.log(`📊 Summary: ${summary.uniqueDates} dates, ${summary.uniqueSubjects} subjects`);

  // Reorder pages by date
  const reorderedPages = reorderPagesByDate(pages);

  // Reconstruct content with reordered pages
  const reorderedContent = reorderedPages.map(p => p.content).join('\f');

  return {
    reorderedContent,
    summary,
    originalOrder: pages.map(p => ({ date: p.date, subjectCode: p.subjectCode, subject: p.subject })),
    newOrder: reorderedPages.map(p => ({ date: p.date, subjectCode: p.subjectCode, subject: p.subject }))
  };
}

module.exports = {
  parseDate,
  reorderPagesByDate,
  getUniqueDates,
  analyzePages,
  processAndReorderContent
};
