export interface PlatformAdmin {
  _id: string
  email: string
  name: string
  isActive: boolean
}

export interface Tenant {
  _id: string
  slug: string
  name: string
  dbName: string
  adminEmail: string
  status: 'active' | 'suspended'
  createdAt: string
  updatedAt?: string
}

export interface TenantListResponse {
  items: Tenant[]
  total: number
  page: number
  pages: number
  limit: number
}

export interface MasterSubject {
  _id: string
  name: string
  code: string
  class: '10th' | '12th'
  duration: 2 | 3
  answerSheet: 'none' | '32_pages' | '20_pages' | '40_graph'
  boardCode: string
  isTheorySubject: boolean
  isPracticalSubject: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SubjectStats {
  total: number
  class10th: number
  class12th: number
}

export interface MasterSubjectListResult extends SubjectStats {
  subjects: MasterSubject[]
}

export interface DatesheetEntry {
  examDate: string
  dayName: string
  subject: {
    code: string
    name: string
    class: '10th' | '12th'
    duration: number
  }
  timeSlot: {
    start: string
    end: string
  }
  answerSheet: '32_pages' | '20_pages' | '40_graph'
  isOptional: boolean
}

export interface MasterCBSEDatesheet {
  _id: string
  title: string
  academicYear: string
  totalEntries: number
  dateRange: {
    startDate: string
    endDate: string
  }
  statistics: {
    total: number
    class10th: number
    class12th: number
    uniqueDates: number
    uniqueSubjects: number
  }
  entries: DatesheetEntry[]
  isActive: boolean
  cloudinaryUrl?: string
  cloudinaryPublicId?: string
  createdAt: string
  updatedAt?: string
}

export interface GuidelineChapter {
  number: string
  title: string
  description?: string
}

export interface GuidelineAppendix {
  letter: string
  title: string
  subtitle?: string
}

export interface GuidelineItem {
  number: string
  text: string
}

export interface MasterGuideline {
  _id: string
  title: string
  academicYear: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  metadata: {
    pages?: number
    fileSize?: number
    totalCharacters?: number
  }
  parsedStructure: {
    chapters: GuidelineChapter[]
    appendices: GuidelineAppendix[]
    guidelines: GuidelineItem[]
    headings: string[]
  }
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface MasterUndertaking {
  _id: string
  title: string
  academicYear: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  metadata: {
    pages?: number
    fileSize?: number
  }
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export type RolloutModule = 'subjects' | 'datesheet' | 'guidelines' | 'undertaking'
export type RolloutStatus = 'in_progress' | 'completed' | 'partial_failure'

export interface TenantRolloutStatus {
  tenantId: string
  tenantSlug: string
  status: 'pending' | 'success' | 'failed'
  error?: string
  recordsAffected?: number
  startedAt?: string
  completedAt?: string
}

export interface DataRollout {
  _id: string
  module: RolloutModule
  versionLabel: string
  masterDataId: string
  status: RolloutStatus
  summary: {
    totalTenants: number
    successCount: number
    failureCount: number
  }
  tenantStatuses: TenantRolloutStatus[]
  initiatedAt: string
  completedAt?: string
}

export interface UploadResult<TData = unknown> {
  success: boolean
  message: string
  data?: TData
  errors?: Array<{ row?: number; message: string }>
}
