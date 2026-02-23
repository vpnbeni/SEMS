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

const sanitizeTextForParsing = (value) => String(value || '')
  .replace(/\r/g, '\n')
  .replace(/[^\x20-\x7E\n]/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n');

/**
 * Parse page range string (e.g. "4-5", "77", "6-32") into startPage and endPage
 */
function parsePageRange(pageStr) {
  if (!pageStr || typeof pageStr !== 'string') return { startPage: null, endPage: null };
  const trimmed = pageStr.trim();
  const rangeMatch = trimmed.match(/^(\d{1,3})-(\d{1,3})$/);
  if (rangeMatch) {
    return { startPage: parseInt(rangeMatch[1], 10), endPage: parseInt(rangeMatch[2], 10) };
  }
  const singleMatch = trimmed.match(/^(\d{1,3})$/);
  if (singleMatch) {
    const p = parseInt(singleMatch[1], 10);
    return { startPage: p, endPage: p };
  }
  return { startPage: null, endPage: null };
}

const extractStructuredFromText = (rawText) => {
  const text = sanitizeTextForParsing(rawText);
  const chapters = [];
  const appendices = [];
  const seenChapterNumbers = new Set();
  const seenAppendixLetters = new Set();

  const upper = text.toUpperCase();
  const contentsIdx = upper.indexOf('CONTENTS');
  const appendicesIdx = upper.indexOf('APPENDICES');
  const chapterSegmentRaw = contentsIdx >= 0
    ? text.slice(contentsIdx, appendicesIdx > contentsIdx ? appendicesIdx : Math.min(text.length, contentsIdx + 25000))
    : text.slice(0, Math.min(text.length, 25000));
  const appendixSegmentRaw = appendicesIdx >= 0
    ? text.slice(appendicesIdx, Math.min(text.length, appendicesIdx + 25000))
    : text.slice(0, Math.min(text.length, 25000));

  // CBSE TOC format: "1. TITLE" followed by "4-5" or "77" (page at end of line)
  // Title can be long, multi-word; page may have dots/ellipsis before it
  const chapterWithPageRegex = /(\d{1,2})\.\s+(.+?)\s+(\d{1,3}(?:-\d{1,3})?)\s*$/gm;
  let match;
  const lines = chapterSegmentRaw.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^(\d{1,2})\.\s+(.+?)\s+(?:Pages?:\s*)?(\d{1,3}(?:-\d{1,3})?)\s*$/);
    if (m) {
      const number = m[1].trim();
      let title = m[2].trim().replace(/\s*\.{2,}\s*$/, '').replace(/\s+/g, ' ');
      const pageStr = m[3].trim();
      if (!number || !title || title.toUpperCase().includes('APPENDICES')) continue;
      if (seenChapterNumbers.has(number)) continue;
      seenChapterNumbers.add(number);
      const { startPage } = parsePageRange(pageStr);
      chapters.push({
        number,
        title,
        description: '',
        fullContent: '',
        formattedContent: [],
        startPage: startPage || undefined,
      });
    }
  }

  // Fallback: inline regex for concatenated text (no newlines)
  const chapterSegment = chapterSegmentRaw.replace(/\s+/g, ' ');
  const chapterInlineRegex = /(\d{1,2})\.\s+([A-Z][A-Z0-9 ,()'\/&\-\.;]{5,200}?)\s+(\d{1,3}(?:-\d{1,3})?)(?=\s+\d{1,2}\.|\s*APPENDICES|$)/g;
  while ((match = chapterInlineRegex.exec(chapterSegment)) !== null) {
    const number = String(match[1] || '').trim();
    const title = String(match[2] || '').trim().replace(/\s+/g, ' ');
    const pageStr = String(match[3] || '').trim();
    if (!number || !title || title.includes('APPENDICES')) continue;
    if (seenChapterNumbers.has(number)) continue;
    seenChapterNumbers.add(number);
    const { startPage } = parsePageRange(pageStr);
    chapters.push({
      number,
      title,
      description: '',
      fullContent: '',
      formattedContent: [],
      startPage: startPage || undefined,
    });
  }

  // APPENDICES: "A TITLE" followed by "78-79" or "91"
  const appendixLines = appendixSegmentRaw.split(/\r?\n/);
  for (const line of appendixLines) {
    const m = line.match(/^([A-Z])\s+(.+?)\s+(?:Pages?:\s*)?(\d{1,3}(?:-\d{1,3})?)\s*$/);
    if (m) {
      const letter = m[1].trim();
      let title = m[2].trim().replace(/\s*\.{2,}\s*$/, '').replace(/\s+/g, ' ');
      const pageStr = m[3].trim();
      if (!letter || !title) continue;
      if (seenAppendixLetters.has(letter)) continue;
      seenAppendixLetters.add(letter);
      const { startPage } = parsePageRange(pageStr);
      appendices.push({
        letter,
        title,
        subtitle: '',
        fullContent: '',
        formattedContent: [],
        startPage: startPage || undefined,
      });
    }
  }

  const appendixSegment = appendixSegmentRaw.replace(/\s+/g, ' ');
  const appendixInlineRegex = /\b([A-Z])\s+([A-Z][A-Z0-9 ,()'\/&\-\.;]{5,200}?)\s+(\d{1,3}(?:-\d{1,3})?)(?=\s+[A-Z]\s+|$)/g;
  while ((match = appendixInlineRegex.exec(appendixSegment)) !== null) {
    const letter = String(match[1] || '').trim();
    const title = String(match[2] || '').trim().replace(/\s+/g, ' ');
    const pageStr = String(match[3] || '').trim();
    if (!letter || !title) continue;
    if (seenAppendixLetters.has(letter)) continue;
    seenAppendixLetters.add(letter);
    const { startPage } = parsePageRange(pageStr);
    appendices.push({
      letter,
      title,
      subtitle: '',
      fullContent: '',
      formattedContent: [],
      startPage: startPage || undefined,
    });
  }

  return {
    chapters: chapters.slice(0, 30),
    appendices: appendices.slice(0, 30),
  };
};

/**
 * Parse guidelines PDF and extract structured content
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} Parsed guidelines structure
 */
async function parseGuidelinesPdf(pdfBuffer) {
  let data = null;
  let text = '';
  let fallbackMode = false;
  try {
    data = await pdf(pdfBuffer);
    text = String(data?.text || '');
  } catch (error) {
    // Fallback for malformed-but-viewable PDFs: attempt TOC-style extraction from binary text.
    fallbackMode = true;
    text = sanitizeTextForParsing(pdfBuffer.toString('latin1'));
  }

  // Extract chapters with content (full parser path)
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

  // Extract appendices with content (full parser path)
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

  // If strict parsing yielded no useful structure, derive from TOC-like lines.
  if (chapters.length === 0 || appendices.length === 0) {
    const fallback = extractStructuredFromText(text);
    if (chapters.length === 0 && fallback.chapters.length > 0) {
      chapters.push(...fallback.chapters);
    }
    if (appendices.length === 0 && fallback.appendices.length > 0) {
      appendices.push(...fallback.appendices);
    }
  }

  return {
    metadata: {
      pages: Number(data?.numpages || 0),
      totalCharacters: text.length,
      fallbackMode,
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
