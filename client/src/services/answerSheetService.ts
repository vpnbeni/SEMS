import api, { downloadFile } from './api'

export interface DiscardedSerial {
  serial: string
  reason: string
  discardedAt: string
}

export interface AnswerSheetSerialRange {
  serialFrom: string
  serialTo: string
}

export interface SupplementaryUsageRecord {
  _id: string
  centreDatesheetEntryId: string
  examDate: string
  subjectCode: string
  subjectName: string
  roomNo: string
  rollNo: string
  sheetNo?: string
  serials: string[]
  createdAt: string
}

export interface SupplementaryRoomOption {
  roomNo: string
  rollNos: string[]
}

export interface SupplementarySubjectContext {
  _id: string
  examDate: string
  dayName: string
  subjectCode: string
  subjectName: string
  class: string
  candidateCount: number
  roomOptions: SupplementaryRoomOption[]
  roomError?: string
  usages: SupplementaryUsageRecord[]
  usedCount: number
}

export interface SupplementaryUsageContextResponse {
  totalUsed: number
  availableCount: number
  discardedCount: number
  usedSerials: string[]
  subjects: SupplementarySubjectContext[]
}

export interface AnswerSheetEntry {
  _id?: string
  answerSheetType: string
  pages: number
  colour: string
  class: string
  suffix?: string
  series?: string
  serialRanges?: AnswerSheetSerialRange[]
  serialFrom: string
  serialTo: string
  total: number
  used: number
  discarded: number
  discardedSerials?: DiscardedSerial[]
  supplementaryUsages?: SupplementaryUsageRecord[]
  balance?: number
  sortOrder?: number
  receivedDate?: string
  exam?: string
  subject?: string
  notes?: string
  isActive?: boolean
  isTemplate?: boolean
  // Centre datesheet linking
  centreDatesheetEntry?: string
  linkedExamDate?: string
  linkedSubjectCode?: string
  linkedSubjectName?: string
  linkedCandidateCount?: number
}

export interface AnswerSheetTemplate {
  srNo: number
  answerSheetType: string
  pages: number
  colour: string
  class: string
  suffix: string
}

export interface AnswerSheetStats {
  summary: {
    totalReceived: number
    totalUsed: number
    totalDiscarded: number
    totalBalance: number
  }
  byType: Array<{
    _id: {
      type: string
      class: string
    }
    totalReceived: number
    totalUsed: number
    totalDiscarded: number
    totalBalance: number
    count: number
  }>
}

export interface DailySummaryEntry {
  answerSheetId: string
  answerSheetType: string
  pages: number
  colour: string
  serialFrom: string
  serialTo: string
  sheetsAllocated: number
  candidateCount: number
  subjectCode: string
  subjectName: string
  insufficientSheets: boolean
}

export interface DailySummaryClassData {
  entries: DailySummaryEntry[]
  totalAllocated: number
  totalDiscarded: number
  totalInventory: number
  serialFrom: string
  serialTo: string
}

export interface DailySummaryResponse {
  date: string
  classes: Record<string, DailySummaryClassData>
}

class AnswerSheetService {

  /**
   * Get all answer sheets
   */
  async getAnswerSheets(filters?: { type?: string; class?: string; status?: string }) {
    const params = new URLSearchParams()

    if (filters?.type) params.append('type', filters.type)
    if (filters?.class) params.append('class', filters.class)
    if (filters?.status) params.append('status', filters.status)

    const response = await api.get(`/answersheets?${params.toString()}`)
    return response.data
  }

  /**
   * Get answer sheet by ID
   */
  async getAnswerSheetById(id: string) {
    const response = await api.get(`/answersheets/${id}`)
    return response.data
  }

  /**
   * Create new answer sheet entry
   */
  async createAnswerSheet(data: Partial<AnswerSheetEntry>) {
    const response = await api.post('/answersheets', data)
    return response.data
  }

  /**
   * Update answer sheet
   */
  async updateAnswerSheet(id: string, data: Partial<AnswerSheetEntry>) {
    const response = await api.put(`/answersheets/${id}`, data)
    return response.data
  }

  /**
   * Delete answer sheet
   */
  async deleteAnswerSheet(id: string) {
    const response = await api.delete(`/answersheets/${id}`)
    return response.data
  }

