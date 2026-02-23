import React from 'react'

export type ExamTimelineItem = {
  date: string
  subject: string
  subjectCode?: string
  class?: string
}

export type ExamTimelineProps = {
  exams: ExamTimelineItem[]
  selectedDate?: string
  onSelectDate?: (date: string) => void
}

const todayIso = (): string => new Date().toISOString().split('T')[0]

const getDateStatus = (dateStr: string): 'past' | 'today' | 'future' => {
  const today = todayIso()
  if (dateStr < today) return 'past'
  if (dateStr === today) return 'today'
  return 'future'
}

const formatDayNum = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate()
  return day < 10 ? `0${day}` : day.toString()
}

const ExamTimeline: React.FC<ExamTimelineProps> = ({ exams, selectedDate, onSelectDate }) => {
  if (!exams.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-2 flex items-center justify-center min-h-[50px] text-gray-500 dark:text-gray-400 text-xs">
        No exam dates to display
      </div>
    )
  }

  const uniqueDates = Array.from(new Set(exams.map((e) => e.date))).sort()

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto border border-gray-100 dark:border-gray-700 py-2 px-3"
      role="region"
      aria-label="Exam dates"
    >
      <div className="flex items-center gap-2 min-w-min">
        {uniqueDates.map((date) => {
          const status = getDateStatus(date)
          const isToday = status === 'today'
          const isSelected = selectedDate === date
          const dayNum = formatDayNum(date)

          const baseClasses =
            status === 'past'
              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
              : status === 'today'
                ? 'border-blue-200 text-blue-700 bg-blue-50'
                : 'border-slate-200 text-slate-700 bg-slate-50'

          const selectedRing = isSelected
            ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
            : ''

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate?.(date)}
              className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${baseClasses} ${selectedRing} ${
                isToday ? 'shadow-sm' : ''
              }`}
              title={date}
            >
              {dayNum}
              {isToday && <span className="ml-1 text-[10px] font-bold uppercase">Today</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ExamTimeline
