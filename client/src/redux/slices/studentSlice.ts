import { createSlice } from '@reduxjs/toolkit'

interface StudentState {
  students: any[]
  loading: boolean
  error: string | null
}

const initialState: StudentState = {
  students: [],
  loading: false,
  error: null,
}

const studentSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const { setLoading, clearError } = studentSlice.actions
export default studentSlice.reducer