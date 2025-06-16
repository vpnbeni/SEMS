import { createSlice } from '@reduxjs/toolkit'

interface DatesheetState {
  datesheets: any[]
  loading: boolean
  error: string | null
}

const initialState: DatesheetState = {
  datesheets: [],
  loading: false,
  error: null,
}

const datesheetSlice = createSlice({
  name: 'datesheets',
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

export const { setLoading, clearError } = datesheetSlice.actions
export default datesheetSlice.reducer