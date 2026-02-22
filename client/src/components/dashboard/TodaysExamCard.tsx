import React from 'react'
import {
  BookOpen,
  Users,
  UserCheck,
  UserX,
  DoorOpen,
  ClipboardList,
  Package,
} from 'lucide-react'

export type TodaysExamData = {
  subjectName: string
  subjectCode: string
  class: string
  timeStart: string
  timeEnd: string
  totalCandidates: number
  absent: number
  checkedIn: number
  roomsAllocated: number
  invigilatorsAssigned: number
  sheetsPackets: string
}

export type TodaysExamCardProps = {
  dateStr: string
  exam: TodaysExamData
}

const TodaysExamCard: React.FC<TodaysExamCardProps> = ({ dateStr, exam }) => {
  const metrics = [
    { label: 'Total Candidates', value: exam.totalCandidates, icon: Users },
    { label: 'Absent', value: exam.absent, icon: UserX },
    { label: 'Checked In', value: exam.checkedIn, icon: UserCheck },
    { label: 'Rooms Allocated', value: exam.roomsAllocated, icon: DoorOpen },
    { label: 'Invigilators Assigned', value: exam.invigilatorsAssigned, icon: ClipboardList },
    { label: 'Sheets (packets)', value: exam.sheetsPackets, icon: Package },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Today&apos;s Exams</h2>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
            {dateStr}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981] text-white text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden />
            LIVE
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 mb-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E40AF]/10 text-[#1E40AF] flex-shrink-0">
            <BookOpen className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {exam.subjectName} {exam.subjectCode}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Class {exam.class}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              {exam.timeStart} – {exam.timeEnd}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 grid-rows-2 gap-2">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 dark:border-gray-600 p-2 flex items-center gap-2 bg-white dark:bg-gray-900"
          >
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] uppercase text-gray-500 truncate">{label}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TodaysExamCard
