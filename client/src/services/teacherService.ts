import api from './api'

export interface Teacher {
  _id: string
  id?: string
  name: string
  oasisId?: string
  employeeId: string
  designation: string
  gender?: string
  subjects: (string | { _id: string; name: string; code: string; class?: string })[]
  subjectCode?: string
  schoolName?: string
  schoolCode?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  mobileNo?: string
  department?: string
  email?: string
  phone?: string
  experience?: number
  qualification?: string
  dateOfJoining?: string
  dateOfBirth?: string
  isActive: boolean
  profileImage?: string
  address?: {
    street?: string
    city?: string
    state?: string
    pincode?: string
  }
  emergencyContact?: {
    name?: string
    phone?: string
    relation?: string
  }
  notes?: string
  dutyType?: string
  dutyHistory?: string[]
  supervisionHistory?: Array<{
    examDate: string
    roomNo: string
    rollNumbers: string[]
  }>
  createdAt?: string
  updatedAt?: string
  status?: 'active' | 'inactive'
  avatar?: string
}

export interface FetchTeachersParams {
  page?: number
  limit?: number
  search?: string
  department?: string
  subject?: string
  schoolCode?: string
  designation?: string
  dutyType?: string
  isActive?: boolean
  includeDutyTypeAssigned?: boolean
  includeAllRecords?: boolean
  sort?: string
  joiningDateFrom?: string
  joiningDateTo?: string
  minExperience?: number
}

export interface PaginatedTeachersResponse {
  items: Teacher[]
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export interface TeacherExportFilters {
  search?: string
  department?: string
  status?: 'active' | 'inactive' | 'all'
  schoolCode?: string
  subject?: string
  designation?: string
  joiningDateFrom?: string
  joiningDateTo?: string
  minExperience?: string
}

function parseTeachersResponse(res: any): PaginatedTeachersResponse {
  const body = res.data ?? res
  const inner = body.data // { data: teachers[], pagination } or array
  const list = Array.isArray(inner) ? inner : inner?.data ?? inner ?? []
  const paginationData = body.pagination ?? inner?.pagination

  return {
    items: list,
    currentPage: paginationData?.currentPage ?? 1,
    totalPages: paginationData?.totalPages ?? 1,
    totalItems: paginationData?.totalCount ?? paginationData?.totalItems ?? list.length,
    itemsPerPage: paginationData?.limit ?? paginationData?.itemsPerPage ?? 50,
  }
}

const getAll = (params?: FetchTeachersParams) => {
  return api.get('/teachers', { params }).then(parseTeachersResponse)
}

const getById = (id: string) => {
  return api.get(`/teachers/${id}`)
}

const create = (data: Omit<Teacher, '_id' | 'id'>) => {
  return api.post('/teachers', data)
}

const update = (id: string, data: Partial<Teacher>) => {
  return api.put(`/teachers/${id}`, data)
}

const deleteById = (id: string, permanent = false) => {
  return api.delete(`/teachers/${id}`, {
    params: permanent ? { permanent: true } : undefined,
  })
}

const getNextEmployeeId = () => {
  return api.get('/teachers/next-employee-id')
}

const toExportParams = (filters: TeacherExportFilters, exportAll = false) => {
  if (exportAll) return {}

  const params: Record<string, string> = {}
  if (filters.search) params.search = filters.search
  if (filters.department && filters.department !== 'all') params.department = filters.department
  if (filters.schoolCode) params.schoolCode = filters.schoolCode
  if (filters.subject) params.subject = filters.subject
  if (filters.designation) params.designation = filters.designation
  if (filters.status && filters.status !== 'all') {
    params.isActive = filters.status === 'active' ? 'true' : 'false'
  }
  if (filters.joiningDateFrom) params.joiningDateFrom = filters.joiningDateFrom
  if (filters.joiningDateTo) params.joiningDateTo = filters.joiningDateTo
  if (filters.minExperience) params.minExperience = filters.minExperience
  return params
}

const getExportPreview = async (filters: TeacherExportFilters) => {
  const response = await api.get('/export/teachers/preview', {
    params: toExportParams(filters, false),
  })
  return response?.data?.data ?? { total: 0, filtered: 0 }
}

const exportTeachersCsv = async (filters: TeacherExportFilters, exportAll: boolean): Promise<Blob> => {
  const response = await api.get('/export/teachers', {
    params: toExportParams(filters, exportAll),
    responseType: 'blob',
  })
  return response.data
}

const downloadImportTemplate = async (format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> => {
  const response = await api.get('/teachers/import-template', {
    params: { format },
    responseType: 'blob',
  })
  return response.data
}

const uploadImportTemplate = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/teachers/import-template/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

const teacherService = {
  getAll,
  getById,
  create,
  update,
  deleteById,
  getNextEmployeeId,
  getExportPreview,
  exportTeachersCsv,
  downloadImportTemplate,
  uploadImportTemplate,
}

export default teacherService
