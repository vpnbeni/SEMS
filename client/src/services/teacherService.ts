import api from './api'

export interface Teacher {
  _id: string
  id?: string
  name: string
  employeeId: string
  designation: string
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
  isActive?: boolean
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

const deleteById = (id: string) => {
  return api.delete(`/teachers/${id}`)
}

const getNextEmployeeId = () => {
  return api.get('/teachers/next-employee-id')
}

const teacherService = {
  getAll,
  getById,
  create,
  update,
  deleteById,
  getNextEmployeeId,
}

export default teacherService
