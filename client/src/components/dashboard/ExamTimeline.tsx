import React from 'react'

export type ExamTimelineItem = {
  date: string
  subject: string
}

export type ExamTimelineProps = {
  exams: ExamTimelineItem[]
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
  return d.getDate().toString()
}

const ExamTimeline: React.FC<ExamTimelineProps> = ({ exams }) => {
  const today = todayIso()

  if (!exams.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 flex items-center justify-center min-h-[72px] text-gray-500 dark:text-gray-400 text-sm">
        No exam dates to display
      </div>
    )
  }

  const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 overflow-x-auto border border-gray-100 dark:border-gray-700 max-h-[110px]">
      <div className="relative flex items-center gap-6 min-w-min px-2 z-10">
        {/* Connecting line - spans full content width */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-gray-300 dark:bg-gray-600 z-0 pointer-events-none"
          aria-hidden
        />
        {sortedExams.map((item) => {
          const status = getDateStatus(item.date)
          const isToday = status === 'today'
          const dayNum = formatDayNum(item.date)

          const circleClasses = [
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all',
            status === 'past' && 'bg-green-500 text-white',
            status === 'today' && 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900 scale-110 shadow-md',
            status === 'future' && 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={`${item.date}-${item.subject}`}
              className="min-w-[120px] text-center relative flex flex-col items-center"
            >
              {isToday && (
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white animate-pulse whitespace-nowrap z-20"
                  aria-hidden
                >
                  WE ARE HERE
                </span>
              )}
              <div
                className={circleClasses}
                title={item.subject}
              >
                {dayNum}
              </div>
              <p
                className="mt-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 truncate w-full hidden sm:block"
                title={item.subject}
              >
                {item.subject}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ExamTimeline
