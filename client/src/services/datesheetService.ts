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
}

export default datesheetService


