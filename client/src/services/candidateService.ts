import api from './api'
import type { CandidateStats } from '../types/candidate'

export interface CandidateListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  class?: string
  schoolCode?: string
  schoolName?: string
  subjectCode?: string
  category?: string
  pwd?: string
  medium?: string
}

export interface CandidateListResponse {
  data: any[]
  page: number
  pages: number
  total: number
  limit: number
}

interface CandidateData {
  name: string
  rollNumber: string
  email?: string
  phone?: string
  course?: string
  semester?: number
  batch?: string
  department?: string
  status?: 'active' | 'inactive' | 'graduated' | 'suspended'
  admissionDate?: string
  subjects?: string[]
}

function parseListResponse(res: any): CandidateListResponse {
  const body = res.data ?? res
  const data = body.data ?? []
  const limit = parseInt(body.limit, 10) || 50
  return {
    data,
    page: body.page ?? 1,
    pages: body.pages ?? 1,
    total: body.total ?? 0,
    limit,
  }
}

class CandidateService {
  /** Get candidates with params object (for TanStack Query). Returns normalized { data, page, pages, total, limit }. */
  async getCandidatesWithParams(params?: CandidateListParams): Promise<CandidateListResponse> {
    const res = await api.get('/candidates', { params })
    return parseListResponse(res)
  }

  // Get all candidates with optional query string (legacy)
  async getCandidates(queryString?: string) {
    const url = queryString ? `/candidates?${queryString}` : '/candidates'
    return api.get(url)
  }

  // Get single candidate by ID
  async getCandidate(id: string) {
    return api.get(`/candidates/${id}`)
  }

  /** Get answer sheet serial numbers for candidate's subjects (slow; call after page load). */
  async getCandidateSubjectSerials(id: string): Promise<{ subjectId: string; serialNumber: string | null }[]> {
    const res = await api.get(`/candidates/${id}/subject-serials`)
    const data = res.data?.data ?? res.data
    return data?.serials ?? []
  }

  // Create new candidate
  async createCandidate(data: CandidateData) {
    return api.post('/candidates', data)
  }

  // Update candidate
  async updateCandidate(id: string, data: Partial<CandidateData>) {
    return api.put(`/candidates/${id}`, data)
  }

  // Delete candidate
  async deleteCandidate(id: string) {
    return api.delete(`/candidates/${id}`)
  }

  // Import candidates from PDF
  async importFromPDF(file: File) {
    const formData = new FormData()
    formData.append('pdf', file)

    return api.post('/candidates/import', formData, {
      timeout: 300000, // 5 minutes for PDF processing
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  /** Get candidate statistics. Returns CandidateStats. Supports same filter params as getCandidates. */
  async getStats(params?: Partial<CandidateListParams>): Promise<CandidateStats> {
    const res = await api.get('/candidates/stats', { params })
    const body = res.data ?? res
    return body?.data ?? body
  }

  // Search candidates
  async searchCandidates(query: string) {
    return api.get(`/candidates?search=${encodeURIComponent(query)}`)
  }

  // Get candidates by course
  async getCandidatesByCourse(course: string, semester?: number) {
    const url = semester 
      ? `/candidates?course=${encodeURIComponent(course)}&semester=${semester}`
      : `/candidates?course=${encodeURIComponent(course)}`
    return api.get(url)
  }

  // Get candidates by department
  async getCandidatesByDepartment(department: string) {
    return api.get(`/candidates?department=${encodeURIComponent(department)}`)
  }

  // Get candidates by status
  async getCandidatesByStatus(status: string) {
    return api.get(`/candidates?status=${status}`)
  }

  // Bulk update candidates
  async bulkUpdateCandidates(ids: string[], updates: Partial<CandidateData>) {
    return api.patch('/candidates/bulk', { ids, updates })
  }

  // Export candidates to CSV
  async exportToCsv(filters?: Record<string, any>) {
    const queryString = filters
      ? new URLSearchParams(filters).toString()
      : ''
    const url = queryString ? `/candidates/export?${queryString}` : '/candidates/export'

    return api.get(url, {
      responseType: 'blob',
    })
  }

  // Remove a subject code from all candidates of a given class
  async removeSubjectCode(subjectCode: string, classLevel: string, cascadeCleanup = false) {
    return api.delete('/candidates/subject-code', {
      data: { subjectCode, class: classLevel, cascadeCleanup },
    })
  }

  // Reimport: dry-run compare PDF against existing candidates
  async reimportCompare(file: File) {
    const formData = new FormData()
    formData.append('pdf', file)
    return api.post('/candidates/reimport-compare', formData, {
      timeout: 300000,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  // Reimport: check impact of proposed changes
  async reimportImpact(changes: ReimportChange[]) {
    return api.post('/candidates/reimport-impact', { changes })
  }

  // Reimport: apply selected fixes
  async reimportApply(changes: ReimportChange[]) {
    return api.post('/candidates/reimport-apply', { changes })
  }
}

export interface SubjectChange {
  code: string
  medium?: string
}

export interface CandidateDiff {
  rollNumber: string
  candidateName: string
  dbCandidateId: string
  class: string
  type: 'subject_mismatch' | 'field_mismatch' | 'both'
  subjectChanges: {
    added: SubjectChange[]
    removed: SubjectChange[]
    unchanged: SubjectChange[]
  }
  fieldChanges: Record<string, { db: string; pdf: string }>
}

export interface ComparisonResult {
  parseStats: {
    totalParsed: number
    totalInDb: number
    matchedCount: number
    pdfClass: string
  }
  differences: CandidateDiff[]
  newCandidates: Array<{
    rollNumber: string
    name: string
    class: string
    schoolCode: string
    schoolName: string
    subjectCodes: Array<{ code: string; medium: string }>
  }>
  missingFromPdf: Array<{
    rollNumber: string
    name: string
    class: string
    dbCandidateId: string
  }>
}

export interface ImpactItem {
  rollNumber: string
  subjectCode: string
  action: string
  seatingPlanAllocations: number
  form66Records: number
  answerSheetLinks: number
  severity: 'none' | 'low' | 'high'
}

export interface ImpactResult {
  impacts: ImpactItem[]
  summary: {
    totalSeatingAllocationsAffected: number
    totalForm66Affected: number
    totalAnswerSheetsAffected: number
    overallSeverity: 'none' | 'low' | 'high'
  }
}

export interface ReimportChange {
  rollNumber: string
  action: 'remove_subjects' | 'add_subjects'
  subjectCodes: string[]
  cascadeCleanup?: boolean
}

export default new CandidateService()