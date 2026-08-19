import { useLocation } from 'react-router-dom'
import { useAttndMatrixMode } from '@/contexts/AttndMatrixModeContext'

export const AttndModeSwitch = () => {
  const { mode, setMode } = useAttndMatrixMode()
  const location = useLocation()
  const isStaffPage = /\/attnd\/staff-attendance\/?$/.test(location.pathname)
  const modes = [
    { id: 'classwise' as const, label: isStaffPage ? 'Typewise' : 'Classwise' },
    { id: 'daywise' as const, label: 'Daywise' },
  ]

  return (
    <div className="ml-4 inline-flex shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
      {modes.map((item) => {
        const active = mode === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`px-3 py-1.5 text-xs font-semibold ${
              active
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-gray-700'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
