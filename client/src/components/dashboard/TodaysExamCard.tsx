import React from 'react'
import {
  BookOpen,
  Calendar,
  Users,
  DoorOpen,
  ClipboardList,
  Package,
  Palette,
  Pen,
  FileStack,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import type { TodaysExamsResponse } from '@/services/dashboardService'

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

    const primaryExam = exams[0]
    const classes = Array.from(new Set(exams.map((e) => e.class))).sort()
    const classesLabel =
      classes.length === 0
        ? '—'
        : classes.length === 1
          ? `Class ${classes[0]}`
          : `Class ${classes.join(' & ')}`

    const primarySubjectLabel = primaryExam ? `${primaryExam.subjectName} (${primaryExam.subjectCode})` : '—'

    const totalCandidates =
      data.totalCandidates ??
      exams.reduce((sum, exam) => sum + (exam.candidateCount ?? 0), 0)

    const totalRoomsUsed = exams.reduce((sum, exam) => sum + (exam.roomsUsed || 0), 0)
    const totalHindiMedium = exams.reduce(
      (sum, exam) => sum + (exam.hindiMediumCandidateCount || 0),
      0
    )

    const schoolAggregateMap = new Map<string, number>()
    exams.forEach((exam) => {
      ;(exam.schoolWiseCandidateCount || []).forEach((row) => {
        schoolAggregateMap.set(
          row.schoolName,
          (schoolAggregateMap.get(row.schoolName) || 0) + row.count
        )
      })
    })

    const aggregatedSchoolWise = Array.from(schoolAggregateMap.entries())
      .map(([schoolName, count]) => ({ schoolName, count }))
      .sort((a, b) => b.count - a.count)

    const topTwoSchoolsSummary =
      aggregatedSchoolWise
        .slice(0, 2)
        .map((row) => `${row.schoolName}: ${row.count}`)
        .join(', ') || '—'

    const allAnswerSheets = exams.flatMap((exam) => exam.answerSheetDetails || [])
    const sortedSheets = [...allAnswerSheets].sort((a, b) => a.serialFrom.localeCompare(b.serialFrom))
    const seriesFrom = sortedSheets[0]?.serialFrom
    const seriesTo = sortedSheets[sortedSheets.length - 1]?.serialTo
    const totalSheetsUsed = sortedSheets.reduce((sum, sheet) => {
      const fromNum = parseInt(sheet.serialFrom.replace(/\D/g, ''), 10)
      const toNum = parseInt(sheet.serialTo.replace(/\D/g, ''), 10)
      if (!Number.isFinite(fromNum) || !Number.isFinite(toNum) || toNum < fromNum) {
        return sum
      }
      return sum + (toNum - fromNum + 1)
    }, 0)

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
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
            {/* Header & primary context */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Today&apos;s Exam Details
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Snapshot of today&apos;s exams, packing and security.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden />
                  {dateStr}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {dayName}
                </span>
                {exams.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            {/* High-level chips (class, subject) */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100">
                <BookOpen className="w-3.5 h-3.5" aria-hidden />
                {primarySubjectLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" aria-hidden />
                {classesLabel}
              </span>
              {exams.length > 1 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-100">
                  <ClipboardList className="w-3.5 h-3.5" aria-hidden />
                  {exams.length} exams today
                </span>
              )}
            </div>

            {/* Summary stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="rounded-lg border border-blue-100 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-900/20 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-blue-900/80 dark:text-blue-100 font-semibold">
                    Total Candidates
                  </p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-50">
                    {totalCandidates}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-sky-100 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-900/20 p-3">
                <p className="text-[10px] uppercase tracking-wide text-sky-900/80 dark:text-sky-100 font-semibold mb-0.5">
                  School-wise
                </p>
                <p className="text-[11px] text-sky-900/80 dark:text-sky-100 line-clamp-2">
                  {topTwoSchoolsSummary}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-900/20 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-emerald-900/80 dark:text-emerald-100 font-semibold">
                    Duties Assigned
                  </p>
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-50">
                    {dutiesAssignedCount ?? 0}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-100 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-900/20 p-3">
                <p className="text-[10px] uppercase tracking-wide text-amber-900/80 dark:text-amber-100 font-semibold mb-0.5">
                  Rooms Used
                </p>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-50">
                  {totalRoomsUsed}
                </p>
              </div>

              <div className="rounded-lg border border-violet-100 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-900/20 p-3">
                <p className="text-[10px] uppercase tracking-wide text-violet-900/80 dark:text-violet-100 font-semibold mb-0.5">
                  Hindi Medium
                </p>
                <p className="text-sm font-bold text-violet-900 dark:text-violet-50">
                  {totalHindiMedium}
                </p>
              </div>
            </div>

            {/* Details row: Answer sheet / Packing / Security */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                  <FileStack className="w-3.5 h-3.5" aria-hidden />
                  Answer Sheet Details
                </p>
                <dl className="space-y-1.5 text-xs text-gray-800 dark:text-gray-200">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">Answer Sheet Type</dt>
                    <dd className="font-medium text-right">
                      {primaryExam?.answerSheetType || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">Series From</dt>
                    <dd className="font-medium text-right">
                      {seriesFrom && seriesTo ? `${seriesFrom} – ${seriesTo}` : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">Total Used</dt>
                    <dd className="font-bold text-blue-700 dark:text-blue-300">
                      {totalSheetsUsed || 0}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" aria-hidden />
                  Packing Details
                </p>
                <ul className="space-y-1.5 text-xs text-gray-800 dark:text-gray-200">
                  <li className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                    <span>
                      <span className="text-gray-500 dark:text-gray-400">Cloth colour:</span>{' '}
                      {packing?.clothColor || '—'}
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Pen className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                    <span>
                      <span className="text-gray-500 dark:text-gray-400">Marker colour:</span>{' '}
                      {packing?.marker || '—'}
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                    <span className="text-gray-500 dark:text-gray-400">
                      Packets as per centre plan
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2">
                  Security Status
                </p>
                <ul className="space-y-1.5 text-xs text-gray-800 dark:text-gray-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                    <span>Question paper received</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                    <span>Observer assigned</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden />
                    <span>CCTV status not recorded</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* School-wise breakup */}
            {aggregatedSchoolWise.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" aria-hidden />
                  School-wise Breakup
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                          School
                        </th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                          Total Candidates
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedSchoolWise.map((row, i) => (
                        <tr
                          key={row.schoolName || i}
                          className="border-t border-gray-200 dark:border-gray-700"
                        >
                          <td className="py-1.5 px-3 text-gray-800 dark:text-gray-200">
                            {row.schoolName}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium text-gray-900 dark:text-white">
                            {row.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
