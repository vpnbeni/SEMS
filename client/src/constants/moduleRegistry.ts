export type ModuleId = 'cntr' | 'exmcl' | 'timetable' | 'stdnt' | 'staaf'

export type ModuleDefinition = {
  id: ModuleId
  abbreviation: string
  title: string
  defaultRoute: string
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'cntr',
    abbreviation: 'Cntr',
    title: 'Exam Centre Control',
    defaultRoute: '/dashboard',
  },
  {
    id: 'exmcl',
    abbreviation: 'ExmCl',
    title: 'Internal Exams',
    defaultRoute: '/exmcl/centre-details',
  },
  {
    id: 'timetable',
    abbreviation: 'Tmtbl',
    title: 'Timetable Management',
    defaultRoute: '/school-hub',
  },
  {
    id: 'stdnt',
    abbreviation: 'Stdnt',
    title: 'Student Management',
    defaultRoute: '/stdnt/student-info',
  },
  {
    id: 'staaf',
    abbreviation: 'STAAF',
    title: 'Staff Management',
    defaultRoute: '/staaf/staff-members',
  },
]
