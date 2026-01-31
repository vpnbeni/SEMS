import api, { uploadFile } from './api'

const importFromPDF = (file: File) => {
  // Use shared API instance so auth headers/baseURL apply
  return uploadFile('/datesheets/import-pdf', file)
}

const create = (data: any) => {
  return api.post('/datesheets', data)
}

const getAll = (params?: any) => {
  return api.get('/datesheets', { params })
}

export interface CBSEDatesheetParams {
  page?: number
  limit?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CentreDatesheetParams {
  page?: number
  limit?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

const getCBSEDatesheet = (params?: CBSEDatesheetParams) => {
  return api.get('/datesheets/cbse-full', { params })
}

const getCentreDatesheet = (params?: CentreDatesheetParams) => {
  return api.get('/datesheets/centre-datesheet', { params })
}

export interface DatesheetStats {
  fullDatesheet: number
  fullDatesheetDays: number
  centre: number
  centreDays: number
  centreCandidates: number
  centre10th: number
  centre10thDays: number
  centre10thCandidates: number
  centre12th: number
  centre12thDays: number
  centre12thCandidates: number
}

const getStats = () => {
  return api.get('/datesheets/stats')
}

const getById = (id: string) => {
  return api.get(`/datesheets/${id}`)
}

const update = (id: string, data: any) => {
  return api.put(`/datesheets/${id}`, data)
}

const deleteById = (id: string) => {
  return api.delete(`/datesheets/${id}`)
}

const publish = (id: string) => {
  return api.post(`/datesheets/${id}/publish`)
}

const datesheetService = {
  importFromPDF,
  create,
  getAll,
  getById,
  update,
  deleteById,
  publish,
  getCBSEDatesheet,
  getCentreDatesheet,
  getStats,
}

export default datesheetService


