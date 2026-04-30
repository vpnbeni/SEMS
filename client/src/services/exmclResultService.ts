import api from './api'

export interface ResultEntry {
  studentId: string
  marks: Record<string, number>
}

export interface BulkSavePayload {
  examId: string
  class: string
  section: string
  results: ResultEntry[]
}

const getResults = async (examId: string, className: string, section: string): Promise<ResultEntry[]> => {
  const response = await api.get('/exam-results', {
    params: { examId, class: className, section },
  })
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

const saveResults = async (payload: BulkSavePayload): Promise<void> => {
  await api.post('/exam-results/bulk', payload)
}

const exmclResultService = { getResults, saveResults }

export default exmclResultService
