import cntrIcon from '../assets/CNTR.png'
import exmclIcon from '../assets/EXMCL.png'
import tmtblIcon from '../assets/TMTBL.png'
import stdntIcon from '../assets/STDNT.png'
import staafIcon from '../assets/STAFF.png'
import attndIcon from '../assets/ATTND.png'
import trnstIcon from '../assets/TRNST.png'
import acdmcIcon from '../assets/ACDMC.png'
import actvtIcon from '../assets/ACTVT.png'

export type ModuleId = 'cntr' | 'exmcl' | 'timetable' | 'stdnt' | 'staaf' | 'attnd' | 'trnst' | 'acdmc' | 'actvt'

export type ModuleDefinition = {
  id: ModuleId
  abbreviation: string
  title: string
  defaultRoute: string
  icon: string
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'stdnt',
    abbreviation: 'STDNT',
    title: 'Student Management',
    defaultRoute: '/stdnt/stdntboard',
    icon: stdntIcon,
  },
  {
    id: 'staaf',
    abbreviation: 'STAAF',
    title: 'Human Resource Management',
    defaultRoute: '/staaf/overview',
    icon: staafIcon,
  },
  {
    id: 'attnd',
    abbreviation: 'ATTND',
    title: 'Attendance Management',
    defaultRoute: '/attnd/attndboard',
    icon: attndIcon,
  },
  {
    id: 'acdmc',
    abbreviation: 'ACDMC',
    title: 'Academics',
    defaultRoute: '/acdmc/lesson-plan',
    icon: acdmcIcon,
  },
  {
    id: 'timetable',
    abbreviation: 'TMTBL',
    title: 'Timetable Management',
    defaultRoute: '/school-hub',
    icon: tmtblIcon,
  },
  {
    id: 'actvt',
    abbreviation: 'ACTVT',
    title: 'Activities',
    defaultRoute: '/actvt/houses',
    icon: actvtIcon,
  },
  {
    id: 'trnst',
    abbreviation: 'TRNST',
    title: 'School Transport',
    defaultRoute: '/trnst',
    icon: trnstIcon,
  },
  {
    id: 'exmcl',
    abbreviation: 'EXMCL',
    title: 'Internal Exams',
    defaultRoute: '/exmcl/centre-details',
    icon: exmclIcon,
  },
  {
    id: 'cntr',
    abbreviation: 'CNTR',
    title: 'Exam Centre Control',
    defaultRoute: '/dashboard',
    icon: cntrIcon,
  },
]
