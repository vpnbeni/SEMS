const pdfParse = require('pdf-parse');
const fs = require('fs');

const normalizeSubjectCode = (code) =>
  String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\((?:E|H)\)$/i, '');

const normalizeSubjectClass = (classValue) => {
  const normalized = String(classValue || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (!normalized) return '';
  if (normalized === '10' || normalized === '10th') return '10th';
  if (normalized === '12' || normalized === '12th') return '12th';
  return normalized;
};

const buildSubjectKey = (code, classValue) =>
  `${normalizeSubjectCode(code)}-${normalizeSubjectClass(classValue)}`;

const readUploadedFileBuffer = (file) => {
  if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
    return fs.readFileSync(file.tempFilePath);
  }

  if (file?.data && Buffer.isBuffer(file.data) && file.data.length > 0) {
    return file.data;
  }

  throw new Error('Uploaded file is empty or unavailable');
};

const extractCandidatesFromText = (text) => {
  const candidates = [];
  const lines = text.split('\n').map(line => line.trim());

  // Roll number patterns:
  // 1) Alphanumeric with separator (e.g., "CS2021001 John Doe")
  // 2) Compact numeric CBSE line (e.g., "31194811AARTI") — 8 digits followed immediately by
  //    a letter (name starts right after). Must NOT match pure-digit lines like "184002041".
  const rollNumberPatternWithSpace = /^([A-Z]{1,5}\d{4,12})\s+(.+)$/i;
  const rollNumberPatternCompact = /^(\d{8})([A-Za-z].*)$/;
  const isRollNumberLine = (value) =>
    rollNumberPatternWithSpace.test(value) || rollNumberPatternCompact.test(value);

  // Pattern for date of birth (DD.MM.YYYY)
  const dobPattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;

  // Pattern for school line with code — SCHOOL: only, NOT CENTRE:
  // CENTRE line is the exam centre header and must not be treated as candidate school.
  const schoolPattern = /^SCHOOL\s*[:：-]\s*(\d+)\s+(.+)$/i;

  // Pattern for class/examination type (handles both full and abbreviated forms)
  const classPattern = /(?:SENIOR\s+SEC(?:ONDARY)?|SECONDARY)\s+(?:SCH|SCHOOL)\s+(?:CERT\s+)?EXAMINATION/i;

  // Track current school name, code, and class
  let currentSchoolName = '';
  let currentSchoolCode = '';
  let currentClass = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line contains class/examination information
    const classMatch = line.match(classPattern);
    if (classMatch) {
      const examType = classMatch[0].toUpperCase();
      // Check for SENIOR SEC/SECONDARY first (12th), then SECONDARY (10th)
      if (examType.includes('SENIOR')) {
        currentClass = '12th';
      } else if (examType.includes('SECONDARY')) {
        currentClass = '10th';
      }
      continue;
    }

    // Check if this line contains school/centre information
    const schoolMatch = line.match(schoolPattern);
    if (schoolMatch) {
      currentSchoolCode = schoolMatch[1].trim();
      currentSchoolName = schoolMatch[2].trim();
      continue;
    }

    // Check if line starts with a roll number
    const rollMatch = line.match(rollNumberPatternCompact) || line.match(rollNumberPatternWithSpace);
    if (rollMatch) {
      const rollNumber = rollMatch[1];
      let candidateName = rollMatch[2].trim();

      // Skip header rows or invalid entries
      if (!candidateName || candidateName.length < 2 || line.includes('Roll No')) {
        continue;
      }

      // Detect case where the PDF packs subject-codes+DOB on the roll number line with no name,
      // e.g. "18400204108608740212.06.2011" → roll=18400204, "name"=108608740212.06.2011
      // The "name" will match \d{6,30} followed by DD.MM.YYYY — it is not a real name.
      let inlineSubjectDigits = null;
      let inlineDob = null;
      const inlinePacked = candidateName.match(/^(\d{6,30})(\d{2}\.\d{2}\.\d{4})$/);
      if (inlinePacked) {
        inlineSubjectDigits = inlinePacked[1];
        inlineDob = inlinePacked[2];
        candidateName = ''; // name will be read from next line
      }

      // Extract FLC if present (single letter followed by space at start of name)
      let flc = '';
      if (!inlinePacked && candidateName.length > 2 && /^[A-Z]\s/.test(candidateName)) {
        flc = candidateName[0];
        candidateName = candidateName.substring(2).trim();
      }

      const candidate = {
        rollNumber: rollNumber,
        name: candidateName,
        flc: flc,
        schoolName: currentSchoolName,
        schoolCode: currentSchoolCode,
        class: currentClass,
        status: 'active',
        subjectCodes: []
      };

      // Parse the next lines for additional information
      let lineOffset = 1;

      // When the roll-number line itself contained packed subject codes+DOB (no name on that line),
      // the very next line is the candidate name, not the mother name.
      if (inlinePacked) {
        if (i + lineOffset < lines.length) {
          const nameFromNextLine = lines[i + lineOffset].trim();
          if (nameFromNextLine && !isRollNumberLine(nameFromNextLine)) {
            candidate.name = nameFromNextLine;
          }
          lineOffset++;
        }
      }

      // Line i+1 (or i+2 if inlinePacked): Mother Name
      if (i + lineOffset < lines.length) {
        const motherName = lines[i + lineOffset].trim();
        if (motherName && !isRollNumberLine(motherName) && motherName.length > 1) {
          candidate.motherName = motherName;
        }
        lineOffset++;
      }

      // Line i+2 (or i+3 if inlinePacked): Father Name
      if (i + lineOffset < lines.length) {
        const fatherName = lines[i + lineOffset].trim();
        if (fatherName && !isRollNumberLine(fatherName) && fatherName.length > 1) {
          candidate.fatherName = fatherName;
        }
        lineOffset++;
      }

      // Check next line - could be Sex (M/F/G) or an extra surname line
      // If it's not Sex, skip it and check the next line
      if (i + lineOffset < lines.length) {
        const nextLine = lines[i + lineOffset].trim();
        if (nextLine && /^[MFG]$/.test(nextLine)) {
          // This is Sex
          candidate.sex = nextLine;
          lineOffset++;
        } else if (nextLine && nextLine.length > 1 && nextLine.length < 30 && !/^\d/.test(nextLine)) {
          // This might be an extra surname/family name line - skip it
          lineOffset++;
          // Now check for Sex again
          if (i + lineOffset < lines.length) {
            const sex = lines[i + lineOffset].trim();
            if (sex && /^[MFG]$/.test(sex)) {
              candidate.sex = sex;
              lineOffset++;
            }
          }
        } else {
          lineOffset++;
        }
      }

      // Line i+4: Category (G/C/S/NA)
      if (i + lineOffset < lines.length) {
        const category = lines[i + lineOffset].trim();
        if (category && /^[GCS]$/.test(category)) {
          candidate.category = category;
        } else if (category === 'NA') {
          candidate.category = '';
        }
        lineOffset++;
      }

      // Line i+5: PwD (NA or code)
      if (i + lineOffset < lines.length) {
        const pwd = lines[i + lineOffset].trim();
        if (pwd && pwd !== 'NA' && pwd.length <= 5) {
          candidate.pwd = pwd;
        }
        lineOffset++;
      }

      // Lines i+6 onwards: Subject codes and mediums
      // First line after PwD contains first 3 subject codes concatenated (e.g., "184002041")
      // Then alternating: code, medium, code, medium...
      const subjectCodes = [];
      const addGroupedSubjectCodes = (digits) => {
        if (!digits || digits.length < 3) return;
        // Truncate to nearest multiple of 3 to avoid partial codes
        const usable = digits.substring(0, digits.length - (digits.length % 3));
        for (let k = 0; k < usable.length; k += 3) {
          subjectCodes.push({ code: usable.substring(k, k + 3), medium: '' });
        }
      };
      const addDenseSubjectCodes = (digits) => {
        if (!digits || digits.length < 6) return false;
        let normalized = digits;
        const remainder = normalized.length % 3;
        if (remainder !== 0) {
          normalized = normalized.substring(0, normalized.length - remainder);
        }
        if (normalized.length < 6 || normalized.length % 3 !== 0) return false;
        addGroupedSubjectCodes(normalized);
        return true;
      };
      const setDobFromString = (value) => {
        const dobMatch = value.match(dobPattern);
        if (!dobMatch) return false;
        const day = dobMatch[1];
        const month = dobMatch[2];
        const year = dobMatch[3];
        candidate.dateOfBirth = new Date(`${year}-${month}-${day}`);
        return true;
      };

      if (inlinePacked) {
        // Subject codes and DOB were already on the roll number line — apply them directly.
        addGroupedSubjectCodes(inlineSubjectDigits);
        setDobFromString(inlineDob);
      } else if (i + lineOffset < lines.length) {
        const firstSubjectLine = lines[i + lineOffset].trim();
        const combinedCodesAndDob = firstSubjectLine.match(/^(\d{6,30})(\d{2}\.\d{2}\.\d{4})$/);

        // Some rows pack all subject codes and DOB into one line:
        // e.g., 18400204108608740212.06.2011
        const combinedDigits = combinedCodesAndDob?.[1];
        const combinedDob = combinedCodesAndDob?.[2];
        if (combinedDigits && combinedDob && combinedDigits.length >= 6) {
          addGroupedSubjectCodes(combinedDigits);
          setDobFromString(combinedDob);
          lineOffset++;
        }

        // Check if this line contains concatenated subject codes (9 digits = 3 codes)
        else if (/^\d{9}$/.test(firstSubjectLine)) {
          // Extract first 3 subject codes
          subjectCodes.push({ code: firstSubjectLine.substring(0, 3), medium: '' });
          subjectCodes.push({ code: firstSubjectLine.substring(3, 6), medium: '' });
          subjectCodes.push({ code: firstSubjectLine.substring(6, 9), medium: '' });
          lineOffset++;

          // Next line might be medium for the 3rd subject
          if (i + lineOffset < lines.length) {
            const medLine = lines[i + lineOffset].trim();
            if (/^[0-9]$/.test(medLine)) {
              subjectCodes[2].medium = medLine;
              lineOffset++;
            }
          }
        }
        // Handle generic grouped codes line (e.g., 6, 12, 15, 18 digits)
        else if (/^\d{6,30}$/.test(firstSubjectLine)) {
          addDenseSubjectCodes(firstSubjectLine);
          lineOffset++;
        }

        // Continue extracting remaining subject codes (alternating code, medium)
        for (let j = 0; j < 15 && i + lineOffset + j < lines.length; j++) {
          const currentLine = lines[i + lineOffset + j].trim();
          // Match a line that is subject code(s) packed with DOB, e.g. "40231.07.2010" (3 digits + DOB)
          // or "402184031.07.2010" (6+ digits + DOB). Minimum 3 digits before DOB.
          const currentCombinedCodesAndDob = currentLine.match(/^(\d{3,24})(\d{2}\.\d{2}\.\d{4})$/);

          if (currentCombinedCodesAndDob) {
            // Only add as subject codes if digit count is multiple of 3
            if (currentCombinedCodesAndDob[1].length % 3 === 0) {
              addGroupedSubjectCodes(currentCombinedCodesAndDob[1]);
            }
            setDobFromString(currentCombinedCodesAndDob[2]);
            break;
          }

          // Check if this is the date of birth line
          if (setDobFromString(currentLine)) {
            break;
          }

          // Grouped subject codes in a single line
          if (/^\d{6,30}$/.test(currentLine)) {
            addDenseSubjectCodes(currentLine);
            continue;
          }

          // Handle medium+code packed on one line (e.g., "2034" = medium "2" for prev subject + code "034")
          // This happens when pdf-parse concatenates a medium value with the next subject code.
          const medCodeMatch = currentLine.match(/^(\d{1,2})(\d{3})$/);
          if (medCodeMatch && subjectCodes.length > 0) {
            const medPart = medCodeMatch[1];
            const codePart = medCodeMatch[2];
            let handled = false;

            if (medPart.length === 1 && !subjectCodes[subjectCodes.length - 1].medium) {
              subjectCodes[subjectCodes.length - 1].medium = medPart;
              let medium = '';
              if (i + lineOffset + j + 1 < lines.length) {
                const nextLine = lines[i + lineOffset + j + 1].trim();
                if (/^[0-9]$/.test(nextLine)) {
                  medium = nextLine;
                  j++;
                }
              }
              subjectCodes.push({ code: codePart, medium });
              handled = true;
            } else if (medPart.length === 2 && subjectCodes.length >= 2
              && !subjectCodes[subjectCodes.length - 1].medium
              && !subjectCodes[subjectCodes.length - 2].medium) {
              subjectCodes[subjectCodes.length - 2].medium = medPart[0];
              subjectCodes[subjectCodes.length - 1].medium = medPart[1];
              let medium = '';
              if (i + lineOffset + j + 1 < lines.length) {
                const nextLine = lines[i + lineOffset + j + 1].trim();
                if (/^[0-9]$/.test(nextLine)) {
                  medium = nextLine;
                  j++;
                }
              }
              subjectCodes.push({ code: codePart, medium });
              handled = true;
            }

            if (handled) continue;
          }

          // Check if this is a 3-digit subject code
          if (/^\d{3}$/.test(currentLine)) {
            const code = currentLine;
            // Next line might be the medium
            let medium = '';
            if (i + lineOffset + j + 1 < lines.length) {
              const nextLine = lines[i + lineOffset + j + 1].trim();
              if (/^[0-9]$/.test(nextLine)) {
                medium = nextLine;
                j++; // Skip the medium line in next iteration
              }
            }
            subjectCodes.push({ code: code, medium: medium });
            continue;
          }

          // Skip single-digit medium lines that were not consumed by a preceding code
          // (can occur when the first 3-code block's last medium was not pre-consumed)
          if (/^[0-9]$/.test(currentLine)) {
            continue;
          }

          // Skip dashes (may appear from Int.Subs, Pr Roll, or Pr Year columns)
          if (/^-+$/.test(currentLine)) {
            continue;
          }

          // Stop if we hit another roll number
          if (isRollNumberLine(currentLine)) {
            break;
          }
        }
      }

      candidate.subjectCodes = subjectCodes;

      candidates.push(candidate);
    }
  }

  return candidates;
};

module.exports = {
  extractCandidatesFromText,
  normalizeSubjectCode,
  normalizeSubjectClass,
  buildSubjectKey,
  readUploadedFileBuffer,
};
