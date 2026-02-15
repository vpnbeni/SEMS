import { FormEvent, useState } from 'react'
import { billingAdminApi } from '../services/platformApi'

const defaultPlan = {
  code: '',
  name: '',
  billingCycle: 'monthly' as 'monthly' | 'yearly',
  amountMinor: 0,
  description: '',
  trialDays: 14,
}

const defaultCoupon = {
  code: '',
  discountType: 'percentage' as 'percentage' | 'fixed_minor',
  discountValue: 0,
  durationType: 'one_time' as 'one_time' | 'forever' | 'repeating',
}

const defaultAddon = {
  code: '',
  name: '',
  amountMinor: 0,
  cycle: 'monthly' as 'monthly' | 'yearly' | 'one_time',
}

export function BillingCatalogPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [plan, setPlan] = useState(defaultPlan)
  const [coupon, setCoupon] = useState(defaultCoupon)
  const [addon, setAddon] = useState(defaultAddon)

  const handlePlanSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await billingAdminApi.createPlan({
        ...plan,
        code: plan.code.trim().toLowerCase(),
        name: plan.name.trim(),
        amountMinor: Number(plan.amountMinor),
        trialDays: Number(plan.trialDays),
      })
      setSuccess('Plan saved successfully')
      setPlan(defaultPlan)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save plan')
    } finally {
      setLoading(false)
    }
  }

  const handleCouponSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await billingAdminApi.createCoupon({
        ...coupon,
        code: coupon.code.trim().toUpperCase(),
        discountValue: Number(coupon.discountValue),
      })
      setSuccess('Coupon saved successfully')
      setCoupon(defaultCoupon)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save coupon')
    } finally {
      setLoading(false)
    }
  }

  const handleAddonSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await billingAdminApi.createAddon({
        ...addon,
        code: addon.code.trim().toLowerCase(),
        name: addon.name.trim(),
        amountMinor: Number(addon.amountMinor),
      })
      setSuccess('Addon saved successfully')
      setAddon(defaultAddon)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save addon')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <h1 className="section-title" style={{ marginBottom: 0 }}>Billing Catalog</h1>

      {error && <div className="error-text">{error}</div>}
      {success && <div style={{ color: 'var(--success)' }}>{success}</div>}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={handlePlanSubmit} style={{ display: 'grid', gap: 12 }}>
          <h2 className="card-title">Create / Update Plan</h2>
          <input value={plan.code} onChange={(e) => setPlan((p) => ({ ...p, code: e.target.value }))} placeholder="code (e.g. core_monthly)" required />
          <input value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))} placeholder="plan name" required />
          <select value={plan.billingCycle} onChange={(e) => setPlan((p) => ({ ...p, billingCycle: e.target.value as 'monthly' | 'yearly' }))}>
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
          </select>
          <input type="number" min={0} value={plan.amountMinor} onChange={(e) => setPlan((p) => ({ ...p, amountMinor: Number(e.target.value) }))} placeholder="amountMinor" required />
          <input type="number" min={0} value={plan.trialDays} onChange={(e) => setPlan((p) => ({ ...p, trialDays: Number(e.target.value) }))} placeholder="trial days" />
          <input value={plan.description} onChange={(e) => setPlan((p) => ({ ...p, description: e.target.value }))} placeholder="description" />
          <button className="primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Plan'}</button>
        </form>

        <form className="card" onSubmit={handleCouponSubmit} style={{ display: 'grid', gap: 12 }}>
          <h2 className="card-title">Create / Update Coupon</h2>
          <input value={coupon.code} onChange={(e) => setCoupon((p) => ({ ...p, code: e.target.value }))} placeholder="code (e.g. NEWYEAR25)" required />
          <select value={coupon.discountType} onChange={(e) => setCoupon((p) => ({ ...p, discountType: e.target.value as 'percentage' | 'fixed_minor' }))}>
            <option value="percentage">percentage</option>
            <option value="fixed_minor">fixed_minor</option>
          </select>
          <input type="number" min={0} value={coupon.discountValue} onChange={(e) => setCoupon((p) => ({ ...p, discountValue: Number(e.target.value) }))} placeholder="discount value" required />
          <select value={coupon.durationType} onChange={(e) => setCoupon((p) => ({ ...p, durationType: e.target.value as 'one_time' | 'forever' | 'repeating' }))}>
            <option value="one_time">one_time</option>
            <option value="forever">forever</option>
            <option value="repeating">repeating</option>
          </select>
          <button className="primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Coupon'}</button>
        </form>
      </div>

      <form className="card" onSubmit={handleAddonSubmit} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <h2 className="card-title">Create / Update Addon</h2>
        <input value={addon.code} onChange={(e) => setAddon((p) => ({ ...p, code: e.target.value }))} placeholder="addon code" required />
        <input value={addon.name} onChange={(e) => setAddon((p) => ({ ...p, name: e.target.value }))} placeholder="addon name" required />
        <input type="number" min={0} value={addon.amountMinor} onChange={(e) => setAddon((p) => ({ ...p, amountMinor: Number(e.target.value) }))} placeholder="amountMinor" required />
        <select value={addon.cycle} onChange={(e) => setAddon((p) => ({ ...p, cycle: e.target.value as 'monthly' | 'yearly' | 'one_time' }))}>
          <option value="monthly">monthly</option>
          <option value="yearly">yearly</option>
          <option value="one_time">one_time</option>
        </select>
        <button className="primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Addon'}</button>
      </form>
    </div>
  )
}
