import api, { uploadFile } from './api'

const importFromPDF = (file: File) => {
  return uploadFile('/subjects/import-pdf', file)
}

export interface SubjectListParams {
  page?: number
  limit?: number
}

const getAll = (params?: SubjectListParams) => {
  return api.get('/subjects', { params })
}

const subjectService = {
  importFromPDF,
  getAll,
}

export default subjectService


