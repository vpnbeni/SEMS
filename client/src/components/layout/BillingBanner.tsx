import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '@/redux/slices/authSlice'

const BillingBanner: React.FC = () => {
  const user = useSelector(selectUser)
  const billing = user?.billing

  if (!billing) {
    return null
  }

  if (billing.accessMode === 'full' && billing.state !== 'past_due_grace' && billing.state !== 'grandfathered') {
    return null
  }

  let text = ''
  let tone = 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'

  if (billing.accessMode === 'core_only') {
    text = 'Your trial currently includes core modules only. Upgrade to unlock all modules.'
  } else if (billing.accessMode === 'read_only') {
    text = 'Your workspace is in read-only mode due to billing status. Complete payment to restore full access.'
    tone = 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
  } else if (billing.state === 'past_due_grace') {
    text = 'Payment is pending. You are in grace period. Complete payment to avoid read-only mode.'
  } else if (billing.state === 'grandfathered') {
    text = 'Your workspace is in grandfathered access period. Billing setup is required before expiry.'
  }

  if (!text) {
    return null
  }

  return (
    <div className={`mx-4 mt-3 mb-1 rounded-lg border px-4 py-3 text-sm ${tone}`}>
      <div className="flex items-center justify-between gap-4">
        <p>{text}</p>
        <Link
          to="/billing"
          className="inline-flex whitespace-nowrap rounded-md bg-white/70 dark:bg-black/30 px-3 py-1.5 text-xs font-semibold hover:opacity-90"
        >
          Open Billing
        </Link>
      </div>
    </div>
  )
}

export default BillingBanner
