import api from './api'

export type AlumniProfile = {
  _id: string
  studentId?: string
  name: string
  rollNumber?: string
  classRollNo?: number | null
  section?: string
  gender?: string
  email?: string
  phone?: string
  fatherName?: string
  motherName?: string
  dateOfBirth?: string | null
  profileImage?: string | null
  batchSession: string
  passedOutClass?: string
  currentCity?: string
  higherEducation?: string
  occupation?: string
}

export type AlumniDirectoryResponse = {
  records: AlumniProfile[]
  batches: string[]
  sections: string[]
  total: number
  currentSession?: string
  sync?: { added: number; skipped: number; batches: string[] }
}

const getAlumni = async (params?: { search?: string; batchSession?: string; section?: string }) => {
  const response = await api.get('/almni', { params })
  return (response?.data?.data || { records: [], batches: [], sections: [], total: 0 }) as AlumniDirectoryResponse
}

const syncAlumni = async () => {
  const response = await api.post('/almni/sync')
  return response?.data
}

const almniService = {
  getAlumni,
  syncAlumni,
}

export default almniService
