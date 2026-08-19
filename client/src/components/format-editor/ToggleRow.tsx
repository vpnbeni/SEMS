export const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) => (
  <label className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200">
    {label}
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-3.5 w-3.5"
    />
  </label>
)

export const segmentButton = (active: boolean) =>
  `flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
    active
      ? 'bg-blue-600 text-white shadow-sm'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-gray-700'
  }`

export const fieldClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
