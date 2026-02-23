import React from 'react'
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  DoorOpen,
  ClipboardList,
  Package,
  Palette,
  Pen,
  FileStack,
  Languages,
} from 'lucide-react'
import type { TodaysExamsResponse, TodaysExam } from '@/services/dashboardService'

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
  /** New: full API response. When set, renders full Today's Exam Details section. */
  data?: TodaysExamsResponse | null
  /** Loading state when fetching data */
  isLoading?: boolean
  /** Legacy: when data is not provided, show a single exam with dateStr + exam */
  dateStr?: string
  exam?: TodaysExamData
}

const formatTime = (slot: { start?: string; end?: string }): string => {
  if (!slot?.start && !slot?.end) return '—'
  const s = slot.start || ''
  const e = slot.end || ''
  const fmt = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    if (h == null) return t
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m ?? 0).padStart(2, '0')} ${period}`
  }
  return [fmt(s), fmt(e)].filter(Boolean).join(' – ')
}

const TodaysExamCard: React.FC<TodaysExamCardProps> = ({
  data,
  isLoading,
  dateStr: legacyDateStr,
  exam: legacyExam,
}) => {
  if (data != null) {
    const { examDate, dayName, exams, packing, dutiesAssignedCount } = data
    const dateStr = examDate
      ? new Date(examDate + 'T12:00:00').toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : ''

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Today&apos;s Exam Details
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" aria-hidden />
              {dateStr}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
              {dayName}
            </span>
            {exams.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981] text-white text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />
                LIVE
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading today&apos;s exams…
          </div>
        ) : exams.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400 rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
            No exams scheduled for today
          </div>
        ) : (
          <div className="space-y-4">
            {/* Day-level: Packing & Duties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                  Packing details
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-800 dark:text-gray-200">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                    Cloth: {packing?.clothColor || '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Pen className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                    Marker: {packing?.marker || '—'}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
                <div>
                  <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium">
                    Duties assigned
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {dutiesAssignedCount ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {exams.map((exam: TodaysExam) => (
              <div
                key={exam._id}
                className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800/50 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E40AF]/10 text-[#1E40AF] dark:bg-[#1E40AF]/20 flex-shrink-0">
                    <BookOpen className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {exam.subjectName} ({exam.subjectCode})
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Class {exam.class}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden />
                      {formatTime(exam.timeSlot || {})}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      Duration: {exam.duration ?? '—'} hr{exam.duration !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded border border-gray-200 dark:border-gray-600 p-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">Candidates</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{exam.candidateCount}</p>
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 dark:border-gray-600 p-2 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">Rooms required</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{exam.roomsUsed}</p>
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 dark:border-gray-600 p-2 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">Hindi medium</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {exam.hindiMediumCandidateCount ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                {exam.schoolWiseCandidateCount && exam.schoolWiseCandidateCount.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium mb-1.5">
                      School-wise candidates
                    </p>
                    <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-600">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="text-left py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              School
                            </th>
                            <th className="text-right py-1.5 px-2 font-medium text-gray-700 dark:text-gray-300">
                              Count
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {exam.schoolWiseCandidateCount.map((row, i) => (
                            <tr
                              key={i}
                              className="border-t border-gray-200 dark:border-gray-600"
                            >
                              <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">
                                {row.schoolName}
                              </td>
                              <td className="py-1.5 px-2 text-right font-medium text-gray-900 dark:text-white">
                                {row.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {exam.answerSheetDetails && exam.answerSheetDetails.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-medium mb-1.5 flex items-center gap-1">
                      <FileStack className="w-3.5 h-3.5" aria-hidden />
                      Answer sheets used
                    </p>
                    <ul className="space-y-1 text-xs text-gray-800 dark:text-gray-200">
                      {exam.answerSheetDetails.map((sheet, i) => (
                        <li key={i} className="flex items-center gap-2 flex-wrap">
                          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden />
                          <span>
                            {sheet.serialFrom} – {sheet.serialTo}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            ({sheet.type}
                            {sheet.colour ? `, ${sheet.colour}` : ''})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Legacy single-exam display
  if (legacyExam && legacyDateStr) {
    const metrics = [
      { label: 'Total Candidates', value: legacyExam.totalCandidates, icon: Users },
      { label: 'Absent', value: legacyExam.absent, icon: DoorOpen },
      { label: 'Checked In', value: legacyExam.checkedIn, icon: Users },
      { label: 'Rooms Allocated', value: legacyExam.roomsAllocated, icon: DoorOpen },
      { label: 'Invigilators Assigned', value: legacyExam.invigilatorsAssigned, icon: ClipboardList },
      { label: 'Sheets (packets)', value: legacyExam.sheetsPackets, icon: Package },
    ]
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Today&apos;s Exams</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
              {legacyDateStr}
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
                {legacyExam.subjectName} {legacyExam.subjectCode}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Class {legacyExam.class}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                {legacyExam.timeStart} – {legacyExam.timeEnd}
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
        Today&apos;s Exam Details
      </h2>
      <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No exam data to display
      </div>
    </div>
  )
}

export default TodaysExamCard
