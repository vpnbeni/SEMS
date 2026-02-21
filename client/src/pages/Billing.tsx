import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import billingService, { type BillingInvoice, type BillingMeResponse } from '@/services/billingService'
import { selectUser } from '@/redux/slices/authSlice'

const money = (minor: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format((minor || 0) / 100)
}
  
const Billing: React.FC = () => {
  const user = useSelector(selectUser)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [billingData, setBillingData] = useState<BillingMeResponse | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])

  const [profileDraft, setProfileDraft] = useState({
    billingEmail: '',
    legalName: '',
    gstin: '',
    placeOfSupply: '',
    hsnSacDefault: '',
  })

  const entitlement = useMemo(() => billingData?.entitlement || user?.billing || null, [billingData, user])

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [me, invoiceData] = await Promise.all([
        billingService.getMe(),
        billingService.getInvoices(),
      ])

      setBillingData(me)
      setInvoices(invoiceData)

      setProfileDraft({
        billingEmail: me.account?.billingEmail || '',
        legalName: me.account?.legalName || '',
        gstin: me.account?.gstin || '',
        placeOfSupply: me.account?.placeOfSupply || '',
        hsnSacDefault: me.account?.hsnSacDefault || '',
      })
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load billing details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handlePayNow = async () => {
    setPaying(true)
    setError('')

    try {
      const response = await billingService.payNow()
      const url = response?.paymentLink?.url

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }

      setSuccess('Payment link generated. Complete payment to restore full access.')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to generate payment link')
    } finally {
      setPaying(false)
    }
  }

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await billingService.updateProfile(profileDraft)
      setSuccess('Billing profile updated')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update billing profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-700 dark:text-gray-200">
        Loading billing details...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Access Mode</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{entitlement?.accessMode || 'full'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">State: {entitlement?.state || 'active'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{entitlement?.planCode || 'n/a'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Trial Ends: {entitlement?.trialEndsAt ? new Date(entitlement.trialEndsAt).toLocaleString() : 'n/a'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Grace Ends</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{entitlement?.graceEndsAt ? new Date(entitlement.graceEndsAt).toLocaleDateString() : 'n/a'}</p>
          <button
            type="button"
            onClick={handlePayNow}
            disabled={paying}
            className="mt-3 inline-flex px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium disabled:opacity-60"
          >
            {paying ? 'Generating...' : 'Pay Now'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing Profile</h2>
          <form className="space-y-3" onSubmit={handleSaveProfile}>
            <input
              value={profileDraft.billingEmail}
              onChange={(e) => setProfileDraft((prev) => ({ ...prev, billingEmail: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
              placeholder="Billing Email"
            />
            <input
              value={profileDraft.legalName}
              onChange={(e) => setProfileDraft((prev) => ({ ...prev, legalName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
              placeholder="Legal Name"
            />
            <input
              value={profileDraft.gstin}
              onChange={(e) => setProfileDraft((prev) => ({ ...prev, gstin: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
              placeholder="GSTIN"
            />
            <input
              value={profileDraft.placeOfSupply}
              onChange={(e) => setProfileDraft((prev) => ({ ...prev, placeOfSupply: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
              placeholder="Place of Supply"
            />
            <input
              value={profileDraft.hsnSacDefault}
              onChange={(e) => setProfileDraft((prev) => ({ ...prev, hsnSacDefault: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
              placeholder="HSN/SAC"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex px-3 py-2 rounded-lg bg-secondary-900 hover:bg-secondary-800 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Billing Profile'}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Invoices</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-2">Invoice</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Amount</th>
                <th className="py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id} className="border-b border-gray-100 dark:border-gray-700/60">
                  <td className="py-2 pr-2 text-gray-900 dark:text-gray-100">{invoice.invoiceNo}</td>
                  <td className="py-2 pr-2 text-gray-700 dark:text-gray-300">{invoice.status}</td>
                  <td className="py-2 pr-2 text-gray-900 dark:text-gray-100">{money(invoice.totalMinor, invoice.currency)}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{new Date(invoice.dueAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-gray-500 dark:text-gray-400">No invoices yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Billing
