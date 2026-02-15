export interface BillingSnapshot {
  accessMode: 'full' | 'core_only' | 'read_only'
  state: string
  planCode: string | null
  trialEndsAt: string | null
  graceEndsAt: string | null
  isReadOnly: boolean
}

// User interface
export interface User {
  _id: string
  email: string
  role: 'admin' | 'data_entry_operator'
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLogin?: string
  billing?: BillingSnapshot | null
}

// Login credentials interface
export interface LoginCredentials {
  email: string
  password: string
}

// Register data interface
export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  role?: 'admin' | 'data_entry_operator'
}

// Auth response interface
export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
    refreshToken?: string
    billing?: BillingSnapshot | null
  }
}

// Profile update data interface
export interface ProfileUpdateData {
  email?: string
}

// Password change data interface
export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

// API response interface
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  meta?: {
    pagination?: {
      currentPage: number
      totalPages: number
      totalCount: number
      limit: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  }
}

// Error response interface
export interface ErrorResponse {
  success: false
  error: string
  details?: Array<{
    field: string
    message: string
    value?: any
  }>
}
