import React, { useState, useMemo, useCallback } from 'react'
import { ExamTimeline } from '@/components/dashboard'
import type { ExamTimelineItem } from '@/components/dashboard'
import { useTodaysExams, useDailyDuties, useDashboardAnswerSheets } from '@/hooks/useDashboard'
import { useCentreDatesheetEntries } from '@/hooks/useSeatingPlan'
import type { CentreDatesheetEntry } from '@/services/centreDatesheetService'
import type { TodaysExamsResponse, TodaysExam } from '@/services/dashboardService'
import type { DailyDutiesResponse } from '@/services/dutiesService'
import type { AnswerSheetEntry } from '@/services/answerSheetService'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const todayIso = (): string => new Date().toISOString().split('T')[0]

/** Convert YYYY-MM-DD to DD.MM.YYYY for duty queries */
const isoToDotFormat = (iso: string): string => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const normalizeClass = (v: string | undefined | null): 'X' | 'XII' | null => {
  if (!v) return null
  const s = v.toLowerCase()
  if (s.includes('10') || s === 'x') return 'X'
  if (s.includes('12') || s === 'xii') return 'XII'
  return null
}

const cell = 'px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200'
const headerCell =
  'px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
const sectionTitle =
  'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5'
const tableWrapper =
  'overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'

// ---------------------------------------------------------------------------
// Sub-components (sections matching wireframe)
// ---------------------------------------------------------------------------

