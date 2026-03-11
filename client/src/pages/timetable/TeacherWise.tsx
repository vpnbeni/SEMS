import React, { useMemo, useState, useEffect } from 'react'
import { useTimetable, WEEKDAYS, type TimetableClass } from '@/contexts/TimetableContext'
import bellTimingsService, { type BellTimingRowPayload } from '@/services/bellTimingsService'

/* ══════════════════════════════ Types ══════════════════════════════ */

/** A single entry in a teacher's schedule */
interface TeacherSlot {
  classId: string
  className: string
  section: string
  subject: string
}

/** Full schedule for one teacher: day → period slot → entry */
type TeacherSchedule = Record<string, Record<number, TeacherSlot>>

/** Aggregated teacher info for display */
interface TeacherInfo {
  name: string
  schedule: TeacherSchedule
  totalPeriods: number
  uniqueClasses: string[]     // "10-A", "10-B" etc
  uniqueSubjects: string[]
}

/* ══════════════════════════════ Helpers ══════════════════════════════ */

const SHORT_DAYS: Record<string, string> = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED',
  Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT',
}

/** Stable colour palette for classes */
const CLASS_COLORS: Record<string, { bg: string; text: string }> = {}
const PALETTE = [
  { bg: '#eef2ff', text: '#4338ca' },
  { bg: '#f0fdf4', text: '#166534' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#e0f2fe', text: '#075985' },
  { bg: '#fae8ff', text: '#6b21a8' },
  { bg: '#fff7ed', text: '#9a3412' },
  { bg: '#f1f5f9', text: '#334155' },
  { bg: '#ecfdf5', text: '#065f46' },
  { bg: '#fef2f2', text: '#991b1b' },
  { bg: '#eff6ff', text: '#1e40af' },
  { bg: '#f5f3ff', text: '#5b21b6' },
]
let _colorIdx = 0
const getClassColor = (classKey: string) => {
  if (!CLASS_COLORS[classKey]) {
    CLASS_COLORS[classKey] = PALETTE[_colorIdx % PALETTE.length]
    _colorIdx++
  }
  return CLASS_COLORS[classKey]
}

const FALLBACK_START_MINUTES = 8 * 60

const parseTimeToMinutes = (value: string): number => {
  const [hoursRaw, minutesRaw] = String(value || '').split(':')
  const hours = Number.parseInt(hoursRaw, 10)
  const minutes = Number.parseInt(minutesRaw, 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return FALLBACK_START_MINUTES
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return FALLBACK_START_MINUTES
  return hours * 60 + minutes
}

const formatMinutesTo12Hour = (value: number): string => {
  const normalized = ((value % 1440) + 1440) % 1440
  const hours24 = Math.floor(normalized / 60)
  const minutes = String(normalized % 60).padStart(2, '0')
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
  return `${String(hours12).padStart(2, '0')}:${minutes} ${suffix}`
}

const buildPeriodTimeRanges = (startTime: string, rows: BellTimingRowPayload[]): string[] => {
  let cursor = parseTimeToMinutes(startTime)
  const periodRanges: string[] = []

  rows.forEach((row) => {
    const duration = Number.isFinite(row.duration) && row.duration > 0
      ? row.duration
      : row.type === 'break'
        ? 15
        : 40
    const from = cursor
    const to = cursor + duration

    if (row.type === 'period') {
      periodRanges.push(`${formatMinutesTo12Hour(from)} - ${formatMinutesTo12Hour(to)}`)
    }

    cursor = to
  })

  return periodRanges
}

/* ══════════════════════════════ Component ══════════════════════════════ */

const TeacherWise: React.FC = () => {
  const {
    classes,
    teachers,
    periodsPerDay,
    timetableGrid,
  } = useTimetable()

  const [searchQuery, setSearchQuery] = useState('')
  const [periodTimeRanges, setPeriodTimeRanges] = useState<string[]>([])

  // Build a class lookup
  const classMap = useMemo(() => {
    const map = new Map<string, TimetableClass>()
    classes.forEach((c) => map.set(c.id, c))
    return map
  }, [classes])

  // Period slots array
  const periodSlots = useMemo(
    () => Array.from({ length: periodsPerDay }, (_, i) => i),
    [periodsPerDay]
  )

  const periodHeaderTimes = useMemo(
    () => periodSlots.map((slot) => periodTimeRanges[slot] || '-'),
    [periodSlots, periodTimeRanges]
  )

  useEffect(() => {
    let isMounted = true

    const loadBellTimings = async () => {
      try {
        const saved = await bellTimingsService.getBellTimings()
        if (!isMounted) return
        setPeriodTimeRanges(buildPeriodTimeRanges(saved.startTime, saved.rows))
      } catch {
        if (!isMounted) return
        setPeriodTimeRanges([])
      }
    }

    void loadBellTimings()

    return () => {
      isMounted = false
    }
  }, [])

  // Derive teacher schedules from the timetable grid
  const teacherInfos: TeacherInfo[] = useMemo(() => {
    const map = new Map<string, { schedule: TeacherSchedule; classSet: Set<string>; subjectSet: Set<string>; count: number }>()

    // Scan all grid cells
    for (const classId of Object.keys(timetableGrid)) {
      const cls = classMap.get(classId)
      if (!cls) continue
      const classDays = timetableGrid[classId]
      for (const day of Object.keys(classDays)) {
        const slots = classDays[day]
        for (const slotStr of Object.keys(slots)) {
          const slot = Number(slotStr)
          const cell = slots[slot]
          if (!cell.teacher) continue

          const tName = cell.teacher
          if (!map.has(tName)) {
            map.set(tName, { schedule: {}, classSet: new Set(), subjectSet: new Set(), count: 0 })
          }
          const entry = map.get(tName)!
          if (!entry.schedule[day]) entry.schedule[day] = {}
          entry.schedule[day][slot] = {
            classId,
            className: cls.className,
            section: cls.section,
            subject: cell.subject,
          }
          entry.classSet.add(`${cls.className}-${cls.section}`)
          if (cell.subject) entry.subjectSet.add(cell.subject)
          entry.count++
        }
      }
    }

    // Also include teachers from the teachers list that have no assignments
    for (const t of teachers) {
      if (!map.has(t.name)) {
        map.set(t.name, { schedule: {}, classSet: new Set(), subjectSet: new Set(), count: 0 })
      }
    }

    // Convert to sorted array
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        schedule: data.schedule,
        totalPeriods: data.count,
        uniqueClasses: Array.from(data.classSet).sort(),
        uniqueSubjects: Array.from(data.subjectSet).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [timetableGrid, classMap, teachers])

  // Filter by search
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teacherInfos
    const q = searchQuery.toLowerCase()
    return teacherInfos.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.uniqueSubjects.some((s) => s.toLowerCase().includes(q)) ||
        t.uniqueClasses.some((c) => c.toLowerCase().includes(q))
    )
  }, [teacherInfos, searchQuery])

  // Overall stats
  const overallStats = useMemo(() => ({
    totalTeachers: teacherInfos.length,
    assignedTeachers: teacherInfos.filter((t) => t.totalPeriods > 0).length,
    totalAssignments: teacherInfos.reduce((s, t) => s + t.totalPeriods, 0),
  }), [teacherInfos])

  return (
    <div className="tw-page">
      <style>{`
        /* ───────── Page ───────── */
        .tw-page {
          padding: 12px 32px 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ───────── Top bar ───────── */
        .tw-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .tw-top-bar p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
        }
        .dark .tw-top-bar p { color: #94a3b8; }

        /* ───────── Search ───────── */
        .tw-search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tw-search {
          padding: 7px 14px 7px 36px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.85rem;
          outline: none;
          background: #fff;
          color: #334155;
          width: 260px;
          transition: all 0.2s ease;
        }
        .dark .tw-search {
          background: #1e293b;
          border-color: #475569;
          color: #e2e8f0;
        }
        .tw-search:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .tw-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #94a3b8;
          pointer-events: none;
        }

        /* ───────── Summary bar ───────── */
        .tw-summary {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .tw-summary-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid #e8ecf1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .dark .tw-summary-card {
          background: #1e293b;
          border-color: #334155;
        }
        .tw-summary-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tw-summary-icon svg { width: 18px; height: 18px; color: #fff; }
        .tw-summary-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.1;
        }
        .dark .tw-summary-value { color: #f1f5f9; }
        .tw-summary-label {
          font-size: 0.62rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .tw-bg-indigo { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .tw-bg-green { background: linear-gradient(135deg, #10b981, #059669); }
        .tw-bg-amber { background: linear-gradient(135deg, #f59e0b, #d97706); }

        /* ───────── Teacher card ───────── */
        .tw-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04);
          overflow: hidden;
          margin-bottom: 24px;
          border: 1px solid #e8ecf1;
          transition: box-shadow 0.3s ease;
        }
        .tw-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 10px 36px rgba(0,0,0,0.06);
        }
        .dark .tw-card {
          background: #1e293b;
          border-color: #334155;
        }

        /* ───────── Card header ───────── */
        .tw-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dark .tw-card-header {
          background: linear-gradient(135deg, #1e2a3e 0%, #2a1e3e 100%);
          border-color: #334155;
        }
        .tw-card-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dark .tw-card-header h3 { color: #f1f5f9; }
        .tw-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .tw-header-icon svg {
          width: 18px;
          height: 18px;
          color: #fff;
        }
        .tw-header-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tw-stat-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .tw-stat-indigo {
          background: #eef2ff;
          color: #4f46e5;
        }
        .dark .tw-stat-indigo {
          background: #312e8133;
          color: #a5b4fc;
        }
        .tw-stat-green {
          background: #ecfdf5;
          color: #059669;
        }
        .dark .tw-stat-green {
          background: #064e3b33;
          color: #34d399;
        }
        .tw-stat-amber {
          background: #fef3c7;
          color: #92400e;
        }
        .dark .tw-stat-amber {
          background: #78350f33;
          color: #fbbf24;
        }

        /* ───────── Grid ───────── */
        .tw-grid-wrap {
          overflow-x: auto;
        }
        .tw-grid {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .tw-grid thead th {
          padding: 10px 6px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #475569;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          text-align: center;
          white-space: nowrap;
        }
        .dark .tw-grid thead th {
          background: linear-gradient(180deg, #1e293b 0%, #1a2536 100%);
          color: #94a3b8;
          border-color: #334155;
        }
        .tw-grid thead th.tw-th-day {
          width: 80px;
          min-width: 80px;
          text-align: left;
          padding-left: 16px;
        }
        .tw-grid thead tr.tw-time-row th {
          padding: 6px 6px;
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          text-transform: none;
          color: #64748b;
          background: #f8fafc;
        }
        .dark .tw-grid thead tr.tw-time-row th {
          color: #94a3b8;
          background: #1a2536;
        }
        .tw-grid thead tr.tw-time-row th.tw-th-day {
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
        }
        .tw-grid tbody td {
          padding: 0;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
          height: 56px;
        }
        .dark .tw-grid tbody td {
          border-color: #334155;
        }
        .tw-grid tbody td.tw-td-day {
          padding: 8px 16px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          background: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          width: 80px;
          min-width: 80px;
        }
        .dark .tw-grid tbody td.tw-td-day {
          color: #94a3b8;
          background: #1a2536;
        }
        .tw-grid tbody tr:hover td {
          background: #fafaff;
        }
        .dark .tw-grid tbody tr:hover td {
          background: #1e2a3e;
        }
        .tw-grid tbody tr:hover td.tw-td-day {
          background: #f0f1f8;
        }
        .dark .tw-grid tbody tr:hover td.tw-td-day {
          background: #1a2a40;
        }

        /* ───────── Cell ───────── */
        .tw-cell {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4px;
          min-height: 54px;
        }
        .tw-cell-empty {
          color: #e2e8f0;
          font-size: 0.72rem;
          font-style: italic;
        }
        .dark .tw-cell-empty { color: #334155; }
        .tw-cell-filled {
          border-radius: 6px;
          margin: 3px;
          padding: 4px 6px;
          text-align: center;
        }
        .tw-cell-class {
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .tw-cell-subject {
          font-size: 0.62rem;
          font-weight: 500;
          line-height: 1.2;
          opacity: 0.75;
          margin-top: 1px;
        }
        .tw-cell-free {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 54px;
        }
        .tw-free-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: #10b981;
          background: #ecfdf5;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .dark .tw-free-badge {
          background: #064e3b33;
          color: #34d399;
        }

        /* ───────── No assignment state ───────── */
        .tw-no-assign {
          padding: 20px 24px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
          font-style: italic;
        }

        /* ───────── Empty state ───────── */
        .tw-empty {
          padding: 48px 24px;
          text-align: center;
        }
        .tw-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tw-empty-icon svg {
          width: 32px;
          height: 32px;
          color: #94a3b8;
        }
        .tw-empty h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 6px;
        }
        .dark .tw-empty h3 { color: #f1f5f9; }
        .tw-empty p {
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0 0 6px;
        }
        .tw-empty a {
          color: #6366f1;
          font-weight: 600;
          text-decoration: none;
        }
        .tw-empty a:hover { text-decoration: underline; }

        /* ───────── Day summary row ───────── */
        .tw-day-summary {
          padding: 8px 16px;
          font-size: 0.72rem;
          font-weight: 700;
          text-align: center;
          color: #64748b;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
        }
        .dark .tw-day-summary {
          background: #1a2536;
          color: #94a3b8;
          border-color: #334155;
        }
      `}</style>

      {/* ── Top bar ── */}
      <div className="tw-top-bar">
        <p>View each teacher's weekly schedule derived from class-wise timetable assignments</p>
        <div className="tw-search-wrap" style={{ position: 'relative' }}>
          <svg className="tw-search-icon" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            className="tw-search"
            placeholder="Search teacher, subject, class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Summary cards ── */}
      {teacherInfos.length > 0 && (
        <div className="tw-summary">
          <div className="tw-summary-card">
            <div className="tw-summary-icon tw-bg-indigo">
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div>
              <div className="tw-summary-value">{overallStats.totalTeachers}</div>
              <div className="tw-summary-label">Teachers</div>
            </div>
          </div>
          <div className="tw-summary-card">
            <div className="tw-summary-icon tw-bg-green">
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="tw-summary-value">{overallStats.assignedTeachers}</div>
              <div className="tw-summary-label">Assigned</div>
            </div>
          </div>
          <div className="tw-summary-card">
            <div className="tw-summary-icon tw-bg-amber">
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="tw-summary-value">{overallStats.totalAssignments}</div>
              <div className="tw-summary-label">Total Periods</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty: no teachers and no assignments ── */}
      {teacherInfos.length === 0 && (
        <div className="tw-card">
          <div className="tw-empty">
            <div className="tw-empty-icon">
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3>No Teacher Schedules</h3>
            <p>
              Assign teachers to periods on the <a href="#/time-table/class-wise">Class Wise</a> timetable page.
              Teacher schedules will appear here automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── No results from search ── */}
      {teacherInfos.length > 0 && filteredTeachers.length === 0 && (
        <div className="tw-card">
          <div className="tw-empty">
            <div className="tw-empty-icon">
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3>No Results</h3>
            <p>No teachers match "{searchQuery}". Try a different search term.</p>
          </div>
        </div>
      )}

      {/* ── Teacher cards ── */}
      {filteredTeachers.map((teacher) => {
        const maxSlots = periodsPerDay * WEEKDAYS.length
        const freeSlots = maxSlots - teacher.totalPeriods

        return (
          <div key={teacher.name} className="tw-card">
            {/* Header */}
            <div className="tw-card-header">
              <h3>
                <span className="tw-header-icon">
                  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                {teacher.name}
              </h3>
              <div className="tw-header-stats">
                <span className="tw-stat-pill tw-stat-indigo">
                  {teacher.totalPeriods} period{teacher.totalPeriods !== 1 ? 's' : ''}
                </span>
                {freeSlots > 0 && (
                  <span className="tw-stat-pill tw-stat-green">
                    {freeSlots} free
                  </span>
                )}
                {teacher.uniqueClasses.length > 0 && (
                  <span className="tw-stat-pill tw-stat-amber">
                    {teacher.uniqueClasses.length} class{teacher.uniqueClasses.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Grid or no-assignment notice */}
            {teacher.totalPeriods === 0 ? (
              <div className="tw-no-assign">No periods assigned yet</div>
            ) : (
              <div className="tw-grid-wrap">
                <table className="tw-grid">
                  <thead>
                    <tr>
                      <th className="tw-th-day">Day</th>
                      {periodSlots.map((slot) => (
                        <th key={slot}>Period {slot + 1}</th>
                      ))}
                    </tr>
                    <tr className="tw-time-row">
                      <th className="tw-th-day">Time</th>
                      {periodSlots.map((slot) => (
                        <th key={`period-time-${slot}`}>{periodHeaderTimes[slot]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKDAYS.map((day) => (
                      <tr key={day}>
                        <td className="tw-td-day">{SHORT_DAYS[day]}</td>
                        {periodSlots.map((slot) => {
                          const entry = teacher.schedule[day]?.[slot]
                          if (!entry) {
                            return (
                              <td key={slot}>
                                <div className="tw-cell-free">
                                  <span className="tw-free-badge">FREE</span>
                                </div>
                              </td>
                            )
                          }
                          const classKey = `${entry.className}-${entry.section}`
                          const color = getClassColor(classKey)
                          return (
                            <td key={slot}>
                              <div className="tw-cell">
                                <div
                                  className="tw-cell-filled"
                                  style={{ background: color.bg, color: color.text }}
                                >
                                  <div className="tw-cell-class">{classKey}</div>
                                  <div className="tw-cell-subject" style={{ color: color.text }}>{entry.subject}</div>
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TeacherWise
