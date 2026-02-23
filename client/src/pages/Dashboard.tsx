import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ExamTimeline,
  TodaysExamCard,
  RoomAllotmentTable,
  OccupancyChart,
  UpcomingExams,
  RecentActivity,
  ExamOverview,
} from '@/components/dashboard'
import type { ExamTimelineItem } from '@/components/dashboard'
import { useCentreDatesheet } from '@/hooks/useDatesheets'
import dashboardService from '@/services/dashboardService'

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

  const { data: todaysExamsData, isLoading: todaysExamsLoading } = useQuery({
    queryKey: ['dashboard', 'todays-exams'],
    queryFn: () => dashboardService.getTodaysExams(),
  })

  const roomAllotmentRows = [
    { roomNo: '101', candidates: 24, invigilator: 'R. Sharma', observer: 'A. Verma', status: 'Checked In' as const },
    { roomNo: '102', candidates: 24, invigilator: 'S. Singh', observer: '—', status: 'Checked In' as const },
    { roomNo: '103', candidates: 24, invigilator: 'P. Kumar', observer: '—', status: 'Pending' as const },
    { roomNo: '104', candidates: 24, invigilator: 'M. Gupta', observer: '—', status: 'Checked In' as const },
    { roomNo: '105', candidates: 24, invigilator: '—', observer: '—', status: 'Not Checked In' as const },
  ]

  const upcomingExamsItems = [
    { subjectName: 'Accountancy', subjectCode: '055', class: 'XII', studentsCount: 62, date: '04 Mar 2026', time: '09:30 AM' },
    { subjectName: 'Physics', subjectCode: '042', class: 'XII', studentsCount: 62, date: '08 Mar 2026', time: '09:30 AM' },
    { subjectName: 'Chemistry', subjectCode: '043', class: 'XII', studentsCount: 62, date: '12 Mar 2026', time: '09:30 AM' },
  ]

  const recentActivityItems = [
    { id: '1', description: 'Question paper received — Mathematics 041', timestamp: '09:15 AM', status: 'success' as const },
    { id: '2', description: 'Staff check-in completed — 52/52', timestamp: '09:12 AM', status: 'success' as const },
    { id: '3', description: 'Room 105 — Invigilator not checked in', timestamp: '09:10 AM', status: 'warning' as const },
    { id: '4', description: 'Attendance uploaded — 206 present', timestamp: '08:58 AM', status: 'info' as const },
  ]

  return (
    <div className="h-full min-h-0 flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
        <div className="flex-shrink-0 mb-4">
          <ExamTimeline exams={examTimelineDates} />
        </div>

        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* LEFT col-span-2 */}
          <div className="col-span-2 flex flex-col gap-4 min-h-0 overflow-hidden">
            <div className="flex-shrink-0">
              <TodaysExamCard
                data={todaysExamsData ?? null}
                isLoading={todaysExamsLoading}
              />
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 overflow-hidden">
              <div className="min-h-0 overflow-hidden">
                <RoomAllotmentTable
                  rows={roomAllotmentRows}
                  usedRooms={20}
                  totalRooms={24}
                  notCheckedInCount={1}
                />
              </div>
              <div className="flex-shrink-0 lg:w-44">
                <OccupancyChart used={20} remaining={4} />
              </div>
            </div>
          </div>

          {/* RIGHT col-span-1 */}
          <div className="col-span-1 flex flex-col gap-4 min-h-0 overflow-auto">
            <div className="flex-shrink-0">
              <UpcomingExams items={upcomingExamsItems} />
            </div>
            <div className="flex-shrink-0">
              <RecentActivity items={recentActivityItems} />
            </div>
            <div className="flex-shrink-0">
              <ExamOverview
                schoolsCount={2}
                functionariesCount={52}
                roomUsage="24/24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