/** 1. Candidate Details — Class X | Class XII columns */
const CandidateDetails: React.FC<{ data: TodaysExamsResponse }> = ({ data }) => {
  const exams = data.exams ?? []
  const byClass = (target: 'X' | 'XII') => exams.filter((e) => normalizeClass(e.class) === target)
  const classX = byClass('X')
  const classXII = byClass('XII')

  const agg = (list: TodaysExam[]) => ({
    subject: list.map((e) => e.subjectName).join(', ') || '\u2014',
    code: list.map((e) => e.subjectCode).join(', ') || '\u2014',
    duration: list[0]?.duration ? `${list[0].duration} min` : '\u2014',
    candidates: list.reduce((s, e) => s + (e.candidateCount || 0), 0),
    rooms: list.reduce((s, e) => s + (e.roomsUsed || 0), 0),
    invigilators: '\u2014',
    hindi: list.reduce((s, e) => s + (e.hindiMediumCandidateCount || 0), 0),
    pwd: '\u2014',
  })

  const x = agg(classX)
  const xii = agg(classXII)

  const rows: { label: string; x: string | number; xii: string | number }[] = [
    { label: 'Subject', x: x.subject, xii: xii.subject },
    { label: 'Code', x: x.code, xii: xii.code },
    { label: 'Duration', x: x.duration, xii: xii.duration },
    { label: 'No of Candidates', x: x.candidates || '\u2014', xii: xii.candidates || '\u2014' },
    { label: 'No of Rooms', x: x.rooms || '\u2014', xii: xii.rooms || '\u2014' },
    { label: 'No of Invigilators', x: x.invigilators, xii: xii.invigilators },
    { label: 'Hindi Medium', x: x.hindi || '\u2014', xii: xii.hindi || '\u2014' },
    { label: 'PWD', x: x.pwd, xii: xii.pwd },
  ]

  return (
    <div>
      <p className={sectionTitle}>Candidate Details</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Detail</th>
              <th className={headerCell + ' text-center'}>Class X</th>
              <th className={headerCell + ' text-center'}>Class XII</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className={cell + ' font-medium'}>{r.label}</td>
                <td className={cell + ' text-center'}>{r.x}</td>
                <td className={cell + ' text-center'}>{r.xii}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 2. PwD Candidates */
const PwdCandidates: React.FC<{ data: TodaysExamsResponse }> = ({ data }) => {
  // PwD data is not currently returned per-candidate by the API.
  // Show header structure; rows will be populated when PwD data is available.
  const hasExams = (data.exams?.length ?? 0) > 0
  return (
    <div>
      <p className={sectionTitle}>PwD Candidates</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Roll No</th>
              <th className={headerCell + ' text-center'}>Room No</th>
              <th className={headerCell + ' text-center'}>With/Without Scribe</th>
            </tr>
          </thead>
          <tbody>
            {!hasExams && (
              <tr>
                <td colSpan={3} className={cell + ' text-center text-gray-400'}>
                  No PwD candidate data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <table className="w-full text-xs mt-0 border-t border-gray-200 dark:border-gray-700">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Sheet No</th>
              <th className={headerCell + ' text-center'}>Extra Time</th>
              <th className={headerCell + ' text-center'}>60 Minutes</th>
              <th className={headerCell + ' text-center'}>Next Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className={cell + ' text-center text-gray-400'}>
                {hasExams ? 'Data will be available when PwD records are imported' : '\u2014'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 3. Duties Summary */
const DutiesSummary: React.FC<{
  dashData: TodaysExamsResponse
  dutiesData?: DailyDutiesResponse
}> = ({ dashData, dutiesData }) => {
  const byType = dashData.dutiesByType ?? {}
  const totalAssigned = dashData.dutiesAssignedCount ?? dutiesData?.totalAssigned ?? 0

  const roles: { code: string; types: string[] }[] = [
    { code: 'CS', types: ['Centre Superintendent'] },
    { code: 'DCS', types: ['Deputy Centre Superintendent'] },
    { code: 'OBR', types: ['Observer'] },
    { code: 'ASC', types: ['ASI (CCTV)', 'ASI (Frisking Male)'] },
    { code: 'ASI', types: ['Invigilator'] },
    { code: 'ASF', types: ['ASI (Frisking Female)'] },
    { code: 'CLR', types: ['Clerk'] },
    { code: 'CLIV', types: ['Class IV'] },
  ]

  const getCount = (types: string[]) =>
    types.reduce((s, t) => s + (byType[t] || 0), 0)

  // Display as 2 columns of 4 roles each
  const left = roles.slice(0, 4)
  const right = roles.slice(4)

  return (
    <div>
      <p className={sectionTitle}>Duties Summary</p>
      <div className={tableWrapper}>
        <div className="px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-semibold flex items-center justify-between">
          <span>Assigned Duties</span>
          <span>Total: {totalAssigned}</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
          {[left, right].map((group, gi) => (
            <table key={gi} className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {group.map((r) => {
                  const count = getCount(r.types)
                  return (
                    <tr key={r.code}>
                      <td className={cell + ' font-semibold w-12'}>{r.code}</td>
                      <td className={cell + ' text-center'}>
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 font-semibold text-[11px]">
                          {count}
                        </span>
                      </td>
                      <td className={cell + ' text-gray-400 text-[10px]'}>Assigned</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 4. Answer Sheet Detail */
const AnswerSheetDetail: React.FC<{
  dashData: TodaysExamsResponse
  sheets: AnswerSheetEntry[]
}> = ({ dashData, sheets }) => {
  const exams = dashData.exams ?? []

  // Aggregate from dashboard data (linked to today's exam)
  const byClassFromDash = (target: 'X' | 'XII') => {
    const filtered = exams.filter((e) => normalizeClass(e.class) === target)
    const details = filtered.flatMap((e) => e.answerSheetDetails ?? [])
    if (!details.length) return { type: '\u2014', from: '\u2014', to: '\u2014', total: 0, discarded: 0 }
    const sorted = [...details].sort((a, b) => a.serialFrom.localeCompare(b.serialFrom))
    const total = details.reduce((s, d) => {
      const f = parseInt(d.serialFrom.replace(/\D/g, ''), 10)
      const t = parseInt(d.serialTo.replace(/\D/g, ''), 10)
      return Number.isFinite(f) && Number.isFinite(t) && t >= f ? s + (t - f + 1) : s
    }, 0)
    return {
      type: details[0]?.type || '\u2014',
      from: sorted[0]?.serialFrom || '\u2014',
      to: sorted[sorted.length - 1]?.serialTo || '\u2014',
      total,
      discarded: 0,
    }
  }

  // Also pull discarded from full answer sheet inventory if available
  const byClassFromSheets = (target: 'X' | 'XII') => {
    const classVal = target === 'X' ? '10' : '12'
    const matched = sheets.filter(
      (s) =>
        s.class?.includes(classVal) ||
        s.class?.toLowerCase() === target.toLowerCase()
    )
    return {
      discarded: matched.reduce((s, sh) => s + (sh.discarded || 0), 0),
    }
  }

  const x = { ...byClassFromDash('X'), discarded: byClassFromSheets('X').discarded }
  const xii = { ...byClassFromDash('XII'), discarded: byClassFromSheets('XII').discarded }

  const rows: { label: string; x: string | number; xii: string | number }[] = [
    { label: 'Type', x: x.type, xii: xii.type },
    { label: 'From', x: x.from, xii: xii.from },
    { label: 'To', x: x.to, xii: xii.to },
    { label: 'Total', x: x.total || '\u2014', xii: xii.total || '\u2014' },
    { label: 'Discarded', x: x.discarded || '\u2014', xii: xii.discarded || '\u2014' },
  ]

  return (
    <div>
      <p className={sectionTitle}>Answer Sheet Detail</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Detail</th>
              <th className={headerCell + ' text-center'}>Class X</th>
              <th className={headerCell + ' text-center'}>Class XII</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className={cell + ' font-medium'}>{r.label}</td>
                <td className={cell + ' text-center'}>{r.x}</td>
                <td className={cell + ' text-center'}>{r.xii}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 5. Status Tracker */
const StatusTracker: React.FC<{ data: TodaysExamsResponse; dutiesData?: DailyDutiesResponse }> = ({
  data,
  dutiesData,
}) => {
  const exams = data.exams ?? []
  const hasRooms = exams.some((e) => e.roomsUsed > 0)
  const hasDuties = (data.dutiesAssignedCount ?? 0) > 0 || (dutiesData?.totalAssigned ?? 0) > 0
  const totalDuties = data.dutiesAssignedCount ?? dutiesData?.totalAssigned ?? 0
  const totalRooms = exams.reduce((s, e) => s + (e.roomsUsed || 0), 0)

  const items: { label: string; status: string }[] = [
    { label: 'Room Selection', status: hasRooms ? 'Selected' : 'Pending' },
    { label: 'Room Allocation', status: hasRooms ? 'Allotted' : 'Pending' },
    {
      label: 'Seating Plan Download',
      status: hasRooms ? `Downloaded ${totalRooms}/${totalRooms}` : 'Pending',
    },
    { label: 'Functionary Update', status: hasDuties ? 'New Functionary Added' : 'Pending' },
    { label: 'Functionary Selection', status: hasDuties ? 'Functionaries Selected' : 'Pending' },
    {
      label: 'Duty Assigned',
      status: hasDuties ? `${totalDuties}/${totalDuties} Duties Assigned` : 'Pending',
    },
  ]

  return (
    <div>
      <p className={sectionTitle}>Status Tracker</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Step</th>
              <th className={headerCell + ' text-left'}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => {
              const done = item.status !== 'Pending'
              return (
                <tr key={item.label}>
                  <td className={cell + ' font-medium'}>{item.label}</td>
                  <td className={cell}>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        done
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800'
                      }`}
                    >
                      {done && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {item.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 6. Packing Details */
const PackingDetails: React.FC<{ data: TodaysExamsResponse }> = ({ data }) => {
  const p = data.packing
  const exams = data.exams ?? []

  const xExams = exams.filter((e) => normalizeClass(e.class) === 'X')
  const xiiExams = exams.filter((e) => normalizeClass(e.class) === 'XII')

  const xCandidates = xExams.reduce((s, e) => s + (e.candidateCount || 0), 0)
  const xiiCandidates = xiiExams.reduce((s, e) => s + (e.candidateCount || 0), 0)

  // QP packets = number of exams per class
  const xQP = xExams.length
  const xiiQP = xiiExams.length

  // Answer sheet bags (estimate: 1 bag per ~100 candidates, min 1 if >0)
  const xBags = xCandidates ? Math.max(1, Math.ceil(xCandidates / 100)) : 0
  const xiiBags = xiiCandidates ? Math.max(1, Math.ceil(xiiCandidates / 100)) : 0

  const rows: { label: string; x: string | number; xii: string | number }[] = [
    {
      label: 'Cloth',
      x: p?.clothColorClass10 || p?.clothColor || '\u2014',
      xii: p?.clothColorClass12 || p?.clothColor || '\u2014',
    },
    {
      label: 'Pen',
      x: p?.markerClass10 || p?.marker || '\u2014',
      xii: p?.markerClass12 || p?.marker || '\u2014',
    },
    { label: 'QP Packets', x: xQP || '\u2014', xii: xiiQP || '\u2014' },
    { label: 'Answer Sheet Bags', x: xBags || '\u2014', xii: xiiBags || '\u2014' },
  ]

  return (
    <div>
      <p className={sectionTitle}>Packing Details</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Detail</th>
              <th className={headerCell + ' text-center'}>Class X</th>
              <th className={headerCell + ' text-center'}>Class XII</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className={cell + ' font-medium'}>{r.label}</td>
                <td className={cell + ' text-center'}>{r.x}</td>
                <td className={cell + ' text-center'}>{r.xii}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 7. School Wise Distribution */
const SchoolWiseDistribution: React.FC<{ data: TodaysExamsResponse }> = ({ data }) => {
  const exams = data.exams ?? []

  // Aggregate school-wise by class
  const map = new Map<string, { x: number; xii: number }>()
  exams.forEach((exam) => {
    const cls = normalizeClass(exam.class)
    ;(exam.schoolWiseCandidateCount ?? []).forEach((row) => {
      const key = row.schoolName || '\u2014'
      const cur = map.get(key) || { x: 0, xii: 0 }
      if (cls === 'X') cur.x += row.count || 0
      if (cls === 'XII') cur.xii += row.count || 0
      map.set(key, cur)
    })
  })

  const rows = Array.from(map.entries())
    .map(([name, counts]) => ({ name, x: counts.x, xii: counts.xii, total: counts.x + counts.xii }))
    .sort((a, b) => b.total - a.total)

  const totalX = rows.reduce((s, r) => s + r.x, 0)
  const totalXII = rows.reduce((s, r) => s + r.xii, 0)
  const grandTotal = totalX + totalXII

  return (
    <div>
      <p className={sectionTitle}>School Wise Distribution</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>School</th>
              <th className={headerCell + ' text-center'}>Class X</th>
              <th className={headerCell + ' text-center'}>Class XII</th>
              <th className={headerCell + ' text-center'}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className={cell + ' text-center text-gray-400'}>
                  No school data available
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.name + i}>
                <td className={cell}>{r.name}</td>
                <td className={cell + ' text-center'}>{r.x || '\u2014'}</td>
                <td className={cell + ' text-center'}>{r.xii || '\u2014'}</td>
                <td className={cell + ' text-center font-semibold'}>{r.total}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className={cell + ' font-bold'}>Total</td>
                <td className={cell + ' text-center font-bold'}>{totalX || '\u2014'}</td>
                <td className={cell + ' text-center font-bold'}>{totalXII || '\u2014'}</td>
                <td className={cell + ' text-center font-bold'}>{grandTotal}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

/** 8. Upcoming Exam Details */
const UpcomingExamDetails: React.FC<{
  entries: CentreDatesheetEntry[]
  selectedDate: string
}> = ({ entries, selectedDate }) => {
  const afterDate = selectedDate || todayIso()

  const upcoming = entries
    .filter((entry) => {
      const d = new Date(entry.examDate)
      return d.toISOString().slice(0, 10) > afterDate
    })
    .slice(0, 5)

  return (
    <div>
      <p className={sectionTitle}>Upcoming Exam Details</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Date</th>
              <th className={headerCell + ' text-left'}>Day</th>
              <th className={headerCell + ' text-left'}>Subject</th>
              <th className={headerCell + ' text-left'}>Code</th>
              <th className={headerCell + ' text-center'}>Class</th>
              <th className={headerCell + ' text-center'}>Candidates</th>
              <th className={headerCell + ' text-center'}>Rooms Req.</th>
              <th className={headerCell + ' text-center'}>Hindi Medium</th>
              <th className={headerCell + ' text-center'}>PwD</th>
              <th className={headerCell + ' text-center'}>Scribe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={10} className={cell + ' text-center text-gray-400'}>
                  No upcoming exams
                </td>
              </tr>
            )}
            {upcoming.map((entry, i) => {
              const d = new Date(entry.examDate)
              const dateStr = d.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })
              const dayName = entry.dayName || d.toLocaleDateString('en-IN', { weekday: 'short' })
              return (
                <tr key={entry._id || i}>
                  <td className={cell}>{dateStr}</td>
                  <td className={cell}>{dayName}</td>
                  <td className={cell}>{entry.subjectName ?? '\u2014'}</td>
                  <td className={cell}>{entry.subjectCode ?? '\u2014'}</td>
                  <td className={cell + ' text-center'}>{entry.class ?? '\u2014'}</td>
                  <td className={cell + ' text-center'}>{entry.candidateCount ?? '\u2014'}</td>
                  <td className={cell + ' text-center'}>{entry.roomsNeeded ?? '\u2014'}</td>
                  <td className={cell + ' text-center'}>{'\u2014'}</td>
                  <td className={cell + ' text-center'}>{'\u2014'}</td>
                  <td className={cell + ' text-center'}>{'\u2014'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 9. Seating & Invigilator Details */
const SeatingInvigilatorDetails: React.FC<{
  data: TodaysExamsResponse
  dutiesData?: DailyDutiesResponse
}> = ({ data, dutiesData }) => {
  const exams = data.exams ?? []

  // Build room rows from dashboard exam data
  type RoomRow = {
    roomNo: string
    candidates: number
    school: string
    inv1: string
    inv1Id: string
    inv2: string
    inv2Id: string
  }

  // Aggregate rooms across all exams
  const roomMap = new Map<
    string,
    { candidates: number; subjects: string[] }
  >()
  exams.forEach((exam) => {
    ;(exam.rooms ?? []).forEach((room) => {
      const cur = roomMap.get(room.roomNo) || { candidates: 0, subjects: [] }
      cur.candidates += room.candidates || 0
      cur.subjects.push(`${exam.subjectName}`)
      roomMap.set(room.roomNo, cur)
    })
  })

  // Build duty lookup by room
  const dutyByRoom = new Map<
    string,
    { inv1Name: string; inv1Id: string; inv2Name: string; inv2Id: string }
  >()
  if (dutiesData?.duties) {
    dutiesData.duties.forEach((duty) => {
      const roomNo = duty.room?.roomNo
      if (!roomNo) return
      dutyByRoom.set(roomNo, {
        inv1Name: duty.functionary?.name ?? '\u2014',
        inv1Id: duty.functionary?.employeeId ?? '',
        inv2Name: duty.functionary2?.name ?? '\u2014',
        inv2Id: duty.functionary2?.employeeId ?? '',
      })
    })
  }

  // School codes from dutiesData
  const schoolByRoom = dutiesData?.roomCandidateSchoolCodes ?? {}

  const rows: RoomRow[] = Array.from(roomMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([roomNo, info]) => {
      const duty = dutyByRoom.get(roomNo)
      const schools = schoolByRoom[roomNo]
      return {
        roomNo,
        candidates: info.candidates,
        school: Array.isArray(schools) ? schools.join(', ') : '\u2014',
        inv1: duty?.inv1Name ?? '\u2014',
        inv1Id: duty?.inv1Id ?? '',
        inv2: duty?.inv2Name ?? '\u2014',
        inv2Id: duty?.inv2Id ?? '',
      }
    })

  return (
    <div>
      <p className={sectionTitle}>Seating &amp; Invigilator Details</p>
      <div className={tableWrapper}>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className={headerCell + ' text-left'}>Room No</th>
              <th className={headerCell + ' text-center'}>Candidates</th>
              <th className={headerCell + ' text-left'}>School</th>
              <th className={headerCell + ' text-left'}>Invigilator 1</th>
              <th className={headerCell + ' text-left'}>Invigilator 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className={cell + ' text-center text-gray-400'}>
                  No seating data available
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.roomNo}>
                <td className={cell + ' font-semibold'}>{r.roomNo}</td>
                <td className={cell + ' text-center'}>{r.candidates}</td>
                <td className={cell}>{r.school}</td>
                <td className={cell}>
                  {r.inv1}
                  {r.inv1Id && (
                    <span className="ml-1 text-[10px] text-gray-400">{r.inv1Id}</span>
                  )}
                </td>
                <td className={cell}>
                  {r.inv2}
                  {r.inv2Id && (
                    <span className="ml-1 text-[10px] text-gray-400">{r.inv2Id}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Loading skeleton for a table section */
const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 4,
  cols = 3,
}) => (
  <div className={tableWrapper + ' animate-pulse'}>
    <div className="h-8 bg-gray-50 dark:bg-gray-800" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex divide-x divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="flex-1 px-3 py-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    ))}
  </div>
)

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------
const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(todayIso())

  // --- data fetching ---
  const {
    data: todaysExamsData,
    isLoading: isDashboardLoading,
  } = useTodaysExams(selectedDate)

  const { data: centreDatesheetEntries } = useCentreDatesheetEntries()

  const dotDate = useMemo(() => isoToDotFormat(selectedDate), [selectedDate])
  const { data: dutiesData } = useDailyDuties(dotDate)

  const { data: answerSheets } = useDashboardAnswerSheets()

  // --- exam timeline items ---
  const examTimelineItems: ExamTimelineItem[] = useMemo(() => {
    const entries = centreDatesheetEntries ?? []
    return entries.map((entry: CentreDatesheetEntry) => {
      const d = new Date(entry.examDate)
      const dateStr = d.toISOString().slice(0, 10)
      return {
        date: dateStr,
        subject: entry.subjectName ?? 'Exam',
        subjectCode: entry.subjectCode,
        class: entry.class,
      }
    })
  }, [centreDatesheetEntries])

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date)
  }, [])

  // --- render ---
  const hasData = !!todaysExamsData
  const centreEntries = centreDatesheetEntries ?? []

  return (
    <div className="h-full min-h-0 flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 min-h-0 flex flex-col p-4 md:p-5 overflow-y-auto space-y-4">
        {/* ── Exam Timeline Date Strip ── */}
        <div className="flex-shrink-0">
          <ExamTimeline
            exams={examTimelineItems}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        </div>

        {/* ── Loading state ── */}
        {isDashboardLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 space-y-4">
              <TableSkeleton rows={8} cols={3} />
              <TableSkeleton rows={5} cols={3} />
              <TableSkeleton rows={4} cols={3} />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <TableSkeleton rows={3} cols={3} />
              <TableSkeleton rows={6} cols={2} />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <TableSkeleton rows={4} cols={2} />
              <TableSkeleton rows={6} cols={2} />
            </div>
          </div>
        )}

        {/* ── Main Grid Layout ── */}
        {hasData && !isDashboardLoading && (todaysExamsData?.totalExams ?? 0) > 0 && (
          <>
            {/* ROW 1: Candidate Details | PwD Candidates + Duties Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Candidate Details */}
              <div className="lg:col-span-5">
                <CandidateDetails data={todaysExamsData} />
              </div>

              {/* Middle: PwD Candidates */}
              <div className="lg:col-span-4">
                <PwdCandidates data={todaysExamsData} />
              </div>

              {/* Right: Duties Summary */}
              <div className="lg:col-span-3">
                <DutiesSummary dashData={todaysExamsData} dutiesData={dutiesData} />
              </div>
            </div>

            {/* ROW 2: Answer Sheet Detail | Status Tracker */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Answer Sheet Detail */}
              <div className="lg:col-span-5">
                <AnswerSheetDetail
                  dashData={todaysExamsData}
                  sheets={answerSheets ?? []}
                />
              </div>

              {/* Middle: Packing Details */}
              <div className="lg:col-span-4">
                <PackingDetails data={todaysExamsData} />
              </div>

              {/* Right: Status Tracker */}
              <div className="lg:col-span-3">
                <StatusTracker data={todaysExamsData} dutiesData={dutiesData} />
              </div>
            </div>

            {/* ROW 3: School Wise Distribution | Upcoming Exam Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5">
                <SchoolWiseDistribution data={todaysExamsData} />
              </div>
              <div className="lg:col-span-7">
                <UpcomingExamDetails
                  entries={centreEntries}
                  selectedDate={selectedDate}
                />
              </div>
            </div>

            {/* ROW 4: Seating & Invigilator Details (full width) */}
            <SeatingInvigilatorDetails
              data={todaysExamsData}
              dutiesData={dutiesData}
            />
          </>
        )}

        {/* ── No exams state ── */}
        {hasData && !isDashboardLoading && (todaysExamsData?.totalExams ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <svg
              className="w-16 h-16 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium">No exams scheduled for {todaysExamsData?.dayName || 'this date'}</p>
            <p className="text-xs mt-1">Select another date from the timeline above</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
