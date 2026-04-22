/**
 * Maps purchasable modules to the Mongoose model keys they require.
 *
 * Model keys must match the export keys in registerTenantModels.js exactly.
 * Core models are ALWAYS loaded regardless of which modules are active.
 *
 * The mapping is module-level (not feature-level): if ANY feature in a module
 * is enabled, ALL models for that module are registered. This is simpler and
 * safer than tracking per-feature model dependencies.
 */
const { getModuleFeatureKeys } = require('./tenantFeatures');

/**
 * Module → Model keys mapping.
 *
 * core:      Shared kernel — always loaded for auth, sessions, event bus, etc.
 * cntr:      Exam centre management models
 * timetable: Timetable generation models
 */
const MODULE_MODEL_KEYS = Object.freeze({
  core: Object.freeze([
    'User',
    'Teacher',
    'Subject',
    'Room',
    'AcademicSession',
    'CBSEDatesheet',
    'Calendar',
    'Feedback',
    'SupportTicket',
    'OnboardingSession',
  ]),
  cntr: Object.freeze([
    'Student',
    'Candidate',
    'DateSheet',
    'AnswerSheet',
    'AnswerSheetDispatch',
    'FolderMapping',
    'CBSECircular',
    'Form66',
    'Form66Upload',
    'Guideline',
    'Undertaking',
    'CentreDetail',
    'SeatingPlanTemplateSetting',
    'SeatingPlanAllocation',
    'DutyAllocationSetting',
    'DutyAssignment',
    'DutySelection',
    'AttendanceRecord',
    'AttendanceUpload',
  ]),
  exmcl: Object.freeze([
    'Student',
    'Candidate',
    'DateSheet',
    'AnswerSheet',
    'AnswerSheetDispatch',
    'FolderMapping',
    'CBSECircular',
    'Form66',
    'Form66Upload',
    'Guideline',
    'Undertaking',
    'CentreDetail',
    'SeatingPlanTemplateSetting',
    'SeatingPlanAllocation',
    'DutyAllocationSetting',
    'DutyAssignment',
    'DutySelection',
    'AttendanceRecord',
    'AttendanceUpload',
    'ExamCircular',
  ]),
  timetable: Object.freeze([
    'TimetableState',
    'TimetableVersion',
    'BellTimingVersion',
  ]),
});

/**
 * Feature keys grouped by module (pre-computed from the catalog).
 * Used to detect whether a module is active based on feature toggles.
 */
const MODULE_FEATURE_KEYS = Object.freeze({
  cntr: Object.freeze(getModuleFeatureKeys('cntr')),
  exmcl: Object.freeze(getModuleFeatureKeys('exmcl')),
  timetable: Object.freeze(getModuleFeatureKeys('timetable')),
});

/**
 * Returns true if at least one feature in the given module is enabled.
 * @param {string} moduleKey - 'cntr' or 'timetable'
 * @param {Record<string, boolean>} featureToggles - normalized toggles
 * @returns {boolean}
 */
const isModuleActive = (moduleKey, featureToggles) => {
  const features = MODULE_FEATURE_KEYS[moduleKey];
  if (!features) return false;
  return features.some((key) => featureToggles[key] !== false);
};

/**
 * Given a tenant's normalized feature toggles, returns the deduplicated list
 * of Mongoose model keys that should be registered.
 *
 * Core models are always included. Module-specific models are included only
 * if at least one feature in that module is enabled.
 *
 * @param {Record<string, boolean>} featureToggles - normalized feature toggles
 * @returns {string[]} model keys to register
 */
const getActiveModelKeys = (featureToggles) => {
  // Core always loaded
  const keys = [...MODULE_MODEL_KEYS.core];

  if (isModuleActive('cntr', featureToggles)) {
    keys.push(...MODULE_MODEL_KEYS.cntr);
  }

  if (isModuleActive('exmcl', featureToggles)) {
    keys.push(...MODULE_MODEL_KEYS.exmcl);
  }

  if (isModuleActive('timetable', featureToggles)) {
    keys.push(...MODULE_MODEL_KEYS.timetable);
  }

  return keys;
};

module.exports = {
  MODULE_MODEL_KEYS,
  isModuleActive,
  getActiveModelKeys,
};
