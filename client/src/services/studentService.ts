import api from './api'

const downloadImportTemplate = async (format: 'csv' | 'xlsx' = 'xlsx'): Promise<Blob> => {
  const response = await api.get('/students/import-template', {
    params: { format },
    responseType: 'blob',
  })
  return response.data
}

const uploadImportTemplate = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/students/import-template/upload', formData, {
    timeout: 300000, // 5 minutes for bulk import processing
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

const studentService = {
  downloadImportTemplate,
  uploadImportTemplate,
}

export default studentService
