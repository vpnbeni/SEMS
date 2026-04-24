import api from './api'

export interface ExmclExamDefinition {
  _id: string
  name: string
  code: string
  duration?: string
  maximumMarks?: number
  displayOrder: number
  createdAt: string
  updatedAt: string
}

type ExamPayload = Pick<ExmclExamDefinition, 'name' | 'code' | 'displayOrder' | 'duration' | 'maximumMarks'>

const getAll = async (): Promise<ExmclExamDefinition[]> => {
  const response = await api.get('/exam-definitions')
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

const create = async (payload: ExamPayload): Promise<ExmclExamDefinition> => {
  const response = await api.post('/exam-definitions', payload)
  return response?.data?.data as ExmclExamDefinition
}

const update = async (id: string, payload: Partial<ExamPayload>): Promise<ExmclExamDefinition> => {
  const response = await api.put(`/exam-definitions/${id}`, payload)
  return response?.data?.data as ExmclExamDefinition
}

const remove = async (id: string): Promise<void> => {
  await api.delete(`/exam-definitions/${id}`)
}

const exmclExamService = {
  getAll,
  create,
  update,
  remove,
}

export default exmclExamService
