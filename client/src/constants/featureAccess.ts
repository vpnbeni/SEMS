export type TenantFeatureToggles = Record<string, boolean> | null | undefined

const FEATURE_RULES = [
  { key: 'dashboard', prefixes: ['/dashboard'] },
  { key: 'school_hub', prefixes: ['/school-hub'] },
  { key: 'timetable_classes', prefixes: ['/time-table/classes'] },
  { key: 'timetable_subjects', prefixes: ['/time-table/subjects'] },
  { key: 'timetable_bell_timings', prefixes: ['/time-table/bell-timings'] },
  { key: 'timetable_class_wise', prefixes: ['/time-table/class-wise'] },
  { key: 'timetable_teacher_wise', prefixes: ['/time-table/teacher-wise'] },
  { key: 'timetable_period_allocation', prefixes: ['/time-table/period-allocation'] },
  { key: 'centre_details', prefixes: ['/centre-details'] },
  { key: 'exam_functionaries', prefixes: ['/exam-functionaries', '/teachers'] },
  { key: 'centre_guidelines', prefixes: ['/centre-guidelines'] },
  { key: 'cbse_circulars', prefixes: ['/cbse-circulars'] },
  { key: 'cbse_portals', prefixes: ['/cbse-portals'] },
  { key: 'subjects', prefixes: ['/subjects'] },
  { key: 'undertaking', prefixes: ['/undertaking'] },
  { key: 'datesheets', prefixes: ['/datesheets'] },
  { key: 'form66', prefixes: ['/form66'] },
  { key: 'examrooms', prefixes: ['/examrooms', '/rooms'] },
  { key: 'answersheets', prefixes: ['/answersheets'] },
  { key: 'seatingplan', prefixes: ['/seatingplan'] },
  { key: 'duties', prefixes: ['/duties'] },
  { key: 'attendance', prefixes: ['/attendance'] },
  { key: 'candidates', prefixes: ['/candidates'] },
  { key: 'billing', prefixes: ['/billing'] },
  { key: 'account_settings', prefixes: ['/account-settings'] },
  { key: 'help_support', prefixes: ['/help-support'] },
] as const

const FALLBACK_ROUTE_PRIORITY = [
  '/dashboard',
  '/school-hub',
  '/centre-details',
  '/exam-functionaries',
  '/candidates',
  '/subjects',
  '/datesheets',
  '/answersheets',
  '/billing',
  '/help-support',
]

const matchesPrefix = (pathname: string, prefix: string): boolean => {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

const resolveFeatureKeyFromPath = (pathname: string): string | null => {
  for (const rule of FEATURE_RULES) {
    if (rule.prefixes.some((prefix) => matchesPrefix(pathname, prefix))) {
      return rule.key
    }
  }

  return null
}

export const isFeatureEnabledForPath = (pathname: string, toggles: TenantFeatureToggles): boolean => {
  const featureKey = resolveFeatureKeyFromPath(pathname)
  if (!featureKey) {
    return true
  }

  return toggles?.[featureKey] !== false
}

export const getFirstEnabledPath = (toggles: TenantFeatureToggles): string | null => {
  const firstEnabled = FALLBACK_ROUTE_PRIORITY.find((path) => isFeatureEnabledForPath(path, toggles))
  return firstEnabled || null
}
