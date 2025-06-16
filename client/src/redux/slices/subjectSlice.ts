import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

interface Subject {
  _id: string
  name: string
  code: string
}

interface SubjectState {
  subjects: Subject[]
  loading: boolean
  error: string | null
}

const initialState: SubjectState = {
  subjects: [],
  loading: false,
  error: null,
}

export const fetchSubjects = createAsyncThunk(
  'subjects/fetchAll',
  async () => {
    const response = await api.get('/subjects?isActive=true')
    return response.data.data
  }
)

const subjectSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending, (state) => {
        state.loading = true
        state.error = null
      })
  .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.loading = false
        // Response is wrapped in { success, message, data } structure
        state.subjects = action.payload || []
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch subjects'
      })
  },
})

export const { setLoading, clearError } = subjectSlice.actions
export default subjectSlice.reducer
