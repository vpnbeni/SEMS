import { createSlice } from '@reduxjs/toolkit'

interface RoomState {
  rooms: any[]
  loading: boolean
  error: string | null
}

const initialState: RoomState = {
  rooms: [],
  loading: false,
  error: null,
}

const roomSlice = createSlice({
  name: 'rooms',
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

export const { setLoading, clearError } = roomSlice.actions
export default roomSlice.reducer