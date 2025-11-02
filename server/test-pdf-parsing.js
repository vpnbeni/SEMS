const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Helper function to extract candidate data from PDF text
const extractCandidatesFromText = (text) => {
  const candidates = [];
  const lines = text.split('\n').map(line => line.trim());

  // Pattern for roll number (8 digits)
  const rollNumberPattern = /^(\d{8})(.+)$/;
  
  // Pattern for date of birth (DD.MM.YYYY)
  const dobPattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line starts with a roll number
    const rollMatch = line.match(rollNumberPattern);
    if (rollMatch) {
      const rollNumber = rollMatch[1];
      let candidateName = rollMatch[2].trim();
      
      // Skip header rows or invalid entries
      if (!candidateName || candidateName.length < 2 || line.includes('Roll No')) {
        continue;
      }
      
      // Extract FLC if present (single letter followed by space at start of name)
      let flc = '';
      if (candidateName.length > 2 && /^[A-Z]\s/.test(candidateName)) {
        flc = candidateName[0];
        candidateName = candidateName.substring(2).trim();
      }
      
      const candidate = {
        rollNumber: rollNumber,
        name: candidateName,
        flc: flc,
        status: 'active',
        subjectCodes: []
      };
      
      // Parse the next lines for additional information
      let lineOffset = 1;
      
      // Line i+1: Mother Name
      if (i + lineOffset < lines.length) {
        const motherName = lines[i + lineOffset].trim();
        if (motherName && !rollNumberPattern.test(motherName) && motherName.length > 1) {
          candidate.motherName = motherName;
        }
        lineOffset++;
      }
      
      // Line i+2: Father Name
      if (i + lineOffset < lines.length) {
        const fatherName = lines[i + lineOffset].trim();
        if (fatherName && !rollNumberPattern.test(fatherName) && fatherName.length > 1) {
          candidate.fatherName = fatherName;
        }
        lineOffset++;
      }
      
      // Line i+3: Sex (M/F/G)
      if (i + lineOffset < lines.length) {
        const sex = lines[i + lineOffset].trim();
        if (sex && /^[MFG]$/.test(sex)) {
          candidate.sex = sex;
        }
        lineOffset++;
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
      
      if (i + lineOffset < lines.length) {
        const firstSubjectLine = lines[i + lineOffset].trim();
        
        // Check if this line contains concatenated subject codes (9 digits = 3 codes)
        if (/^\d{9}$/.test(firstSubjectLine)) {
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
        
        // Continue extracting remaining subject codes (alternating code, medium)
        for (let j = 0; j < 15 && i + lineOffset + j < lines.length; j++) {
          const currentLine = lines[i + lineOffset + j].trim();
          
          // Check if this is the date of birth line
          if (dobPattern.test(currentLine)) {
            const dobMatch = currentLine.match(dobPattern);
            if (dobMatch) {
              const day = dobMatch[1];
              const month = dobMatch[2];
              const year = dobMatch[3];
              candidate.dateOfBirth = new Date(`${year}-${month}-${day}`);
            }
            break;
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
          }
          
          // Stop if we hit another roll number or dash
          if (rollNumberPattern.test(currentLine) || currentLine === '-') {
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

async function testPdfParsing() {
  try {
    // Try to find the PDF file
    const possiblePaths = [
      path.join(__dirname, '../client/src/public/Centre List of Candidates 10th.pdf'),
      path.join(__dirname, '../client/public/Centre List of Candidates 10th.pdf'),
      path.join(__dirname, 'Centre List of Candidates 10th.pdf')
    ];

    let pdfPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        pdfPath = testPath;
        break;
      }
    }

    if (!pdfPath) {
      console.error('PDF file not found in any of the expected locations:');
      possiblePaths.forEach(p => console.error('  -', p));
      return;
    }

    console.log('Found PDF at:', pdfPath);
    console.log('\nParsing PDF...\n');

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    
    console.log('PDF Text Length:', pdfData.text.length);
    console.log('\n--- First 1000 characters of PDF text ---');
    console.log(pdfData.text.substring(0, 1000));
    console.log('\n--- Extracting candidates ---\n');

    const candidates = extractCandidatesFromText(pdfData.text);
    
    console.log(`Found ${candidates.length} candidates\n`);
    
    // Show first 5 candidates in detail
    console.log('--- First 5 candidates ---\n');
    candidates.slice(0, 5).forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.name} (${candidate.rollNumber})`);
      if (candidate.motherName) console.log(`   Mother: ${candidate.motherName}`);
      if (candidate.fatherName) console.log(`   Father: ${candidate.fatherName}`);
      if (candidate.sex) console.log(`   Sex: ${candidate.sex}`);
      if (candidate.category) console.log(`   Category: ${candidate.category}`);
      if (candidate.dateOfBirth) console.log(`   DoB: ${candidate.dateOfBirth.toLocaleDateString()}`);
      if (candidate.subjectCodes.length > 0) {
        console.log(`   Subjects: ${candidate.subjectCodes.map(s => s.code).join(', ')}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testPdfParsing();