  /**
   * Mark sheets as used
   */
  async useSheets(id: string, quantity: number, linkData?: {
    centreDatesheetEntryId?: string
    examDate?: string
    subjectCode?: string
    subjectName?: string
    candidateCount?: number
  }) {
    const response = await api.post(`/answersheets/${id}/use`, {
      quantity,
      ...linkData
    })
    return response.data
  }

  /**
   * Mark sheets as discarded
   */
  async discardSheets(id: string, quantity: number) {
    const response = await api.post(`/answersheets/${id}/discard`, { quantity })
    return response.data
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{ success: boolean; data: AnswerSheetStats }> {
    const response = await api.get('/answersheets/stats/summary')
    return response.data
  }

  /**
   * Parse template PDF
   */
  async parseTemplate() {
    const response = await api.get('/answersheets/parse/template')
    return response.data
  }

  /**
   * Download Excel template
   */
  async downloadTemplate() {
    const response = await api.get('/answersheets/template/download', {
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * Upload Excel file
   */
  async uploadExcel(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/answersheets/upload/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  /**
   * Get answer sheet details with related datesheet entries
   */
  async getAnswerSheetDetails(id: string) {
    const response = await api.get(`/answersheets/${id}/details`)
    return response.data
  }

  /**
   * Get serial number allocation by date
   */
  async getSerialAllocation(id: string) {
    const response = await api.get(`/answersheets/${id}/allocation`)
    return response.data
  }

  async getSupplementaryUsageContext(id: string): Promise<{ success: boolean; data: SupplementaryUsageContextResponse }> {
    const response = await api.get(`/answersheets/${id}/supplementary-context`)
    return response.data
  }

  async saveSupplementaryUsage(id: string, data: {
    centreDatesheetEntryId: string
    roomNo: string
    rollNo: string
    serials: string[]
  }): Promise<{ success: boolean; data: SupplementaryUsageContextResponse }> {
    const response = await api.post(`/answersheets/${id}/supplementary-usage`, data)
    return response.data
  }

  async removeSupplementaryUsage(
    id: string,
    usageId: string,
    sheetNo?: string
  ): Promise<{ success: boolean; data: SupplementaryUsageContextResponse }> {
    const serialQuery = sheetNo ? `?serial=${encodeURIComponent(sheetNo)}` : ''
    const response = await api.delete(`/answersheets/${id}/supplementary-usage/${usageId}${serialQuery}`)
    return response.data
  }

  /**
   * Download per-exam dispatch record PDF
   */
  async downloadDispatchRecord(
    answerSheetId: string,
    entryId: string,
    fallbackFilename = 'answer-sheet-dispatch-record.pdf'
  ): Promise<void> {
    await downloadFile(
      `/answersheets/${answerSheetId}/dispatch-record/${entryId}/download`,
      fallbackFilename
    )
  }

  /**
   * Get discarded serials for an answer sheet
   */
  async getDiscardedSerials(id: string) {
    const response = await api.get(`/answersheets/${id}/discarded`)
    return response.data
  }

  /**
   * Add discarded serial(s)
   */
  async addDiscardedSerials(id: string, data: {
    serials?: string | string[]
    fromSerial?: string
    toSerial?: string
    reason?: string
  }) {
    const response = await api.post(`/answersheets/${id}/discarded`, data)
    return response.data
  }

  /**
   * Remove a discarded serial
   */
  async removeDiscardedSerial(id: string, serial: string) {
    const response = await api.delete(`/answersheets/${id}/discarded/${serial}`)
    return response.data
  }

  /**
   * Get the current series value
   */
  async getSeries(): Promise<{ success: boolean; data: { series: string | null } }> {
    const response = await api.get('/answersheets/series')
    return response.data
  }

  /**
   * Bulk-update series on all active answer sheets
   */
  async updateSeries(series: string): Promise<{ success: boolean; data: { series: string | null; modifiedCount: number } }> {
    const response = await api.put('/answersheets/series', { series })
    return response.data
  }

  /**
   * Get daily answer-sheet allocation summary for a specific date
   */
  async getDailySummary(date: string): Promise<{ success: boolean; data: DailySummaryResponse }> {
    const response = await api.get(`/answersheets/daily-summary?date=${date}`)
    return response.data
  }
}

export default new AnswerSheetService()
