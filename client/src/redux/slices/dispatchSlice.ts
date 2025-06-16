import { createSlice } from '@reduxjs/toolkit'

interface DispatchState {
  dispatches: any[]
  loading: boolean
  error: string | null
}

const initialState: DispatchState = {
  dispatches: [],
  loading: false,
  error: null,
}

const dispatchSlice = createSlice({
  name: 'dispatches',
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

export const { setLoading, clearError } = dispatchSlice.actions
export default dispatchSlice.reducer