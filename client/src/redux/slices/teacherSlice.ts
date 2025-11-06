import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface PaginatedResponse<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export interface Teacher {
  _id: string
  id?: string
  name: string
  employeeId: string
  department: string
  designation: string
  subjects: (string | { _id: string; name: string; code: string; class?: string })[]
  email: string
  phone: string
  experience: number
  qualification: string
  dateOfJoining: string
  dateOfBirth: string
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
  createdAt?: string
  updatedAt?: string
  // Computed fields for frontend compatibility
  status?: 'active' | 'inactive'
  avatar?: string
}

interface TeacherState {
  teachers: Teacher[] | null
  loading: boolean
  error: string | null
  selectedTeacher: Teacher | null
  showAddModal: boolean
  showEditModal: boolean
  showDeleteModal: boolean
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
  }
}

const initialState: TeacherState = {
  teachers: null,
  loading: false,
  error: null,
  selectedTeacher: null,
  showAddModal: false,
  showEditModal: false,
  showDeleteModal: false,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  }
}

// Async thunks for API calls
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

export const fetchTeachers = createAsyncThunk(
  'teachers/fetchTeachers',
  async (params: FetchTeachersParams = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination params
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      // Add filter params
      if (params.search) queryParams.append('search', params.search);
      if (params.department) queryParams.append('department', params.department);
      if (params.subject) queryParams.append('subject', params.subject);
      if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.joiningDateFrom) queryParams.append('joiningDateFrom', params.joiningDateFrom);
      if (params.joiningDateTo) queryParams.append('joiningDateTo', params.joiningDateTo);
      if (params.minExperience !== undefined) queryParams.append('minExperience', String(params.minExperience));

      const response = await api.get(`/teachers?${queryParams.toString()}`);
      console.log('API Response:', response.data.data);
      
      // Handle the case where response.data.data might be the paginated response itself
      const responseData = response.data.data.data || response.data;
      const paginationData = response.data.pagination;
       
      // If response.data.data is an array, it means the pagination data is in response.data.pagination
      if (Array.isArray(responseData)) {
        return {
          items: responseData,
          currentPage: paginationData?.currentPage || 1,
          totalPages: paginationData?.totalPages || 1,
          totalItems: paginationData?.totalCount || paginationData?.totalItems || responseData.length,
          itemsPerPage: paginationData?.limit || paginationData?.itemsPerPage || 10
        } as PaginatedResponse<Teacher>;
      }
      
      // If response.data.data has pagination structure
      return {
        items: responseData.items || responseData,
        currentPage: responseData.currentPage || paginationData?.currentPage || 1,
        totalPages: responseData.totalPages || paginationData?.totalPages || 1,
        totalItems: responseData.totalItems || responseData.totalCount || paginationData?.totalCount || (responseData.items || responseData).length,
        itemsPerPage: responseData.itemsPerPage || responseData.limit || paginationData?.limit || 10
      } as PaginatedResponse<Teacher>;
    } catch (error: any) {
      console.error('Fetch teachers error:', error);
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch teachers. Please try again later.'
      )
    }
  }
)

export const createTeacher = createAsyncThunk(
  'teachers/createTeacher',
  async (teacherData: Omit<Teacher, 'id'>, { rejectWithValue }) => {
    try {
      const response = await api.post('/teachers', teacherData)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to create teacher. Please check your input and try again.'
      )
    }
  }
)

export const updateTeacher = createAsyncThunk(
  'teachers/updateTeacher',
  async ({ id, ...teacherData }: Teacher, { rejectWithValue }) => {
    try {
      const response = await api.put(`/teachers/${id}`, teacherData)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to update teacher. Please check your input and try again.'
      )
    }
  }
)

export const deleteTeacher = createAsyncThunk(
  'teachers/deleteTeacher',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/teachers/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete teacher. Please try again later.'
      )
    }
  }
)

export const fetchNextEmployeeId = createAsyncThunk(
  'teachers/fetchNextEmployeeId',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/teachers/next-employee-id')
      return response.data.data.employeeId
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch next employee ID. Please try again later.'
      )
    }
  }
)

const teacherSlice = createSlice({
  name: 'teachers',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    setSelectedTeacher: (state, action) => {
      state.selectedTeacher = action.payload
    },
    showAddTeacherModal: (state) => {
      state.showAddModal = true
      state.selectedTeacher = null
    },
    hideAddTeacherModal: (state) => {
      state.showAddModal = false
      state.selectedTeacher = null
    },
    showEditTeacherModal: (state, action) => {
      state.showEditModal = true
      state.selectedTeacher = action.payload
    },
    hideEditTeacherModal: (state) => {
      state.showEditModal = false
      state.selectedTeacher = null
    },
    showDeleteTeacherModal: (state, action) => {
      state.showDeleteModal = true
      state.selectedTeacher = action.payload
    },
    hideDeleteTeacherModal: (state) => {
      state.showDeleteModal = false
      state.selectedTeacher = null
    },
  },
  extraReducers: (builder) => {
    // Fetch Teachers
    builder.addCase(fetchTeachers.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchTeachers.fulfilled, (state, action) => {
      state.loading = false
      if (action.payload) {
        state.teachers = action.payload.items || []
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          totalItems: action.payload.totalItems,
          itemsPerPage: action.payload.itemsPerPage
        }
      }
    })
    builder.addCase(fetchTeachers.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Create Teacher
    builder.addCase(createTeacher.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(createTeacher.fulfilled, (state, action) => {
      state.loading = false
      state.teachers = state.teachers || []
      if (action.payload) {
        state.teachers.unshift(action.payload) // Add at beginning of list
        state.pagination.totalItems += 1
      }
      state.showAddModal = false
    })
    builder.addCase(createTeacher.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Update Teacher
    builder.addCase(updateTeacher.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(updateTeacher.fulfilled, (state, action) => {
      state.loading = false
      if (state.teachers) {
        const index = state.teachers.findIndex(t => t.id === action.payload.id)
        if (index !== -1) {
          state.teachers[index] = action.payload
        }
      }
      state.showEditModal = false
    })
    builder.addCase(updateTeacher.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Delete Teacher
    builder.addCase(deleteTeacher.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(deleteTeacher.fulfilled, (state, action) => {
      state.loading = false
      if (state.teachers) {
        state.teachers = state.teachers.filter(t => t.id !== action.payload)
        state.pagination.totalItems = Math.max(0, state.pagination.totalItems - 1)
      }
      state.showDeleteModal = false
    })
    builder.addCase(deleteTeacher.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })
  },
})

export const {
  setLoading,
  clearError,
  setSelectedTeacher,
  showAddTeacherModal,
  hideAddTeacherModal,
  showEditTeacherModal,
  hideEditTeacherModal,
  showDeleteTeacherModal,
  hideDeleteTeacherModal,
} = teacherSlice.actions

export default teacherSlice.reducer
