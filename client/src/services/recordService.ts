import api from './api'

export const makeRecordService = (basePath: string) => ({
  list: async () => {
    const response = await api.get(basePath)
    return (response.data.data || []) as Array<Record<string, any>>
  },
  save: async (payload: Record<string, any>, id?: string) => {
    if (id) return api.put(`${basePath}/${id}`, payload)
    return api.post(basePath, payload)
  },
  remove: async (id: string) => api.delete(`${basePath}/${id}`),
})
