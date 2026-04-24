import api from './api'

export type ExmclCircularStatus = 'draft' | 'published'

export interface ExmclCircular {
  _id: string
  title: string
  content: string
  circularDate: string
  referenceSeries?: string
  referenceNumber: string
  status: ExmclCircularStatus
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

const getAll = async (): Promise<ExmclCircular[]> => {
  const response = await api.get('/exam-circulars')
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

type CreateCircularPayload = Pick<ExmclCircular, 'title' | 'content' | 'circularDate' | 'referenceNumber'> & {
  referenceSeries?: string
}

type UpdateCircularPayload = Partial<Pick<ExmclCircular, 'title' | 'content' | 'circularDate' | 'referenceSeries' | 'referenceNumber'>>

const create = async (payload: CreateCircularPayload): Promise<ExmclCircular> => {
  const response = await api.post('/exam-circulars', payload)
  return response?.data?.data as ExmclCircular
}

const update = async (id: string, payload: UpdateCircularPayload): Promise<ExmclCircular> => {
  const response = await api.put(`/exam-circulars/${id}`, payload)
  return response?.data?.data as ExmclCircular
}

const publish = async (id: string): Promise<ExmclCircular> => {
  const response = await api.post(`/exam-circulars/${id}/publish`)
  return response?.data?.data as ExmclCircular
}

const remove = async (id: string): Promise<void> => {
  await api.delete(`/exam-circulars/${id}`)
}

const exmclCircularService = {
  getAll,
  create,
  update,
  publish,
  remove,
}

export default exmclCircularService
