import React, { useMemo } from 'react'
import { ExamTimeline } from '@/components/dashboard'
import type { ExamTimelineItem } from '@/components/dashboard'
import { useCentreDatesheet } from '@/hooks/useDatesheets'

const Dashboard: React.FC = () => {
  const { data: centreDatesheet } = useCentreDatesheet({
    limit: 200,
    sortField: 'date',
    sortOrder: 'asc',
  })

  const examTimelineDates: ExamTimelineItem[] = useMemo(() => {
    const entries = centreDatesheet?.entries ?? []
    return entries.map((entry: { examDate: string | Date; subject?: { name?: string; code?: string; class?: string } }) => {
      const d = typeof entry.examDate === 'string' ? new Date(entry.examDate) : entry.examDate
      const dateStr = d.toISOString().slice(0, 10)
      const subject = entry.subject?.name ?? 'Exam'
      const subjectCode = entry.subject?.code
      const classVal = entry.subject?.class
      return { date: dateStr, subject, subjectCode, class: classVal }
    })
  }, [centreDatesheet?.entries])

  return (
    <div className="h-full min-h-0 flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 min-h-0 flex flex-col p-4 overflow-y-auto">
        <div className="flex-shrink-0 mb-2">
          <ExamTimeline exams={examTimelineDates} />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
