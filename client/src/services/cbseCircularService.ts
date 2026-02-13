import api from './api'

export interface CBSECircular {
  _id: string
  title: string
  circularNumber?: string
  publishDate: string
  sourceUrl?: string
  summary?: string
  createdAt?: string
}

const getAll = () => api.get('/cbse-circulars')
const create = (payload: {
  title: string
  circularNumber?: string
  publishDate: string
  sourceUrl?: string
  summary?: string
}) => api.post('/cbse-circulars', payload)
const deleteById = (id: string) => api.delete(`/cbse-circulars/${id}`)

export default {
  getAll,
  create,
  deleteById,
}
