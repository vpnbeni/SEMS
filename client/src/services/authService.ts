import api from './api'
import type { 
  LoginCredentials, 
  RegisterData, 
  User, 
  AuthResponse, 
  ProfileUpdateData, 
  PasswordChangeData,
  ApiResponse 
} from '../types/auth'

class AuthService {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials)
    
    // Store token in localStorage and set auth header
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`
    }
    
    return response.data
  }

  // Register user
  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData)
    
    // Store token in localStorage and set auth header
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`
    }
    
    return response.data
  }

  // Logout user
  async logout(): Promise<ApiResponse> {
    const refreshToken = localStorage.getItem('refreshToken')
    
    try {
      const response = await api.post('/auth/logout', { refreshToken })
      return response.data
    } finally {
      // Always clear local storage and headers regardless of API response
      this.clearLocalStorage()
    }
  }

  // Get current user
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await api.get('/auth/me')
    return response.data
  }

  // Update user profile
  async updateProfile(userData: ProfileUpdateData): Promise<ApiResponse<User>> {
    const response = await api.put('/auth/me', userData)
    return response.data
  }

  // Change password
  async changePassword(passwordData: PasswordChangeData): Promise<ApiResponse> {
    const response = await api.put('/auth/change-password', passwordData)
    
    // Clear local storage after password change
    if (response.data.success) {
      this.clearLocalStorage()
    }
    
    return response.data
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken')
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await api.post('/auth/refresh', { refreshToken })
    
    // Update stored token
    if (response.data.success && response.data.data.accessToken) {
      localStorage.setItem('token', response.data.data.accessToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.accessToken}`
    }
    
    return response.data
  }

  // Forgot password
  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
      confirmNewPassword: newPassword
    })
    return response.data
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token')
    return !!token
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('token')
  }

  // Set auth header
  setAuthHeader(token: string): void {
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // Clear local storage
  clearLocalStorage(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    delete api.defaults.headers.common['Authorization']
  }

  // Initialize auth on app startup
  initializeAuth(): void {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }
}

// Create and export auth service instance
const authService = new AuthService()
export default authService