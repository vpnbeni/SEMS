import api from './api'
import type { BillingSnapshot } from '@/types/auth'

export interface BillingAccount {
  tenantSlug: string
  tenantName: string
  billingEmail: string
  legalName: string
  address: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  gstin?: string
  placeOfSupply?: string
  hsnSacDefault?: string
}

export interface BillingSubscription {
  planCode: string
  state: string
  trialEndAt?: string | null
  graceEndsAt?: string | null
  cycleStartAt?: string | null
  cycleEndAt?: string | null
}

export interface BillingInvoice {
  _id: string
  invoiceNo: string
  status: string
  totalMinor: number
  taxMinor: number
  currency: string
  dueAt: string
  paidAt?: string | null
  createdAt: string
}

export interface BillingMeResponse {
  account?: BillingAccount
  subscription?: BillingSubscription
  entitlement?: BillingSnapshot
}

const billingService = {
  async getMe(): Promise<BillingMeResponse> {
    const response = await api.get('/billing/me')
    return response.data.data
  },

  async getInvoices(): Promise<BillingInvoice[]> {
    const response = await api.get('/billing/me/invoices')
    return response.data.data || []
  },

  async payNow(): Promise<{ paymentLink?: { id: string; url: string } }> {
    const response = await api.post('/billing/me/pay-now', {})
    return response.data.data
  },

  async updateProfile(payload: Partial<BillingAccount>): Promise<BillingAccount> {
    const response = await api.post('/billing/me/update-billing-profile', payload)
    return response.data.data
  },
}

export default billingService
