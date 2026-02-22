import React, { useEffect, useState } from 'react'
import {
  KPISection,
  ExamTimeline,
  TodaysExamCard,
  RoomAllotmentTable,
  OccupancyChart,
  UpcomingExams,
  RecentActivity,
  ExamOverview,
} from '@/components/dashboard'
import type { KPICard, ExamTimelineItem } from '@/components/dashboard'
import { Users, UserCheck, UserX, DoorOpen, ClipboardList, FileStack } from 'lucide-react'

const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const dateStr = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const totalCandidates = 210
  const presentToday = 206
  const absentToday = 4
  const roomsUsed = 24
  const dutyStaff = 52
  const answerSheetsUsed = 610

  const kpiCards: KPICard[] = [
    { label: 'Total Candidates', value: totalCandidates, icon: Users, accentColor: 'bg-[#1E40AF]' },
    { label: 'Present Today', value: presentToday, icon: UserCheck, accentColor: 'bg-[#10B981]' },
    { label: 'Absent Today', value: absentToday, icon: UserX, accentColor: 'bg-[#EF4444]' },
    { label: 'Rooms Used', value: roomsUsed, icon: DoorOpen, accentColor: 'bg-[#F59E0B]' },
    { label: 'Duty Staff', value: dutyStaff, icon: ClipboardList, accentColor: 'bg-cyan-500' },
    { label: 'Answer Sheets Used', value: answerSheetsUsed, icon: FileStack, accentColor: 'bg-[#8B5CF6]' },
  ]

  const todaysExam = {
    subjectName: 'Mathematics',
    subjectCode: '041',
    class: 'XII',
    timeStart: '10:30 AM',
    timeEnd: '1:30 PM',
    totalCandidates: 210,
    absent: 4,
    checkedIn: 206,
    roomsAllocated: 24,
    invigilatorsAssigned: 52,
    sheetsPackets: '610 (7 pkts)',
  }

  const roomAllotmentRows = [
    { roomNo: '101', candidates: 24, invigilator: 'R. Sharma', observer: 'A. Verma', status: 'Checked In' as const },
    { roomNo: '102', candidates: 24, invigilator: 'S. Singh', observer: '—', status: 'Checked In' as const },
    { roomNo: '103', candidates: 24, invigilator: 'P. Kumar', observer: '—', status: 'Pending' as const },
    { roomNo: '104', candidates: 24, invigilator: 'M. Gupta', observer: '—', status: 'Checked In' as const },
    { roomNo: '105', candidates: 24, invigilator: '—', observer: '—', status: 'Not Checked In' as const },
  ]

  const examTimelineDates: ExamTimelineItem[] = [
    { date: '2026-02-20', subject: 'English Core' },
    { date: '2026-02-22', subject: 'Mathematics' },
    { date: '2026-02-25', subject: 'Accountancy' },
    { date: '2026-03-01', subject: 'Physics' },
    { date: '2026-03-04', subject: 'Chemistry' },
    { date: '2026-03-07', subject: 'Biology' },
    { date: '2026-03-10', subject: 'Computer Science' },
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
          <KPISection cards={kpiCards} />
        </div>

        <div className="flex-shrink-0 mb-4">
          <ExamTimeline exams={examTimelineDates} />
        </div>

        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* LEFT col-span-2 */}
          <div className="col-span-2 flex flex-col gap-4 min-h-0 overflow-hidden">
            <div className="flex-shrink-0">
              <TodaysExamCard dateStr={dateStr} exam={todaysExam} />
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
