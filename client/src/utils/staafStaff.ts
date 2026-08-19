import type { Teacher } from '../redux/slices/teacherSlice'

export const STAAF_TYPE_OPTIONS = [
  'Teacher',
  'Sports Coach',
  'Admin',
  'Class IV',
  'Driver',
  'Conductor',
  'Security',
  'Peon',
  'Sweaper',
  'Clerk',
]

export type StaafStaffGroup = 'teaching' | 'sportsCoach' | 'admin' | 'drivers' | 'conductors' | 'security'

const normalize = (value?: string) => String(value || '').trim().toLowerCase()

const DESIGNATION_CODES = ['PRT', 'TGT', 'PGT'] as const

export const getStaffGender = (staff: Teacher): 'Male' | 'Female' | 'Other' | 'Unspecified' => {
  const raw = normalize((staff as Teacher & { gender?: string }).gender)
  if (raw === 'male' || raw === 'm' || raw === 'man') return 'Male'
  if (raw === 'female' || raw === 'f' || raw === 'woman') return 'Female'
  if (raw === 'other') return 'Other'
  return 'Unspecified'
}

export const getDesignationCode = (staff: Teacher): 'PRT' | 'TGT' | 'PGT' | null => {
  const text = `${staff.designation || ''} ${staff.dutyType || ''}`.toUpperCase()
  if (/\bPGT\b/.test(text) || text.includes('POST GRADUATE')) return 'PGT'
  if (/\bTGT\b/.test(text) || text.includes('TRAINED GRADUATE')) return 'TGT'
  if (/\bPRT\b/.test(text) || text.includes('PRIMARY')) return 'PRT'
  return null
}

export const isSportsCoach = (staff: Teacher) => {
  const type = normalize(staff.dutyType)
  const designation = normalize(staff.designation)
  return (
    type.includes('coach') ||
    type === 'pet' ||
    type.includes('physical education') ||
    designation.includes('coach') ||
    designation === 'pet' ||
    designation.includes('physical education')
  )
}

export const isTeachingStaff = (staff: Teacher) => {
  const type = normalize(staff.dutyType)
  if (isSportsCoach(staff)) return false
  return type === 'teacher' || getDesignationCode(staff) !== null
}

export const isAdminStaff = (staff: Teacher) => {
  const type = normalize(staff.dutyType)
  const designation = normalize(staff.designation)
  return type === 'admin' || type === 'clerk' || designation.includes('admin') || designation.includes('clerk')
}

export const isClassIvStaff = (staff: Teacher) => {
  const type = normalize(staff.dutyType)
  return type === 'class iv' || type === 'peon' || type === 'sweaper' || type === 'sweeper'
}

export const isDriver = (staff: Teacher) => normalize(staff.dutyType) === 'driver'
export const isConductor = (staff: Teacher) => normalize(staff.dutyType) === 'conductor'
export const isSecurityStaff = (staff: Teacher) => {
  const type = normalize(staff.dutyType)
  const designation = normalize(staff.designation)
  return type === 'security' || type.includes('guard') || designation.includes('security') || designation.includes('guard')
}

export const STAFF_GROUP_MATCHERS: Record<StaafStaffGroup, (staff: Teacher) => boolean> = {
  teaching: isTeachingStaff,
  sportsCoach: isSportsCoach,
  admin: isAdminStaff,
  drivers: isDriver,
  conductors: isConductor,
  security: isSecurityStaff,
}

export const STAFF_GROUP_META: Record<
  StaafStaffGroup,
  { title: string; subtitle: string; entityLabel: string; entityLabelPlural?: string }
> = {
  teaching: {
    title: 'Teaching Staff',
    subtitle: 'Detailed profiles of all teaching staff members.',
    entityLabel: 'teacher',
  },
  sportsCoach: {
    title: 'Sports Coach',
    subtitle: 'Detailed profiles of all sports coaches.',
    entityLabel: 'sports coach',
    entityLabelPlural: 'sports coaches',
  },
  admin: {
    title: 'Admin Staff',
    subtitle: 'Detailed profiles of all admin staff members.',
    entityLabel: 'admin staff member',
  },
  drivers: {
    title: 'Drivers',
    subtitle: 'Detailed profiles of all drivers.',
    entityLabel: 'driver',
  },
  conductors: {
    title: 'Conductors',
    subtitle: 'Detailed profiles of all conductors.',
    entityLabel: 'conductor',
  },
  security: {
    title: 'Security Personnel',
    subtitle: 'Detailed profiles of all security personnel.',
    entityLabel: 'security personnel',
  },
}

export const DESIGNATION_MATRIX_KEYS = DESIGNATION_CODES

export type OrgBandId =
  | 'principal'
  | 'vice-principal'
  | 'pgt'
  | 'tgt'
  | 'prt'
  | 'sports-coach'
  | 'admin'
  | 'class-iv'
  | 'drivers'
  | 'conductors'
  | 'security'
  | 'other'

export const ORG_BANDS: Array<{ id: OrgBandId; label: string; level: number }> = [
  { id: 'principal', label: 'Principal', level: 1 },
  { id: 'vice-principal', label: 'Vice Principal', level: 2 },
  { id: 'pgt', label: 'PGT', level: 3 },
  { id: 'tgt', label: 'TGT', level: 4 },
  { id: 'prt', label: 'PRT', level: 5 },
  { id: 'sports-coach', label: 'Sports Coach', level: 5 },
  { id: 'admin', label: 'Admin Staff', level: 6 },
  { id: 'class-iv', label: 'Class IV', level: 7 },
  { id: 'drivers', label: 'Drivers', level: 7 },
  { id: 'conductors', label: 'Conductors', level: 7 },
  { id: 'security', label: 'Security', level: 7 },
  { id: 'other', label: 'Other Staff', level: 8 },
]

export const getOrgBandId = (staff: Teacher): OrgBandId => {
  const designation = normalize(staff.designation)
  if (designation.includes('vice principal') || designation.includes('vice-principal')) return 'vice-principal'
  if (designation === 'principal' || designation.includes('principal')) return 'principal'
  const code = getDesignationCode(staff)
  if (code === 'PGT') return 'pgt'
  if (code === 'TGT') return 'tgt'
  if (code === 'PRT') return 'prt'
  if (isSportsCoach(staff)) return 'sports-coach'
  if (isAdminStaff(staff)) return 'admin'
  if (isDriver(staff)) return 'drivers'
  if (isConductor(staff)) return 'conductors'
  if (isSecurityStaff(staff)) return 'security'
  if (isClassIvStaff(staff)) return 'class-iv'
  return 'other'
}
