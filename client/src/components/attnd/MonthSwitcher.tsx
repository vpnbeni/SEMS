import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const shiftMonth = (monthKey: string, delta: number) => {
  const [yearValue, monthValue] = monthKey.split('-').map(Number)
  const next = new Date(yearValue, (monthValue || 1) - 1 + delta, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

const formatMonthLabel = (monthKey: string) => {
  const [yearValue, monthValue] = monthKey.split('-').map(Number)
  if (!yearValue || !monthValue) return monthKey
  return new Date(yearValue, monthValue - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
  })
}

export const MonthSwitcher = ({
  value,
  onChange,
}: {
  value: string
  onChange: (month: string) => void
}) => (
  <div className="inline-flex h-[34px] overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
    <button
      type="button"
      title="Previous month"
      aria-label="Previous month"
      onClick={() => onChange(shiftMonth(value, -1))}
      className="flex items-center px-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-gray-700"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <div className="flex min-w-[76px] items-center justify-center border-x border-gray-300 px-2.5 text-sm font-semibold text-indigo-800 dark:border-gray-600 dark:text-indigo-200">
      {formatMonthLabel(value)}
    </div>
    <button
      type="button"
      title="Next month"
      aria-label="Next month"
      onClick={() => onChange(shiftMonth(value, 1))}
      className="flex items-center px-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-gray-700"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
)
