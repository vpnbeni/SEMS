import api, { uploadFile } from './api'

export interface AbsenteeRecord {
  candidateId: string
  examDate: string
  subjectCode: string
}

export interface SaveAbsenteeRecord {
  candidateId: string
  examDate: string
  subjectCode: string
  class: string
  isAbsent: boolean
}

const getAbsentees = async (): Promise<AbsenteeRecord[]> => {
  const response = await api.get('/attendance/absentees')
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

const saveAbsentees = async (absentees: SaveAbsenteeRecord[]) => {
  const response = await api.post('/attendance/absentees', { absentees })
  return response.data
}

const uploadAttendanceSheet = async (file: File, classValue: string) => {
  return uploadFile('/attendance/upload', file, { class: classValue })
}

const downloadAbsenteeReport = async (classValue: string): Promise<Blob> => {
  const response = await api.get<Blob>('/attendance/absentees/report/download', {
    params: { class: classValue },
    responseType: 'blob',
    timeout: 180000,
  })
  return response.data
}

const attendanceService = {
  getAbsentees,
  saveAbsentees,
  uploadAttendanceSheet,
  downloadAbsenteeReport,
}

export default attendanceService
