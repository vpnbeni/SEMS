export interface PlatformAdmin {
  _id: string
  email: string
  name: string
  isActive: boolean
}

export interface Tenant {
  _id: string
  slug: string
  name: string
  dbName: string
  adminEmail: string
  status: 'active' | 'suspended'
  createdAt: string
}

export interface TenantListResponse {
  items: Tenant[]
  total: number
  page: number
  pages: number
  limit: number
}
