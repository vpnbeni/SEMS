import api from './api'

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

class CandidateService {
  // Get all candidates with optional query parameters
  async getCandidates(queryString?: string) {
    const url = queryString ? `/candidates?${queryString}` : '/candidates'
    return api.get(url)
  }

  // Get single candidate by ID
  async getCandidate(id: string) {
    return api.get(`/candidates/${id}`)
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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for PDF processing
    })
  }

  // Get candidate statistics
  async getStats() {
    return api.get('/candidates/stats')
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
}

export default new CandidateService()