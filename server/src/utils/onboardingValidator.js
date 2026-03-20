/**
 * Onboarding Validation Utility
 * Cross-system validation for onboarding workflow
 */

const { validateForm66AgainstCandidates } = require('./form66Validator');

/**
 * Validate candidate completeness
 * @param {Array} candidates - Candidate records
 * @returns {Object} Validation report
 */
function validateCandidateCompleteness(candidates) {
  const issues = [];

  candidates.forEach(candidate => {
    if (!candidate.rollNumber) {
      issues.push({
        candidateId: candidate._id,
        field: 'rollNumber',
        reason: 'Missing roll number'
      });
    }

    if (!candidate.name) {
      issues.push({
        candidateId: candidate._id,
        rollNumber: candidate.rollNumber,
        field: 'name',
        reason: 'Missing candidate name'
      });
    }

    if (!candidate.subjects || candidate.subjects.length === 0) {
      issues.push({
        candidateId: candidate._id,
        rollNumber: candidate.rollNumber,
        field: 'subjects',
        reason: 'No subjects enrolled'
      });
    }

    if (!candidate.class) {
      issues.push({
        candidateId: candidate._id,
        rollNumber: candidate.rollNumber,
        field: 'class',
        reason: 'Missing class information'
      });
    }
  });

  return {
    isValid: issues.length === 0,
    totalIssues: issues.length,
    issues
  };
}

/**
 * Cross-validate Form 66 against candidates
 * @param {Array} form66Records - Parsed Form 66 records
 * @param {Array} candidates - Candidate records
 * @returns {Object} Validation report
 */
function crossValidateForm66(form66Records, candidates) {
  return validateForm66AgainstCandidates(form66Records, candidates);
}

/**
 * Cross-validate attendance against candidates and Form 66
 * @param {Array} attendanceRecords - Attendance records with roll numbers
 * @param {Array} candidates - Candidate records
 * @param {Array} form66Records - Form 66 records (optional)
 * @returns {Object} Validation report
 */
function crossValidateAttendance(attendanceRecords, candidates, form66Records = []) {
  const candidateMap = new Map(
    candidates.map(c => [c.rollNumber.toUpperCase(), c])
  );

  const form66RollNumbers = new Set();
  if (form66Records && form66Records.length > 0) {
    form66Records.forEach(record => {
      if (record.rollNumbers && Array.isArray(record.rollNumbers)) {
        record.rollNumbers.forEach(roll => {
          form66RollNumbers.add(roll.toUpperCase());
        });
      }
    });
  }

  const mismatches = [];

  attendanceRecords.forEach(record => {
    const normalizedRoll = record.rollNumber.toUpperCase();
    const candidate = candidateMap.get(normalizedRoll);

    // Check if roll number exists in candidates
    if (!candidate) {
      mismatches.push({
        rollNumber: normalizedRoll,
        reason: 'Roll number in attendance sheet not found in candidates',
        severity: 'error'
      });
      return;
    }

    // Check if roll number exists in Form 66 (if provided)
    if (form66Records.length > 0 && !form66RollNumbers.has(normalizedRoll)) {
      mismatches.push({
        rollNumber: normalizedRoll,
        candidateName: candidate.name,
        reason: 'Roll number in attendance sheet not found in Form 66',
        severity: 'warning'
      });
    }

    // Check class match
    if (record.class && candidate.class && record.class !== candidate.class) {
      mismatches.push({
        rollNumber: normalizedRoll,
        candidateName: candidate.name,
        attendanceClass: record.class,
        candidateClass: candidate.class,
        reason: 'Class mismatch between attendance and candidate record',
        severity: 'warning'
      });
    }
  });

  return {
    isValid: mismatches.filter(m => m.severity === 'error').length === 0,
    totalMismatches: mismatches.length,
    errors: mismatches.filter(m => m.severity === 'error'),
    warnings: mismatches.filter(m => m.severity === 'warning'),
    mismatches
  };
}

/**
 * Generate comprehensive onboarding report
 * @param {Object} data - All onboarding data
 * @returns {Object} Comprehensive validation report
 */
function generateOnboardingReport(data) {
  const {
    candidatesX = [],
    candidatesXII = [],
    form66RecordsX = [],
    form66RecordsXII = [],
    attendanceRecordsX = [],
    attendanceRecordsXII = []
  } = data;

  // Validate candidate completeness
  const candidateCompletenessX = validateCandidateCompleteness(candidatesX);
  const candidateCompletenessXII = validateCandidateCompleteness(candidatesXII);

  // Cross-validate Form 66
  const form66ValidationX = crossValidateForm66(form66RecordsX, candidatesX);
  const form66ValidationXII = crossValidateForm66(form66RecordsXII, candidatesXII);

  // Cross-validate Attendance
  const attendanceValidationX = crossValidateAttendance(
    attendanceRecordsX,
    candidatesX,
    form66RecordsX
  );
  const attendanceValidationXII = crossValidateAttendance(
    attendanceRecordsXII,
    candidatesXII,
    form66RecordsXII
  );

  // Calculate overall status
  const hasErrors =
    !candidateCompletenessX.isValid ||
    !candidateCompletenessXII.isValid ||
    !form66ValidationX.isValid ||
    !form66ValidationXII.isValid ||
    !attendanceValidationX.isValid ||
    !attendanceValidationXII.isValid;

  const hasWarnings =
    form66ValidationX.totalMismatches > 0 ||
    form66ValidationXII.totalMismatches > 0 ||
    attendanceValidationX.warnings.length > 0 ||
    attendanceValidationXII.warnings.length > 0;

  const overallStatus = hasErrors ? 'errors' : hasWarnings ? 'warnings' : 'valid';

  return {
    overallStatus,
    classX: {
      candidateCount: candidatesX.length,
      candidateCompleteness: candidateCompletenessX,
      form66Validation: form66ValidationX,
      attendanceValidation: attendanceValidationX
    },
    classXII: {
      candidateCount: candidatesXII.length,
      candidateCompleteness: candidateCompletenessXII,
      form66Validation: form66ValidationXII,
      attendanceValidation: attendanceValidationXII
    },
    summary: {
      totalCandidates: candidatesX.length + candidatesXII.length,
      totalIssues:
        candidateCompletenessX.totalIssues +
        candidateCompletenessXII.totalIssues +
        form66ValidationX.totalMismatches +
        form66ValidationXII.totalMismatches +
        attendanceValidationX.totalMismatches +
        attendanceValidationXII.totalMismatches
    }
  };
}

module.exports = {
  validateCandidateCompleteness,
  crossValidateForm66,
  crossValidateAttendance,
  generateOnboardingReport
};
