const fs = require('fs');
const path = require('path');

// Simple test to parse Form 66
const content = `
SECONDARY SCHOOL CERTIFICATE EXAMINATION 2025
**CBSE-66/ CENTRE MEMO**

CENTRE - 827403 INTL BHARTI SCHOOL GOHANA ROAD ROHTAK HARYANA
DATE OF SUBJECT DESCRIPTION    ROLL NOS REGISTERED  ROLL NOS OF CANDIDATES  ROLL NOS OF UNFAIR MEANS TOTAL NO OF ANSWER BOOKS
EXAM.                                                ABSENT, IF ANY          (CASES, IF ANY)         SENT TO REGIONAL OFFICE

20.02.2025 086 SCIENCE
                                17248737-17248800    64 I                    I                       I                       I
                                                        I                    I                       I                       I
                                17248801-17248900   100 I                    I                       I                       I
                                                        I                    I                       I                       I
                                17248901-17249000   100 I                    I                       I                       I
                                                        I                    I                       I                       I
                                17249001-17249051    51 I                    I                       I                       I
                                                        I                    I                       I                       I

** SUBJECT TOTAL**                315 I                    I                       I                       I
`;

console.log('Testing Form 66 Parser...\n');
console.log('Content length:', content.length);
console.log('Lines:', content.split('\n').length);

const lines = content.split('\n');
let currentExam = null;
const records = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (!line) continue;
  
  // Look for centre
  const centreMatch = line.match(/CENTRE\s*[-:]\s*(\d+)\s+(.+)/i);
  if (centreMatch) {
    console.log('Found centre:', centreMatch[1], centreMatch[2]);
    currentExam = {
      centreNo: centreMatch[1],
      centreName: centreMatch[2].trim()
    };
    continue;
  }
  
  // Look for date and subject
  const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d+)\s+(.+)/);
  if (dateMatch) {
    console.log('Found exam:', dateMatch[1], dateMatch[2], dateMatch[3]);
    if (currentExam) {
      currentExam.date = dateMatch[1];
      currentExam.subjectCode = dateMatch[2];
      currentExam.subject = dateMatch[3].trim();
      currentExam.rollNumbers = [];
    }
    continue;
  }
  
  // Look for roll ranges
  const rollMatch = line.match(/(\d{7,8})-(\d{7,8})\s+(\d+)/);
  if (rollMatch) {
    console.log('Found roll range:', rollMatch[1], '-', rollMatch[2], '=', rollMatch[3], 'students');
    if (currentExam) {
      const start = parseInt(rollMatch[1]);
      const end = parseInt(rollMatch[2]);
      const count = parseInt(rollMatch[3]);
      
      for (let roll = start; roll <= end && currentExam.rollNumbers.length < count; roll++) {
        currentExam.rollNumbers.push(roll.toString());
      }
    }
  }
}

console.log('\nParsed exam:', currentExam);
console.log('Total roll numbers:', currentExam?.rollNumbers?.length || 0);
