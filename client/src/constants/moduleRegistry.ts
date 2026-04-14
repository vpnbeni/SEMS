export type ModuleId = 'cntr' | 'timetable'

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
    id: 'timetable',
    abbreviation: 'Tmtbl',
    title: 'Timetable Management',
    defaultRoute: '/school-hub',
  },
]
