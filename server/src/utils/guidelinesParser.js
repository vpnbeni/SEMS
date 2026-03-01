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

  // --- Locate TOC markers ---
  // CBSE PDFs often produce concatenated markers: "CHAPTERSPAGE", "APPENDICESPAGE"
  // Also try standard markers: "CONTENTS", "CHAPTERS", "APPENDICES"
  const chaptersPageIdx = upper.indexOf('CHAPTERSPAGE');
  const appendicesPageIdx = upper.indexOf('APPENDICESPAGE');
  const contentsIdx = upper.indexOf('CONTENTS');
  const appendicesIdx = upper.indexOf('APPENDICES');

  // Determine chapter segment start
  let chapterStart = -1;
  if (chaptersPageIdx >= 0) chapterStart = chaptersPageIdx;
  else if (contentsIdx >= 0) chapterStart = contentsIdx;

  // Determine appendix segment start
  let appendixStart = -1;
  if (appendicesPageIdx >= 0) appendixStart = appendicesPageIdx;
  else if (appendicesIdx >= 0) appendixStart = appendicesIdx;

  const chapterSegmentRaw = chapterStart >= 0
    ? text.slice(chapterStart, appendixStart > chapterStart ? appendixStart : Math.min(text.length, chapterStart + 25000))
    : '';
  // Limit appendix segment to TOC area: stop at the first body content marker
  // (a line that is just a small number like "1" followed by an all-caps heading,
  // which signals the start of Chapter 1 body content after the TOC)
  let appendixEnd = appendixStart >= 0 ? Math.min(text.length, appendixStart + 25000) : 0;
  if (appendixStart >= 0) {
    const afterAppendix = text.slice(appendixStart);
    // Look for body content start: standalone small number + heading pattern
    // e.g. "\n1\nBACKGROUND" or "\n\n1\nBACKGROUND"
    const bodyStartMatch = afterAppendix.match(/\n\s*\n\s*(\d{1,2})\s*\n\s*[A-Z]{3,}/);
    if (bodyStartMatch) {
      appendixEnd = appendixStart + bodyStartMatch.index;
    }
  }
  const appendixSegmentRaw = appendixStart >= 0
    ? text.slice(appendixStart, appendixEnd)
    : '';

  // ===================================================================
  // CHAPTER EXTRACTION
  // ===================================================================
  // CBSE PDFs produce concatenated TOC lines where chapter number, title,
  // and page number run together without spaces. Examples from pdf-parse:
  //   "01BACKGROUND01"
  //   "03ISSUE OF ANSWER BOOKS AND THEIR CUSTODY26"
  //   Multi-line: "02\nNORMS FOR APPOINTMENT...\n03"
  // Strategy: collapse to single line, then use regex that expects
  //   <2-digit-num><UPPERCASE TITLE><page-number-or-range>
  // ===================================================================

  // First, try line-by-line with dot separator (standard TOC: "1. TITLE  4-5")
  const chapterLines = chapterSegmentRaw.split(/\r?\n/);
  for (const line of chapterLines) {
    const m = line.match(/^(\d{1,2})\.\s+(.+?)\s+(?:Pages?:\s*)?(\d{1,3}(?:-\d{1,3})?)\s*$/);
    if (m) {
      const number = m[1].trim();
      const title = m[2].trim().replace(/\s*\.{2,}\s*$/, '').replace(/\s+/g, ' ');
      const pageStr = m[3].trim();
      if (!number || !title || title.toUpperCase().includes('APPENDICES')) continue;
      if (seenChapterNumbers.has(number)) continue;
      seenChapterNumbers.add(number);
      const { startPage } = parsePageRange(pageStr);
      chapters.push({ number, title, description: '', fullContent: '', formattedContent: [], startPage: startPage || undefined });
    }
  }

  // CBSE concatenated format: collapse multi-line entries then parse
  // e.g. "01BACKGROUND01" or "02 NORMS FOR APPOINTMENT... 03"
  if (chapters.length === 0 && chapterSegmentRaw.length > 0) {
    // Collapse the chapter segment: join continuation lines onto the previous line.
    // A NEW chapter entry starts with a 2-digit number followed by letter(s)
    // e.g. "01BACKGROUND01", "03ISSUE OF...", "05RULES..."
    // A STANDALONE number like "03", "30", "36" is a page number for the previous entry.
    // A line starting with "02" alone (just digits, no letters) followed by title
    // lines below is also a chapter entry — the title comes on the next line.
    const rawLines = chapterSegmentRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const merged = [];
    for (const line of rawLines) {
      // Skip the header line itself
      if (/^CHAPTERS?\s*PAGE/i.test(line) || /^CONTENT/i.test(line) || /^S\.?\s*NO/i.test(line)) continue;

      // Check if this line is a new chapter entry:
      // - Starts with 2 digits AND has letters immediately after (e.g. "01BACKGROUND01")
      // - OR starts with 2 digits alone on the line (e.g. "02") — title follows on next line
      const isNewChapterWithTitle = /^\d{2}[A-Z]/.test(line);
      const isStandaloneChapterNum = /^\d{2}$/.test(line);
      // A standalone number (1-3 digits, no letters) that is NOT exactly 2 digits
      // or IS 2 digits but doesn't look like a chapter number — treat as page number
      const isPageNumber = /^\d{1,3}(?:-\d{1,3})?$/.test(line) && !isStandaloneChapterNum;

      if (isNewChapterWithTitle) {
        merged.push(line);
      } else if (isStandaloneChapterNum) {
        // Could be chapter number "02" or page number "30"
        // Heuristic: if the value as integer > total chapters expected (~20), it's a page number
        const num = parseInt(line, 10);
        if (num <= 20 && merged.length > 0) {
          // Check if previous entry already has a page number at the end
          const prev = merged[merged.length - 1];
          if (/\d{1,3}(?:-\d{1,3})?\s*$/.test(prev) && /[A-Z]/.test(prev)) {
            // Previous entry already ends with digits (has page number) — this is a new chapter
            merged.push(line);
          } else {
            // Previous entry doesn't end with a page number — this IS the page number
            merged[merged.length - 1] += ' ' + line;
          }
        } else if (merged.length > 0) {
          // Large number like "30", "58" — it's a page number for previous entry
          // But check if previous entry is already complete (has title + page)
          const prevEntry = merged[merged.length - 1];
          const prevIsComplete = /^\d{2}[A-Z].*\d{1,3}\s*$/.test(prevEntry) ||
            (/^\d{2}\s/.test(prevEntry) && /\d{1,3}\s*$/.test(prevEntry) && /[A-Z]/.test(prevEntry));
          if (!prevIsComplete) {
            merged[merged.length - 1] += ' ' + line;
          }
          // else: skip — page belongs to an un-numbered item we're ignoring
        }
      } else if (isPageNumber && merged.length > 0) {
        // Standalone page number like "30", "36-37" — append to previous entry
        // But first check: if previous entry already looks complete (starts with
        // 2-digit chapter num + title + ends with page digits), this page number
        // belongs to an un-numbered item — skip it
        const prevEntry = merged[merged.length - 1];
        const prevIsComplete = /^\d{2}[A-Z].*\d{1,3}\s*$/.test(prevEntry) ||
          (/^\d{2}\s/.test(prevEntry) && /\d{1,3}\s*$/.test(prevEntry) && /[A-Z]/.test(prevEntry));
        if (!prevIsComplete) {
          merged[merged.length - 1] += ' ' + line;
        }
        // else: skip — it's a page number for an un-numbered item we're ignoring
      } else if (merged.length > 0) {
        // Continuation title text — but only append if the previous entry is NOT
        // already a complete chapter entry (number + title + page at end).
        // "10DUTIES OF OBSERVERS56" is complete; "PERMITTED ITEMS..." is a separate
        // un-numbered item that should NOT be merged into Ch 10.
        const prevEntry = merged[merged.length - 1];
        const prevIsComplete = /^\d{2}[A-Z].*\d{1,3}\s*$/.test(prevEntry) ||
          (/^\d{2}\s/.test(prevEntry) && /\d{1,3}\s*$/.test(prevEntry) && /[A-Z]/.test(prevEntry));
        if (!prevIsComplete) {
          merged[merged.length - 1] += ' ' + line;
        }
        // else: skip un-numbered items
      } else {
        merged.push(line);
      }
    }

    for (const entry of merged) {
      // Pattern: 01BACKGROUND01  or  01 BACKGROUND 01  or  03ISSUE OF ANSWER BOOKS...26
      // The number at the start is 2 digits (01-99), title is mostly uppercase, page at end
      const m = entry.match(/^(\d{2})\s*([A-Z][A-Z\s\S]*?)\s*(\d{1,3}(?:\s*-\s*\d{1,3})?)\s*$/);
      if (m) {
        const number = String(parseInt(m[1], 10)); // "01" -> "1"
        let title = m[2].trim().replace(/\s+/g, ' ');
        const pageStr = m[3].replace(/\s/g, '').trim();
        if (!title || title.toUpperCase().includes('APPENDICES')) continue;
        // Clean trailing dots/periods from title
        title = title.replace(/\.\s*$/, '').trim();
        if (seenChapterNumbers.has(number)) continue;
        seenChapterNumbers.add(number);
        const { startPage } = parsePageRange(pageStr);
        chapters.push({ number, title, description: '', fullContent: '', formattedContent: [], startPage: startPage || undefined });
      }
    }
  }

  // Additional fallback: inline regex on collapsed text for "N. TITLE PAGE" format
  if (chapters.length === 0 && chapterSegmentRaw.length > 0) {
    const chapterSegment = chapterSegmentRaw.replace(/\s+/g, ' ');
    const chapterInlineRegex = /(\d{1,2})\.\s+([A-Z][A-Z0-9 ,()'\/&\-\.;]{5,200}?)\s+(\d{1,3}(?:-\d{1,3})?)(?=\s+\d{1,2}\.|\s*APPENDICES|$)/g;
    let match;
    while ((match = chapterInlineRegex.exec(chapterSegment)) !== null) {
      const number = String(match[1] || '').trim();
      const title = String(match[2] || '').trim().replace(/\s+/g, ' ');
      const pageStr = String(match[3] || '').trim();
      if (!number || !title || title.includes('APPENDICES')) continue;
      if (seenChapterNumbers.has(number)) continue;
      seenChapterNumbers.add(number);
      const { startPage } = parsePageRange(pageStr);
      chapters.push({ number, title, description: '', fullContent: '', formattedContent: [], startPage: startPage || undefined });
    }
  }

  // ===================================================================
  // APPENDIX EXTRACTION
  // ===================================================================
  // CBSE PDFs produce highly varied TOC lines for appendices:
  //   Standalone letter:     "A"  (title on next lines, page on another)
  //   Multi-line title:      "DUTIES AND RESPONSIBILITIES..."  then "59-60"
  //   Concatenated all:      "DINSTRUCTIONS FOR STUDENTS66-70"
  //   Concatenated no space: "HATTENDANCE SHEET75"
  //   Letter + space + title: "JBELL RINGING SCHEDULE 77"
  //   Title + page (no letter): "IMPORTANT RESPONSIBILITIES...64-65" (continuation of C)
  //   Standalone page:       "59-60", "76", "81-82"
  //
  // Strategy: Track expected next letter (A, B, C, ...) to distinguish between
  // "a new appendix entry starting with letter X" vs "a continuation title line
  // that happens to start with the same character".
  // ===================================================================

  if (appendixSegmentRaw.length > 0) {
    const appRawLines = appendixSegmentRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const appMerged = []; // Each element: { letter, parts: [line, line, ...] }
    let expectedLetter = 'A';

    const nextLetter = (ch) => String.fromCharCode(ch.charCodeAt(0) + 1);

    for (const line of appRawLines) {
      // Skip the header
      if (/^APPENDICES?\s*PAGE/i.test(line)) continue;

      // Detect if this line starts a new appendix entry for the expected letter.
      // Cases:
      //   1. Standalone expected letter: "A", "B", "C", "I", "L", "N"
      //   2. Expected letter concatenated with uppercase title (and possibly page):
      //      "DINSTRUCTIONS FOR STUDENTS66-70", "HATTENDANCE SHEET75"
      //   3. Expected letter + space + title: "JBELL RINGING SCHEDULE 77"
      const isStandaloneLetter = line === expectedLetter;
      const isLetterConcatenated = line.length > 1 && line[0] === expectedLetter && /^[A-Z]/.test(line[1]);

      if (isStandaloneLetter || isLetterConcatenated) {
        appMerged.push({ letter: expectedLetter, parts: isStandaloneLetter ? [] : [line.slice(1)] });
        expectedLetter = nextLetter(expectedLetter);
      } else if (appMerged.length > 0) {
        const current = appMerged[appMerged.length - 1];
        // Check if this is a page number (standalone digits or range like "59-60")
        const isPageNum = /^\d{1,3}(?:-\d{1,3})?$/.test(line);

        if (isPageNum) {
          // Check if previous parts already contain a page number at the end
          const lastPart = current.parts.length > 0 ? current.parts[current.parts.length - 1] : '';
          const prevHasPage = /\d{1,3}(?:-\d{1,3})\s*$/.test(lastPart) || /\d{2,3}\s*$/.test(lastPart);
          if (!prevHasPage) {
            // This is the page number for the current entry
            current.parts.push(line);
          } else {
            // Previous entry already has a page — this might be body content start
            // If it's a small number like "1" that signals chapter body, stop
            if (parseInt(line, 10) <= 20) break;
            // Otherwise it's an extra page line, append anyway
            current.parts.push(line);
          }
        } else if (/^[A-Z(]/.test(line)) {
          // Continuation title text (uppercase lines or parenthetical)
          current.parts.push(line);
        } else {
          // Unrecognized line — stop processing TOC
          break;
        }
      }

      // Safety: stop if we've gone past letter O (15 appendices)
      if (expectedLetter > 'O' && appMerged.length > 0) break;
    }

    // Now parse each merged entry to extract title and page
    for (const entry of appMerged) {
      const letter = entry.letter;
      const combined = entry.parts.join(' ').replace(/\s+/g, ' ').trim();
      if (!combined) continue;

      // Extract page number from the end of the combined string
      // Page can be: "59-60", "75", "77", etc. — possibly concatenated with title
      let title = '';
      let pageStr = '';

      // Try: title ending with space + page number
      let m = combined.match(/^(.+?)\s+(\d{1,3}(?:-\d{1,3})?)\s*$/);
      if (m) {
        title = m[1].trim();
        pageStr = m[2].trim();
      } else {
        // Try: title concatenated with page number (no space): "ATTENDANCE SHEET75"
        m = combined.match(/^(.+?)(\d{1,3}(?:-\d{1,3})?)\s*$/);
        if (m && m[1].length > 2) {
          title = m[1].trim();
          pageStr = m[2].trim();
        } else {
          // No page number found — just use the whole thing as title
          title = combined;
        }
      }

      if (!title) continue;
      title = title.replace(/\.\s*$/, '').replace(/^\.\s*/, '').trim();
      if (seenAppendixLetters.has(letter)) continue;
      seenAppendixLetters.add(letter);
      const { startPage } = parsePageRange(pageStr);
      appendices.push({ letter, title, subtitle: '', fullContent: '', formattedContent: [], startPage: startPage || undefined });
    }
  }

  // Fallback: standard line-by-line and inline regex
  if (appendices.length === 0 && appendixSegmentRaw.length > 0) {
    const appendixLines = appendixSegmentRaw.split(/\r?\n/);
    for (const line of appendixLines) {
      const m = line.match(/^([A-Z])\s+(.+?)\s+(?:Pages?:\s*)?(\d{1,3}(?:-\d{1,3})?)\s*$/);
      if (m) {
        const letter = m[1].trim();
        const title = m[2].trim().replace(/\s*\.{2,}\s*$/, '').replace(/\s+/g, ' ');
        const pageStr = m[3].trim();
        if (!letter || !title) continue;
        if (seenAppendixLetters.has(letter)) continue;
        seenAppendixLetters.add(letter);
        const { startPage } = parsePageRange(pageStr);
        appendices.push({ letter, title, subtitle: '', fullContent: '', formattedContent: [], startPage: startPage || undefined });
      }
    }

    const appendixSegment = appendixSegmentRaw.replace(/\s+/g, ' ');
    const appendixInlineRegex = /\b([A-Z])\s+([A-Z][A-Z0-9 ,()'\/&\-\.;]{5,200}?)\s+(\d{1,3}(?:-\d{1,3})?)(?=\s+[A-Z]\s+|$)/g;
    let match;
    while ((match = appendixInlineRegex.exec(appendixSegment)) !== null) {
      const letter = String(match[1] || '').trim();
      const title = String(match[2] || '').trim().replace(/\s+/g, ' ');
      const pageStr = String(match[3] || '').trim();
      if (!letter || !title) continue;
      if (seenAppendixLetters.has(letter)) continue;
      seenAppendixLetters.add(letter);
      const { startPage } = parsePageRange(pageStr);
      appendices.push({ letter, title, subtitle: '', fullContent: '', formattedContent: [], startPage: startPage || undefined });
    }
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

  // Always attempt TOC-based extraction. If the TOC fallback finds structured
  // entries with page numbers, prefer them over body-content matches which
  // tend to have messy titles and no page info.
  const fallback = extractStructuredFromText(text);

  const primaryChaptersHavePages = chapters.some(c => c.startPage);
  const primaryAppendicesHavePages = appendices.some(a => a.startPage);
  const fallbackChaptersHavePages = fallback.chapters.some(c => c.startPage);
  const fallbackAppendicesHavePages = fallback.appendices.some(a => a.startPage);

  // Prefer fallback chapters if they have page numbers and primary doesn't,
  // or if primary found none at all
  if (chapters.length === 0 || (fallbackChaptersHavePages && !primaryChaptersHavePages && fallback.chapters.length > 0)) {
    chapters.length = 0;
    chapters.push(...fallback.chapters);
  }

  // Prefer fallback appendices if they have page numbers and primary doesn't,
  // or if primary found none at all
  if (appendices.length === 0 || (fallbackAppendicesHavePages && !primaryAppendicesHavePages && fallback.appendices.length > 0)) {
    appendices.length = 0;
    appendices.push(...fallback.appendices);
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
