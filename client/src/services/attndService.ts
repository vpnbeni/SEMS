import api from './api'

export type AttendanceStatus = 'P' | 'A'

export type StaffDirectoryItem = {
  _id: string
  name: string
  employeeId?: string
  designation?: string
  isActive?: boolean
}

export type StudentDirectoryItem = {
  _id: string
  name: string
  rollNumber?: string
  class: string
  section: string
  isActive?: boolean
}

export type StaffAttendanceRecord = {
  staffId: string
  attendanceDate: string
}

export type StudentAttendanceRecord = {
  studentId: string
  attendanceDate: string
}

export type StudentClassOption = {
  className: string
  sections: string[]
}

const getStaffDirectory = async (): Promise<StaffDirectoryItem[]> => {
  const response = await api.get('/attnd/staff-directory')
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

const getStudentFilters = async (): Promise<StudentClassOption[]> => {
  const response = await api.get('/attnd/student-filters')
  return Array.isArray(response?.data?.data?.classOptions) ? response.data.data.classOptions : []
}

const getStudentDirectory = async (className: string, section: string): Promise<StudentDirectoryItem[]> => {
  const response = await api.get('/attnd/student-directory', { params: { className, section } })
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

const getStaffAttendance = async (
  month: string
): Promise<Array<{ staffId: string; attendanceDate: string; status: AttendanceStatus; remarks?: string }>> => {
  const response = await api.get('/attnd/staff', { params: { month } })
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

const saveStaffAttendance = async (month: string, absences: StaffAttendanceRecord[]) => {
  return api.put('/attnd/staff', { month, absences })
}

const getStudentAttendance = async (
  month: string,
  className: string,
  section: string
): Promise<Array<{ studentId: string; attendanceDate: string; status: AttendanceStatus; remarks?: string }>> => {
  const response = await api.get('/attnd/students', { params: { month, className, section } })
  return Array.isArray(response?.data?.data) ? response.data.data : []
}

const saveStudentAttendance = async (
  month: string,
  className: string,
  section: string,
  absences: StudentAttendanceRecord[]
) => {
  return api.put('/attnd/students', { month, className, section, absences })
}

const attndService = {
  getStaffDirectory,
  getStudentFilters,
  getStudentDirectory,
  getStaffAttendance,
  saveStaffAttendance,
  getStudentAttendance,
  saveStudentAttendance,
}

export default attndService
