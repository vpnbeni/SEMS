const TENANT_FEATURE_PAGES = Object.freeze([
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', group: 'Core' },
  { key: 'school_hub', label: 'School Hub', path: '/school-hub', group: 'School Hub' },
  { key: 'timetable_classes', label: 'Time Table - Classes', path: '/time-table/classes', group: 'School Hub' },
  { key: 'timetable_subjects', label: 'Time Table - Subjects', path: '/time-table/subjects', group: 'School Hub' },
  { key: 'timetable_bell_timings', label: 'Time Table - Bell Timings', path: '/time-table/bell-timings', group: 'School Hub' },
  { key: 'timetable_class_wise', label: 'Time Table - Class Wise', path: '/time-table/class-wise', group: 'School Hub' },
  { key: 'timetable_teacher_wise', label: 'Time Table - Teacher Wise', path: '/time-table/teacher-wise', group: 'School Hub' },
  { key: 'timetable_period_allocation', label: 'Time Table - Period Allocation', path: '/time-table/period-allocation', group: 'School Hub' },
  { key: 'centre_details', label: 'Centre Details', path: '/centre-details', group: 'Centre Details' },
  { key: 'exam_functionaries', label: 'Exam Functionaries', path: '/exam-functionaries', group: 'Centre Details' },
  { key: 'centre_guidelines', label: 'Centre Guidelines', path: '/centre-guidelines', group: 'Centre Details' },
  { key: 'cbse_circulars', label: 'CBSE Circulars', path: '/cbse-circulars', group: 'Centre Details' },
  { key: 'cbse_portals', label: 'CBSE Portals', path: '/cbse-portals', group: 'Centre Details' },
  { key: 'subjects', label: 'Subjects', path: '/subjects', group: 'Centre Details' },
  { key: 'undertaking', label: 'Undertaking Form', path: '/undertaking', group: 'Centre Details' },
  { key: 'datesheets', label: 'Datesheets', path: '/datesheets', group: 'Centre Records' },
  { key: 'form66', label: 'Form 66', path: '/form66', group: 'Centre Records' },
  { key: 'examrooms', label: 'Exam Room/Hall', path: '/examrooms', group: 'Centre Records' },
  { key: 'answersheets', label: 'Answer Sheets', path: '/answersheets', group: 'Centre Records' },
  { key: 'seatingplan', label: 'Seating Plan', path: '/seatingplan', group: 'Centre Records' },
  { key: 'duties', label: 'Duties', path: '/duties', group: 'Centre Records' },
  { key: 'attendance', label: 'Attendance', path: '/attendance', group: 'Centre Records' },
  { key: 'candidates', label: 'Candidates', path: '/candidates', group: 'Centre Records' },
  { key: 'billing', label: 'Billing', path: '/billing', group: 'Account' },
  { key: 'account_settings', label: 'Account Settings', path: '/account-settings', group: 'Account' },
  { key: 'help_support', label: 'Help & Support', path: '/help-support', group: 'Account' },
]);

const TENANT_FEATURE_KEYS = Object.freeze(TENANT_FEATURE_PAGES.map((entry) => entry.key));

const createAllEnabledFeatureToggles = () => {
  return TENANT_FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
};

const normalizeFeatureSource = (source) => {
  if (!source) {
    return {};
  }

  if (source instanceof Map) {
    return Object.fromEntries(source.entries());
  }

  if (typeof source === 'object') {
    return source;
  }

  return {};
};

const normalizeTenantFeatureToggles = (source) => {
  const normalized = createAllEnabledFeatureToggles();
  const sourceObject = normalizeFeatureSource(source);

  TENANT_FEATURE_KEYS.forEach((key) => {
    if (sourceObject[key] === false) {
      normalized[key] = false;
      return;
    }

    if (sourceObject[key] === true) {
      normalized[key] = true;
    }
  });

  return normalized;
};

module.exports = {
  TENANT_FEATURE_PAGES,
  TENANT_FEATURE_KEYS,
  createAllEnabledFeatureToggles,
  normalizeTenantFeatureToggles,
};
