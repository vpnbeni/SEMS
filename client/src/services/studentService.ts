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

const bulkDeleteStudents = async (ids: string[]) => {
  const response = await api.post(
    '/students/bulk-delete',
    { ids },
    {
      timeout: 120000,
      _silent: true,
    } as any
  )
  return response.data
}

const studentService = {
  downloadImportTemplate,
  uploadImportTemplate,
  bulkDeleteStudents,
}

export default studentService
