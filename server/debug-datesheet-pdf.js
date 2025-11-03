const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Helper: map month names to numbers
const MONTHS = {
  JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5,
  JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11,
}

// Parse a line like: "10:30 AM - 01:30 PM 041 MATHEMATICS STANDARD"
function parseTimeAndSubject(line) {
  const timeRegex = /(\d{1,2}:\d{2})\s*(AM|PM)\s*[\-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)\s+(\d{2,4})\s+([A-Z0-9 &/\-]+)$/i
  const m = line.match(timeRegex)
  if (!m) return null
  return {
    startTime: `${m[1].toUpperCase()} ${m[2].toUpperCase()}`.trim(),
    endTime: `${m[3].toUpperCase()} ${m[4].toUpperCase()}`.trim(),
    subjectCode: m[5],
    subjectName: m[6].trim(),
  }
}

// Parse a header line like: "TUESDAY 17TH FEBRUARY, 2026"
function parseDateHeader(line) {
  const headerRegex = /(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+(\d{1,2})(?:ST|ND|RD|TH|TM|™)?\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[,\s]+(\d{4})/i
  const m = line.match(headerRegex)
  if (!m) return null
  const day = parseInt(m[2], 10)
  const month = MONTHS[m[3].toUpperCase()]
  const year = parseInt(m[4], 10)
  return { dateISO: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10), dayName: m[1].toUpperCase() }
}

async function debugDatesheetPDF(pdfPath) {
  try {
    console.log('Reading PDF from:', pdfPath);
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found!');
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    console.log('File size:', buffer.length, 'bytes');

    const data = await pdfParse(buffer);
    const text = data.text;

    console.log('\n=== PDF PARSING RESULTS ===');
    console.log('Total pages:', data.numpages);
    console.log('Text length:', text.length);
    console.log('Has text:', text.trim().length > 0);

    console.log('\n=== FIRST 1000 CHARACTERS ===');
    console.log(text.substring(0, 1000));

    // Normalize text
    const normalize = (s) => {
      let out = s
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[|]/g, ' ')
        .replace(/O/g, '0')
        .replace(/I/g, '1')
        .toUpperCase()
      out = out.replace(/A\s*M/g, 'AM').replace(/P\s*M/g, 'PM')
      out = out.replace(/(\d{1,2})\s*:\s*(\d{2})/g, '$1:$2')
      out = out.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2')
      out = out.replace(/\s+/g, ' ').trim()
      return out
    }

    const rawLines = text.split(/\r?\n/) || []
    const lines = rawLines.map(normalize).filter(Boolean)

    console.log('\n=== LINE ANALYSIS ===');
    console.log('Total raw lines:', rawLines.length);
    console.log('Total normalized lines:', lines.length);

    console.log('\n=== FIRST 30 NORMALIZED LINES ===');
    lines.slice(0, 30).forEach((line, idx) => {
      console.log(`${idx + 1}: ${line}`);
    });

    // Try to parse
    const entries = [];
    let currentDate = null;
    let currentDayName = null;
    let currentStartTime = null;
    let currentEndTime = null;
    let currentCode = null;

    const timeOnlyRegex = /(\d{1,2}:\d{2})\s*(AM|PM)\s*[\-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)/
    const codeNameRegex = /^([0-9]{2,4})\s+([A-Z0-9 .,&/\-]+)$/
    const codeOnlyRegex = /^([0-9]{2,4})$/
    const nameOnlyRegex = /^([A-Z][A-Z0-9 .,&/\-]{3,})$/

    console.log('\n=== PARSING ATTEMPTS ===');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const header = parseDateHeader(line);
      if (header) {
        console.log(`Line ${i + 1}: Found date header - ${header.dateISO} (${header.dayName})`);
        currentDate = header.dateISO;
        currentDayName = header.dayName;
        currentStartTime = null;
        currentEndTime = null;
        continue;
      }

      const both = parseTimeAndSubject(line);
      if (both && currentDate) {
        console.log(`Line ${i + 1}: Found complete entry - ${both.startTime} to ${both.endTime}, ${both.subjectCode} ${both.subjectName}`);
        entries.push({
          date: currentDate,
          day: currentDayName,
          startTime: both.startTime,
          endTime: both.endTime,
          subjectCode: both.subjectCode,
          subjectName: both.subjectName,
        });
        continue;
      }

      const t = line.match(timeOnlyRegex);
      if (t) {
        currentStartTime = `${t[1]} ${t[2]}`;
        currentEndTime = `${t[3]} ${t[4]}`;
        console.log(`Line ${i + 1}: Found time - ${currentStartTime} to ${currentEndTime}`);
        continue;
      }

      const cn = line.match(codeNameRegex);
      if (cn && currentDate && currentStartTime && currentEndTime) {
        console.log(`Line ${i + 1}: Found code+name - ${cn[1]} ${cn[2]}`);
        entries.push({
          date: currentDate,
          day: currentDayName,
          startTime: currentStartTime,
          endTime: currentEndTime,
          subjectCode: cn[1],
          subjectName: cn[2].trim(),
        });
        continue;
      }

      const co = line.match(codeOnlyRegex);
      if (co) {
        currentCode = co[1];
        console.log(`Line ${i + 1}: Found code only - ${currentCode}`);
        continue;
      }

      const no = line.match(nameOnlyRegex);
      if (no && currentCode && currentDate && currentStartTime && currentEndTime) {
        console.log(`Line ${i + 1}: Found name only - ${no[1]}`);
        entries.push({
          date: currentDate,
          day: currentDayName,
          startTime: currentStartTime,
          endTime: currentEndTime,
          subjectCode: currentCode,
          subjectName: no[1].trim(),
        });
        currentCode = null;
        continue;
      }
    }

    console.log('\n=== PARSING RESULTS ===');
    console.log('Total entries found:', entries.length);
    
    if (entries.length > 0) {
      console.log('\n=== FIRST 5 ENTRIES ===');
      entries.slice(0, 5).forEach((entry, idx) => {
        console.log(`${idx + 1}. ${entry.date} (${entry.day}) ${entry.startTime}-${entry.endTime}: ${entry.subjectCode} ${entry.subjectName}`);
      });
    } else {
      console.log('\nNo entries found. Check the PDF format and parsing logic.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

// Get PDF path from command line or use default
const pdfPath = process.argv[2] || path.join(__dirname, 'datesheet.pdf');
debugDatesheetPDF(pdfPath);
