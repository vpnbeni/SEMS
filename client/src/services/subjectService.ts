import api, { uploadFile } from './api'

const importFromPDF = (file: File) => {
  return uploadFile('/subjects/import-pdf', file)
}

export interface SubjectListParams {
  page?: number
  limit?: number
  search?: string
  class?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SubjectListResponse {
  data: any[]
  page: number
  pages: number
  total: number
  limit: number
}

export interface SubjectStats {
  total: number
  class10th: number
  class12th: number
}

function parseListResponse(res: any): SubjectListResponse {
  const body = res.data ?? res
  const list = body.data ?? []
  const meta = body.meta ?? body.pagination ?? {}
  const limit = meta.limit ?? 50
  return {
    data: list,
    page: meta.currentPage ?? 1,
    pages: meta.totalPages ?? 1,
    total: meta.totalCount ?? 0,
    limit,
  }
}

const getAll = (params?: SubjectListParams) => {
  return api.get('/subjects', { params })
}

/** Get subjects with params; returns normalized list response for TanStack Query. */
const getAllWithParams = async (params?: SubjectListParams): Promise<SubjectListResponse> => {
  const res = await api.get('/subjects', { params })
  return parseListResponse(res)
}

const getById = (id: string) => api.get(`/subjects/${id}`)

const getStats = async (): Promise<SubjectStats> => {
  const res = await api.get('/subjects/stats')
  const body = res.data ?? res
  const data = body?.data ?? body
  return data ?? { total: 0, class10th: 0, class12th: 0 }
}

const create = (data: any) => api.post('/subjects', data)

const update = (id: string, data: any) => api.put(`/subjects/${id}`, data)

const deleteById = (id: string) => api.delete(`/subjects/${id}`)

const deleteAll = () => api.delete('/subjects')

const subjectService = {
  importFromPDF,
  getAll,
  getAllWithParams,
  getById,
  getStats,
  create,
  update,
  deleteById,
  deleteAll,
}

export default subjectService


