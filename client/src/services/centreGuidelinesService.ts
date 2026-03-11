import api from './api'

export interface GuidelinesCheckResponse {
  exists: boolean
  path?: string
}

export interface GuidelinesSearchResult {
  text: string
  index: number
}

const check = async (): Promise<GuidelinesCheckResponse> => {
  const response = await api.get('/guidelines/check')
  return response.data
}

const parse = async () => {
  const response = await api.get('/guidelines/parse')
  return response.data?.data ?? null
}

const upload = async (file: File) => {
  const formData = new FormData()
  formData.append('pdf', file)
  const response = await api.post('/guidelines/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

const search = async (query: string): Promise<GuidelinesSearchResult[]> => {
  const response = await api.get('/guidelines/search', {
    params: { query },
  })
  return Array.isArray(response?.data?.results) ? response.data.results : []
}

const getFileBlob = async (): Promise<Blob> => {
  const response = await api.get('/guidelines/file', { responseType: 'blob' })
  return response.data
}

const centreGuidelinesService = {
  check,
  parse,
  upload,
  search,
  getFileBlob,
}

export default centreGuidelinesService
