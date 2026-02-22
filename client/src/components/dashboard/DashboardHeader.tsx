import React from 'react'
import { LayoutDashboard, Bell } from 'lucide-react'

export type DashboardHeaderProps = {
  dateStr: string
  timeStr: string
  notificationCount?: number
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dateStr,
  timeStr,
  notificationCount = 0,
}) => {
  return (
    <header className="h-[70px] flex-shrink-0 px-4 flex items-center justify-between bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
          <LayoutDashboard className="w-6 h-6" aria-hidden />
        </div>
        <span className="text-sm font-semibold tracking-wide uppercase">
          Board Examination Management Dashboard
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm tabular-nums">{dateStr}</span>
        <span className="text-sm font-medium tabular-nums">{timeStr}</span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981] text-white text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden />
          LIVE
        </span>
        <button
          type="button"
          className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={notificationCount > 0 ? `${notificationCount} notifications` : 'Notifications'}
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

export default DashboardHeader
