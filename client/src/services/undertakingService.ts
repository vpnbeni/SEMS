import { downloadFile } from './api'
import api from './api'

export interface UndertakingRecord {
  _id: string
  title: string
  academicYear: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  metadata?: {
    pages?: number
    fileSize?: number
  }
  rolledOutAt?: string
  createdAt?: string
  updatedAt?: string
}

const getCurrent = async (): Promise<UndertakingRecord | null> => {
  const response = await api.get('/undertakings/current')
  return response.data?.data ?? null
}

const downloadCurrent = async (): Promise<void> => {
  await downloadFile('/undertakings/download', 'undertaking-form.pdf')
}

const undertakingService = {
  getCurrent,
  downloadCurrent,
}

export default undertakingService
