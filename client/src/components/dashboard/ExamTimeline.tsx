import React, { useRef, useEffect } from 'react'
import styles from './ExamTimeline.module.css'

export type ExamTimelineItem = {
  date: string
  subject: string
  subjectCode?: string
  class?: string
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
  const day = d.getDate()
  return day < 10 ? `0${day}` : day.toString()
}

const ExamTimeline: React.FC<ExamTimelineProps> = ({ exams }) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const canScrollLeft = el.scrollLeft > 0
      const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
      const scrollingDown = e.deltaY > 0
      const scrollingUp = e.deltaY < 0
      if ((scrollingDown && canScrollRight) || (scrollingUp && canScrollLeft)) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  if (!exams.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-2 flex items-center justify-center min-h-[50px] text-gray-500 dark:text-gray-400 text-xs">
        No exam dates to display
      </div>
    )
  }

  const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div
      ref={scrollRef}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto overflow-y-hidden border border-gray-100 dark:border-gray-700 py-3 px-2"
      role="region"
      aria-label="Exam timeline"
    >
      <div className="relative flex items-stretch min-w-min gap-0">
        {sortedExams.map((item, index) => {
          const status = getDateStatus(item.date)
          const isToday = status === 'today'
          const dayNum = formatDayNum(item.date)

          const segmentColors = {
            past: 'bg-emerald-600 dark:bg-emerald-700',
            today: 'bg-blue-600 dark:bg-blue-700',
            future: 'bg-slate-400 dark:bg-slate-600',
          }
          const colorClass = segmentColors[status]

          return (
            <div
              key={`${item.date}-${item.subject}`}
              className="relative flex-shrink-0 group"
              style={{ zIndex: sortedExams.length - index }}
            >
              {isToday && (
                <div
                  className={styles.todayRing}
                  aria-hidden
                />
              )}
              <div
                className={`
                  relative z-10 flex items-center gap-3 pl-7 pr-8 py-3 min-w-[140px] max-w-[180px]
                  ${styles.segment} ${colorClass} text-white
                  shadow-[2px_0_8px_rgba(0,0,0,0.15)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)]
                  transition-all duration-200 hover:brightness-110
                  ${isToday ? 'brightness-110' : ''}
                  ${index === 0 ? 'ml-2' : 'ml-3'}
                `}
                title={`${item.subject}${item.subjectCode || item.class ? ` (${[item.subjectCode, item.class].filter(Boolean).join(' · ')})` : ''}`}
              >
                {/* Subtle darker edge for depth */}
                <div
                  className={`absolute inset-0 opacity-20 pointer-events-none rounded-none ${styles.segmentDepth}`}
                  aria-hidden
                />
                <div className="relative z-10 flex items-center gap-3 min-w-0">
                  <span className="text-lg font-bold tabular-nums flex-shrink-0">{dayNum}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide truncate">
                      {item.subject}
                    </p>
                    {(item.subjectCode || item.class) && (
                      <p className="text-[10px] opacity-90 truncate">
                        {[item.subjectCode, item.class].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {isToday && (
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-md animate-pulse whitespace-nowrap z-30"
                  aria-hidden
                >
                  TODAY
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ExamTimeline
