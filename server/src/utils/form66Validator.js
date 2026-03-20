/**
 * Form 66 Validation Utility
 * Validates Form 66 records against candidate database
 */

/**
 * Validate Form 66 records against candidates
 * @param {Array} form66Records - Parsed Form 66 records
 * @param {Array} candidates - Candidate records from database
 * @returns {Object} Validation report with mismatches
 */
function validateForm66AgainstCandidates(form66Records, candidates) {
  const candidateMap = new Map(
    candidates.map(c => [c.rollNumber.toUpperCase(), c])
  );

  const rollNumberMismatches = detectRollNumberMismatches(form66Records, candidateMap);
  const subjectMismatches = detectSubjectMismatches(form66Records, candidateMap);
  const classMismatches = detectClassMismatches(form66Records, candidateMap);

  return generateValidationReport({
    rollNumberMismatches,
    subjectMismatches,
    classMismatches
  });
}

/**
 * Detect roll numbers in Form 66 that don't exist in candidates
 */
function detectRollNumberMismatches(form66Records, candidateMap) {
  const mismatches = [];

  form66Records.forEach(record => {
    if (record.rollNumbers && Array.isArray(record.rollNumbers)) {
      record.rollNumbers.forEach(rollNumber => {
        const normalizedRoll = rollNumber.toUpperCase();
        if (!candidateMap.has(normalizedRoll)) {
          mismatches.push({
            rollNumber: normalizedRoll,
            subject: record.subjectCode,
            examDate: record.examDate,
            reason: 'Roll number not found in candidates database'
          });
        }
      });
    }
  });

  return mismatches;
}

/**
 * Detect subject mismatches between Form 66 and candidate enrollments
 */
function detectSubjectMismatches(form66Records, candidateMap) {
  const mismatches = [];

  form66Records.forEach(record => {
    if (record.rollNumbers && Array.isArray(record.rollNumbers)) {
      record.rollNumbers.forEach(rollNumber => {
        const normalizedRoll = rollNumber.toUpperCase();
        const candidate = candidateMap.get(normalizedRoll);

        if (candidate && candidate.subjects) {
          const hasSubject = candidate.subjects.some(
            s => s.code === record.subjectCode
          );

          if (!hasSubject) {
            mismatches.push({
              rollNumber: normalizedRoll,
              candidateName: candidate.name,
              form66Subject: record.subjectCode,
              candidateSubjects: candidate.subjects.map(s => s.code).join(', '),
              examDate: record.examDate,
              reason: 'Subject in Form 66 not enrolled for candidate'
            });
          }
        }
      });
    }
  });

  return mismatches;
}

/**
 * Detect class mismatches
 */
function detectClassMismatches(form66Records, candidateMap) {
  const mismatches = [];

  form66Records.forEach(record => {
    if (record.rollNumbers && Array.isArray(record.rollNumbers)) {
      record.rollNumbers.forEach(rollNumber => {
        const normalizedRoll = rollNumber.toUpperCase();
        const candidate = candidateMap.get(normalizedRoll);

        if (candidate && candidate.class && record.class) {
          if (candidate.class !== record.class) {
            mismatches.push({
              rollNumber: normalizedRoll,
              candidateName: candidate.name,
              form66Class: record.class,
              candidateClass: candidate.class,
              reason: 'Class mismatch between Form 66 and candidate record'
            });
          }
        }
      });
    }
  });

  return mismatches;
}

/**
 * Generate validation report
 */
function generateValidationReport(mismatches) {
  const totalMismatches =
    mismatches.rollNumberMismatches.length +
    mismatches.subjectMismatches.length +
    mismatches.classMismatches.length;

  return {
    isValid: totalMismatches === 0,
    totalMismatches,
    rollNumberMismatches: mismatches.rollNumberMismatches,
    subjectMismatches: mismatches.subjectMismatches,
    classMismatches: mismatches.classMismatches,
    summary: {
      rollNumberIssues: mismatches.rollNumberMismatches.length,
      subjectIssues: mismatches.subjectMismatches.length,
      classIssues: mismatches.classMismatches.length
    }
  };
}

module.exports = {
  validateForm66AgainstCandidates,
  detectRollNumberMismatches,
  detectSubjectMismatches,
  detectClassMismatches,
  generateValidationReport
};
