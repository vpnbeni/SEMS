const pdf = require('pdf-parse');

/**
 * Format content with structure (headings, numbered items, bullets, tables, paragraphs)
 * @param {string} content - Raw text content
 * @returns {Array} Formatted content array
 */
function formatContent(content) {
  const lines = content.split('\n');
  const formatted = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      continue;
    }

    // Detect headings (all caps or numbered headings)
    if (line === line.toUpperCase() && line.length > 5 && line.length < 100 && !line.match(/^\d/)) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'heading', text: line });
    }
    // Detect numbered items (1., 2., etc.)
    else if (line.match(/^\d+\.\s+/)) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'numbered', text: line });
    }
    // Detect bullet points
    else if (line.match(/^[•\-\*]\s+/) || line.match(/^[a-z]\)\s+/)) {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'bullet', text: line });
    }
    // Detect table-like content (multiple columns separated by spaces)
    else if (line.match(/\s{3,}/)) {
      inTable = true;
      const columns = line.split(/\s{3,}/).filter(col => col.trim());
      if (columns.length > 1) {
        tableRows.push(columns);
      }
    }
    // Regular paragraph
    else {
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      formatted.push({ type: 'paragraph', text: line });
    }
  }

  // Add any remaining table
  if (inTable && tableRows.length > 0) {
    formatted.push({ type: 'table', rows: tableRows });
  }

  return formatted;
}

/**
 * Parse guidelines PDF and extract structured content
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} Parsed guidelines structure
 */
async function parseGuidelinesPdf(pdfBuffer) {
  const data = await pdf(pdfBuffer);
  const text = data.text;

  // Extract chapters with content
  const chapterRegex = /(?:CHAPTER|Chapter)\s+(\d+|[IVX]+)[:\s]+([^\n]+)/gi;
  const chapters = [];
  const chapterMatches = [];
  let match;

  while ((match = chapterRegex.exec(text)) !== null) {
    chapterMatches.push({
      number: match[1],
      title: match[2].trim(),
      index: match.index,
    });
  }

  chapterMatches.forEach((chapterMatch, index) => {
    const { number, title } = chapterMatch;
    const chapterStart = chapterMatch.index;

    let chapterEnd = text.length;
    if (index < chapterMatches.length - 1) {
      chapterEnd = chapterMatches[index + 1].index;
    } else {
      const appendixMatch = text.substring(chapterStart).search(/APPENDIX-[A-Z]/);
      if (appendixMatch > 0) {
        chapterEnd = chapterStart + appendixMatch;
      }
    }

    const fullContent = text.substring(chapterStart, chapterEnd).trim();
    const lines = fullContent.split('\n').filter(line => line.trim().length > 10);
    const description = lines.slice(1, 3).join(' ').substring(0, 200);
    const contentLines = lines.slice(1);
    const rawContent = contentLines.join('\n').trim();
    const formattedContent = formatContent(rawContent);

    chapters.push({
      number,
      title,
      description: description.trim(),
      fullContent: rawContent.substring(0, 8000),
      formattedContent,
    });
  });

  // Extract appendices with content
  const appendixRegex = /APPENDIX-([A-Z])\n([^\n]+)/gi;
  const appendices = [];
  const appendixMatches = [];

  while ((match = appendixRegex.exec(text)) !== null) {
    appendixMatches.push({
      letter: match[1],
      title: match[2].trim(),
      index: match.index,
    });
  }

  appendixMatches.forEach((appendixMatch, index) => {
    const { letter, title } = appendixMatch;
    const appendixStart = appendixMatch.index;

    const nextAppendixIndex = index < appendixMatches.length - 1
      ? appendixMatches[index + 1].index
      : text.length;

    const fullContent = text.substring(appendixStart, nextAppendixIndex).trim();
    const lines = fullContent.split('\n').filter(line => line.trim().length > 10);
    const subtitle = lines.slice(1, 3).join(' ').substring(0, 200);
    const contentLines = lines.slice(1);
    const rawContent = contentLines.join('\n').trim();
    const formattedContent = formatContent(rawContent);

    appendices.push({
      letter,
      title,
      subtitle: subtitle.trim(),
      fullContent: rawContent.substring(0, 8000),
      formattedContent,
    });
  });

  // Extract numbered guidelines
  const guidelineRegex = /^(\d+)\.\s+([^\n]{10,200})/gm;
  const guidelines = [];

  while ((match = guidelineRegex.exec(text)) !== null) {
    guidelines.push({
      number: match[1],
      text: match[2].trim(),
    });
  }

  // Extract major headings
  const headingRegex = /^([A-Z][A-Z\s]{10,80})$/gm;
  const headings = [];

  while ((match = headingRegex.exec(text)) !== null) {
    headings.push(match[1].trim());
  }

  return {
    metadata: {
      pages: data.numpages,
      totalCharacters: text.length,
    },
    structure: {
      chapters: chapters.slice(0, 20),
      appendices,
      guidelines: guidelines.slice(0, 50),
      headings: headings.slice(0, 30),
    },
    fullText: text,
  };
}

module.exports = {
  parseGuidelinesPdf,
  formatContent,
};
