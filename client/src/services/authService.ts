import api from './api'
import axios from 'axios'
import { resolvePlatformAdminApiBaseUrl } from '../utils/tenantRuntime'
import { clearAuthData, getAuthToken, getRefreshToken, setStoredToken } from '../utils/authStorage'
import type { 
  LoginCredentials, 
  RegisterData, 
  User, 
  AuthResponse, 
  ProfileUpdateData, 
  PasswordChangeData,
  ApiResponse 
} from '../types/auth'

interface TenantResolutionResponse {
  slug: string
  name: string
}

const platformPublicAuthApi = axios.create({
  baseURL: resolvePlatformAdminApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

class AuthService {
  async resolveTenantByEmail(email: string): Promise<TenantResolutionResponse> {
    const response = await platformPublicAuthApi.post('/public/auth/resolve-tenant', { email })
    return response.data.data
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials)
    
    // Keep axios auth header in sync.
    if (response.data.success && response.data.data.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`
    }
    
    return response.data
  }

  // Register user
  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData)
    
    // Keep axios auth header in sync.
    if (response.data.success && response.data.data.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`
    }
    
    return response.data
  }

  // Logout user
  async logout(): Promise<ApiResponse> {
    const refreshToken = getRefreshToken()
    
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
    const refreshToken = getRefreshToken()
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await api.post('/auth/refresh', { refreshToken })
    
    // Update stored token
    if (response.data.success && response.data.data.accessToken) {
      setStoredToken(response.data.data.accessToken)
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
    const token = getAuthToken()
    return !!token
  }

  // Get stored token
  getToken(): string | null {
    return getAuthToken()
  }

  // Set auth header
  setAuthHeader(token: string): void {
    setStoredToken(token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // Clear local storage
  clearLocalStorage(): void {
    clearAuthData()
    delete api.defaults.headers.common['Authorization']
  }

  // Initialize auth on app startup
  initializeAuth(): void {
    const token = getAuthToken()
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }
}

// Create and export auth service instance
const authService = new AuthService()
export default authService
