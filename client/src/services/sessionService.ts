import api from './api'

export interface AcademicSessionInfo {
  _id: string | null
  label: string
  startYear: number
  endYear: number
  isCurrent: boolean
  exists: boolean
  status: string | null
}

export interface SessionListResponse {
  success: boolean
  data: AcademicSessionInfo[]
  meta: { currentLabel: string }
}

export interface CarryForwardSummary {
  [modelName: string]: { copied: number; skipped: number }
}

const sessionService = {
  /**
   * Get all existing sessions for the current tenant.
   */
  async getSessions(): Promise<SessionListResponse> {
    const response = await api.get('/sessions')
    return response.data
  },

  /**
   * Get all available sessions (calendar-generated, merged with existing).
   */
  async getAvailableSessions(): Promise<SessionListResponse> {
    const response = await api.get('/sessions/available')
    return response.data
  },

  /**
   * Create/ensure a session exists.
   */
  async createSession(label: string) {
    const response = await api.post('/sessions', { label })
    return response.data
  },

  /**
   * Carry forward data from sourceLabel to targetLabel.
   */
  async carryForward(targetLabel: string, sourceLabel: string): Promise<{ success: boolean; data: CarryForwardSummary }> {
    const response = await api.post(`/sessions/${targetLabel}/carry-forward`, { sourceLabel })
    return response.data
  },
}

export default sessionService
