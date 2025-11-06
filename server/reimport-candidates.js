require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Candidate = require('./src/models/Candidate');
const pdfParse = require('pdf-parse');
const fs = require('fs');

// Copy the updated extraction function from candidateController.js
const extractCandidatesFromText = (text) => {
  const candidates = [];
  const lines = text.split('\n').map(line => line.trim());

  const rollNumberPattern = /^(\d{8})(.+)$/;
  const dobPattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const schoolPattern = /(?:CENTRE|SCHOOL)\s*[:：-]\s*(\d+)\s+(.+?)(?:ROHTAK|$)/i;
  const classPattern = /(?:SENIOR\s+SEC(?:ONDARY)?|SECONDARY)\s+(?:SCH|SCHOOL)\s+(?:CERT\s+)?EXAMINATION/i;

  let currentSchoolName = '';
  let currentSchoolCode = '';
  let currentClass = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const classMatch = line.match(classPattern);
    if (classMatch) {
      const examType = classMatch[0].toUpperCase();
      if (examType.includes('SENIOR')) {
        currentClass = '12th';
      } else if (examType.includes('SECONDARY')) {
        currentClass = '10th';
      }
      continue;
    }

    const schoolMatch = line.match(schoolPattern);
    if (schoolMatch) {
      currentSchoolCode = schoolMatch[1].trim();
      currentSchoolName = schoolMatch[2].trim();
      continue;
    }

    const rollMatch = line.match(rollNumberPattern);
    if (rollMatch) {
      const rollNumber = rollMatch[1];
      let candidateName = rollMatch[2].trim();

      if (!candidateName || candidateName.length < 2 || line.includes('Roll No')) {
        continue;
      }

      let flc = '';
      if (candidateName.length > 2 && /^[A-Z]\s/.test(candidateName)) {
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

      let lineOffset = 1;

      if (i + lineOffset < lines.length) {
        const motherName = lines[i + lineOffset].trim();
        if (motherName && !rollNumberPattern.test(motherName) && motherName.length > 1) {
          candidate.motherName = motherName;
        }
        lineOffset++;
      }

      if (i + lineOffset < lines.length) {
        const fatherName = lines[i + lineOffset].trim();
        if (fatherName && !rollNumberPattern.test(fatherName) && fatherName.length > 1) {
          candidate.fatherName = fatherName;
        }
        lineOffset++;
      }

      if (i + lineOffset < lines.length) {
        const nextLine = lines[i + lineOffset].trim();
        if (nextLine && /^[MFG]$/.test(nextLine)) {
          candidate.sex = nextLine;
          lineOffset++;
        } else if (nextLine && nextLine.length > 1 && nextLine.length < 30 && !/^\d/.test(nextLine)) {
          lineOffset++;
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

      if (i + lineOffset < lines.length) {
        const category = lines[i + lineOffset].trim();
        if (category && /^[GCS]$/.test(category)) {
          candidate.category = category;
        } else if (category === 'NA') {
          candidate.category = '';
        }
        lineOffset++;
      }

      if (i + lineOffset < lines.length) {
        const pwd = lines[i + lineOffset].trim();
        if (pwd && pwd !== 'NA' && pwd.length <= 5) {
          candidate.pwd = pwd;
        }
        lineOffset++;
      }

      const subjectCodes = [];

      if (i + lineOffset < lines.length) {
        const firstSubjectLine = lines[i + lineOffset].trim();

        if (/^\d{9}$/.test(firstSubjectLine)) {
          subjectCodes.push({ code: firstSubjectLine.substring(0, 3), medium: '' });
          subjectCodes.push({ code: firstSubjectLine.substring(3, 6), medium: '' });
          subjectCodes.push({ code: firstSubjectLine.substring(6, 9), medium: '' });
          lineOffset++;

          if (i + lineOffset < lines.length) {
            const medLine = lines[i + lineOffset].trim();
            if (/^[0-9]$/.test(medLine)) {
              subjectCodes[2].medium = medLine;
              lineOffset++;
            }
          }
        }

        for (let j = 0; j < 15 && i + lineOffset + j < lines.length; j++) {
          const currentLine = lines[i + lineOffset + j].trim();

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

          if (/^\d{3}$/.test(currentLine)) {
            const code = currentLine;
            let medium = '';
            if (i + lineOffset + j + 1 < lines.length) {
              const nextLine = lines[i + lineOffset + j + 1].trim();
              if (/^[0-9]$/.test(nextLine)) {
                medium = nextLine;
                j++;
              }
            }
            subjectCodes.push({ code: code, medium: medium });
          }

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

async function reimportCandidates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-management');
    console.log('✅ Connected to MongoDB');

    const pdfPath = './client/src/public/Centre List of Candidates 10th.pdf';
    
    console.log('\n📄 Reading PDF...');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    
    console.log('🔍 Extracting candidates...');
    const candidates = extractCandidatesFromText(pdfData.text);
    console.log(`✅ Extracted ${candidates.length} candidates\n`);

    // Delete all existing candidates
    console.log('🗑️  Deleting existing candidates...');
    const deleteResult = await Candidate.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} candidates\n`);

    // Import new candidates
    console.log('📥 Importing candidates...');
    const Subject = require('./src/models/Subject');
    const subjects = await Subject.find({ isActive: true });
    const subjectMap = new Map();
    subjects.forEach(subject => {
      const key = `${subject.code}-${subject.class}`;
      subjectMap.set(key, subject);
    });

    let imported = 0;
    let linked = 0;

    for (const candidateData of candidates) {
      candidateData.importedFrom = {
        fileName: 'Centre List of Candidates 10th.pdf',
        uploadDate: new Date()
      };

      const candidate = await Candidate.create(candidateData);
      imported++;

      // Link subjects
      if (candidate.subjectCodes && candidate.subjectCodes.length > 0) {
        const linkedSubjects = [];
        
        for (const subjectCode of candidate.subjectCodes) {
          const key = `${subjectCode.code}-${candidate.class}`;
          const subject = subjectMap.get(key);
          
          if (subject) {
            linkedSubjects.push(subject._id);
          }
        }
        
        if (linkedSubjects.length > 0) {
          candidate.subjects = linkedSubjects;
          await candidate.save();
          linked++;
        }
      }

      if (imported % 50 === 0) {
        console.log(`  Imported ${imported}/${candidates.length}...`);
      }
    }

    console.log(`\n✅ Successfully imported ${imported} candidates`);
    console.log(`✅ Linked subjects for ${linked} candidates\n`);

    // Verify our specific candidate
    const targetCandidate = await Candidate.findOne({ rollNumber: '17248921' });
    if (targetCandidate) {
      console.log('✅ Verified candidate 17248921:');
      console.log(`   Name: ${targetCandidate.name}`);
      console.log(`   Sex: ${targetCandidate.sex}`);
      console.log(`   Category: ${targetCandidate.category}`);
      console.log(`   Subjects: ${targetCandidate.subjectCodes.length} codes, ${targetCandidate.subjects.length} linked`);
      console.log(`   DOB: ${targetCandidate.dateOfBirth}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

reimportCandidates();
