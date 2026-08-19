import type { FormatDefinition, FormatId } from './types'

export const FORMAT_REGISTRY: Record<FormatId, FormatDefinition> = {
  'award-list': {
    id: 'award-list',
    label: 'Award List',
    generatePath: '/exmcl/award-list',
    generateLabel: 'Generate award list',
    pageSizes: ['A4', 'legal'],
    defaultPageSize: 'A4',
    defaultOrientation: 'landscape',
    templates: [
      {
        id: 'landscape-default',
        label: 'Landscape marksheet',
        description: 'School header, class info row, student marks table, and signature row.',
      },
    ],
    mergeFields: ['{{school.name}}', '{{school.address}}', '{{exam.name}}', '{{class}}', '{{section}}'],
  },
  'admit-card': {
    id: 'admit-card',
    label: 'Admit Card',
    generatePath: '/exmcl/admit-cards',
    generateLabel: 'Generate admit cards',
    pageSizes: ['A4', 'legal'],
    defaultPageSize: 'A4',
    defaultOrientation: 'portrait',
    templates: [
      {
        id: 'portrait-default',
        label: 'CBSE-style admit card',
        description: 'Photo, student particulars, subject table, instructions, and signatures.',
      },
    ],
    mergeFields: ['{{school.name}}', '{{student.name}}', '{{exam.name}}', '{{rollNo}}'],
  },
  'report-card': {
    id: 'report-card',
    label: 'Report Card',
    generatePath: '/exmcl/report-card',
    generateLabel: 'Generate report cards',
    pageSizes: ['A4', 'legal', 'letter'],
    defaultPageSize: 'A4',
    defaultOrientation: 'portrait',
    templates: [
      {
        id: 'ib-portrait',
        label: 'IB-style portrait',
        description: 'School header with logos, student details, scholastic table, and signatures.',
      },
    ],
    mergeFields: ['{{school.name}}', '{{student.name}}', '{{exam.name}}', '{{class}}'],
  },
}

export const getFormatDefinition = (id: FormatId): FormatDefinition => FORMAT_REGISTRY[id]
