import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Store reference for Redux dispatch
let storeDispatch: any = null

// Flag to show session-expired toast only once when multiple requests fail with 401
let sessionExpiredToastShown = false

// Export function to set store dispatch
export const setStoreDispatch = (dispatch: any) => {
  storeDispatch = dispatch
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token to requests
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
      sessionExpiredToastShown = false // reset so next session expiry can show one toast
    }

    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now(),
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Handle successful responses
    if (response.data?.success) {
      // Show success toast for certain operations
      const method = response.config.method?.toUpperCase()
      const isModifyingOperation = ['POST', 'PUT', 'DELETE'].includes(method || '')

      if (isModifyingOperation && response.data.message) {
        toast.success(response.data.message)
      }
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.')
      return Promise.reject(error)
    }

    const { status, data } = error.response

    // Handle different error status codes
    switch (status) {
      case 400:
        // Bad Request - show validation errors
        if (data?.details && Array.isArray(data.details)) {
          data.details.forEach((detail: any) => {
            toast.error(`${detail.field}: ${detail.message}`)
          })
        } else {
          toast.error(data?.error || 'Bad request')
        }
        break

      case 401:
        // Unauthorized - try to refresh token or handle auth failure
        if (!originalRequest._retry) {
          originalRequest._retry = true

          const refreshToken = localStorage.getItem('refreshToken')
          if (refreshToken) {
            try {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              })

              if (response.data.success) {
                const newToken = response.data.data.accessToken
                localStorage.setItem('token', newToken)
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
                originalRequest.headers.Authorization = `Bearer ${newToken}`

                return api(originalRequest)
              }
            } catch (refreshError) {
              // Refresh failed, clear storage and let Redux handle the auth state
              localStorage.removeItem('token')
              localStorage.removeItem('refreshToken')
              localStorage.removeItem('user')
              delete api.defaults.headers.common['Authorization']

              // Dispatch logout action to Redux store
              if (storeDispatch) {
                storeDispatch({ type: 'auth/clearCredentials' })
              }

              // Show session-expired toast only once (multiple requests can 401 together)
              if (!window.location.pathname.includes('/login') && !sessionExpiredToastShown) {
                sessionExpiredToastShown = true
                toast.error('Session expired. Please login again.')
              }

              return Promise.reject(refreshError)
            }
          } else {
            // No refresh token, clear storage and let Redux handle auth state
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            delete api.defaults.headers.common['Authorization']

            // Dispatch logout action to Redux store
            if (storeDispatch) {
              storeDispatch({ type: 'auth/clearCredentials' })
            }

            if (!window.location.pathname.includes('/login') && !sessionExpiredToastShown) {
              sessionExpiredToastShown = true
              toast.error('Please login to continue')
            }
          }
        }
        break

      case 403:
        // Forbidden
        toast.error('You do not have permission to perform this action')
        break

      case 404:
        // Not Found
        toast.error(data?.error || 'Resource not found')
        break

      case 409:
        // Conflict
        toast.error(data?.error || 'Resource already exists')
        break

      case 422:
        // Unprocessable Entity - validation errors
        if (data?.details && Array.isArray(data.details)) {
          data.details.forEach((detail: any) => {
            toast.error(`${detail.field}: ${detail.message}`)
          })
        } else {
          toast.error(data?.error || 'Validation failed')
        }
        break

      case 429:
        // Too Many Requests
        toast.error('Too many requests. Please try again later.')
        break

      case 500:
        // Internal Server Error
        toast.error('Server error. Please try again later.')
        break

      default:
        // Other errors
        toast.error(data?.error || 'An unexpected error occurred')
    }

    return Promise.reject(error)
  }
)

// Helper function to handle file uploads
export const uploadFile = async (
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>,
  onProgress?: (progress: number) => void
): Promise<AxiosResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value)
    })
  }

  return api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    },
  })
}

// Helper function to download files
export const downloadFile = async (
  endpoint: string,
  filename?: string
): Promise<void> => {
  try {
    const response = await api.get(endpoint, {
      responseType: 'blob',
    })

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url

    // Get filename from response headers or use provided filename
    const contentDisposition = response.headers['content-disposition']
    let downloadFilename = filename

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
      if (filenameMatch) {
        downloadFilename = filenameMatch[1]
      }
    }

    link.setAttribute('download', downloadFilename || 'download')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    toast.error('Failed to download file')
    throw error
  }
}

// Export the configured axios instance
export default api
