import { ChevronLeft, ChevronRight } from 'lucide-react'

const shiftDate = (dateKey: string, delta: number) => {
  const next = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(next.getTime())) return dateKey
  next.setDate(next.getDate() + delta)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

const formatDateLabel = (dateKey: string) => {
  const [yearValue, monthValue, dayValue] = dateKey.split('-')
  if (!yearValue || !monthValue || !dayValue) return dateKey
  return `${dayValue}.${monthValue}.${yearValue.slice(-2)}`
}

export const DateSwitcher = ({
  value,
  onChange,
}: {
  value: string
  onChange: (date: string) => void
}) => (
  <div className="inline-flex h-[34px] overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
    <button
      type="button"
      title="Previous day"
      aria-label="Previous day"
      onClick={() => onChange(shiftDate(value, -1))}
      className="flex items-center px-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-gray-700"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <div className="flex min-w-[84px] items-center justify-center border-x border-gray-300 px-2.5 text-sm font-semibold text-indigo-800 dark:border-gray-600 dark:text-indigo-200">
      {formatDateLabel(value)}
    </div>
    <button
      type="button"
      title="Next day"
      aria-label="Next day"
      onClick={() => onChange(shiftDate(value, 1))}
      className="flex items-center px-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-gray-700"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
)
