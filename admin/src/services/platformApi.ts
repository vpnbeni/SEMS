import axios from 'axios'
import type { PlatformAdmin, Tenant, TenantListResponse } from '../types/platform'

const API_BASE_URL = import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:5000/api/admin'

const platformApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

platformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('platformToken')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface TenantCreatePayload {
  slug: string
  name: string
  adminEmail: string
  adminPassword?: string
}

export interface TenantUpdatePayload {
  name?: string
  adminEmail?: string
}

export const platformAuthApi = {
  async login(email: string, password: string): Promise<{ token: string; admin: PlatformAdmin }> {
    const response = await platformApi.post('/auth/login', { email, password })
    const { token, admin } = response.data.data
    localStorage.setItem('platformToken', token)
    return { token, admin }
  },

  async logout(): Promise<void> {
    try {
      await platformApi.post('/auth/logout')
    } finally {
      localStorage.removeItem('platformToken')
    }
  },

  async me(): Promise<PlatformAdmin> {
    const response = await platformApi.get('/auth/me')
    return response.data.data
  },
}

export const tenantAdminApi = {
  async list(search = ''): Promise<TenantListResponse> {
    const response = await platformApi.get('/tenants', {
      params: {
        limit: 100,
        search: search || undefined,
      },
    })
    return response.data.data
  },

  async create(payload: TenantCreatePayload): Promise<{ tenant: Tenant; generatedPassword?: string | null }> {
    const response = await platformApi.post('/tenants', payload)
    return response.data.data
  },

  async getById(id: string): Promise<Tenant> {
    const response = await platformApi.get(`/tenants/${id}`)
    return response.data.data
  },

  async update(id: string, payload: TenantUpdatePayload): Promise<Tenant> {
    const response = await platformApi.patch(`/tenants/${id}`, payload)
    return response.data.data
  },

  async activate(id: string): Promise<Tenant> {
    const response = await platformApi.post(`/tenants/${id}/activate`)
    return response.data.data
  },

  async suspend(id: string): Promise<Tenant> {
    const response = await platformApi.post(`/tenants/${id}/suspend`)
    return response.data.data
  },

  async delete(id: string, confirmSlug: string): Promise<{ _id: string; slug: string; dbName: string }> {
    const response = await platformApi.delete(`/tenants/${id}`, {
      data: { confirmSlug },
    })
    return response.data.data
  },
}
