/**
 * Cntr module model barrel — Exam Centre Management.
 *
 * Re-exports all model proxies that belong to the cntr (exam centre) module.
 * These models are registered only when at least one cntr feature is active.
 *
 * Canonical source of truth for cntr model ownership.
 * Keep in sync with MODULE_MODEL_KEYS.cntr in constants/moduleModelKeys.js.
 */
module.exports = {
  Student: require('../../models/Student'),
  Candidate: require('../../models/Candidate'),
  DateSheet: require('../../models/DateSheet'),
  AnswerSheet: require('../../models/AnswerSheet'),
  AnswerSheetDispatch: require('../../models/AnswerSheetDispatch'),
  FolderMapping: require('../../models/FolderMapping'),
  CBSECircular: require('../../models/CBSECircular'),
  Form66: require('../../models/Form66').Form66,
  Form66Upload: require('../../models/Form66').Form66Upload,
  Guideline: require('../../models/Guideline'),
  Undertaking: require('../../models/Undertaking'),
  CentreDetail: require('../../models/CentreDetail'),
  SeatingPlanTemplateSetting: require('../../models/SeatingPlanTemplateSetting'),
  SeatingPlanAllocation: require('../../models/SeatingPlanAllocation'),
  DutyAllocationSetting: require('../../models/DutyAllocationSetting'),
  DutyAssignment: require('../../models/DutyAssignment'),
  DutySelection: require('../../models/DutySelection'),
  AttendanceRecord: require('../../models/AttendanceRecord').AttendanceRecord,
  AttendanceUpload: require('../../models/AttendanceRecord').AttendanceUpload,
};
