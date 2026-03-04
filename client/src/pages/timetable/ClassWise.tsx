import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTimetable, WEEKDAYS, EMPTY_CELL, type TimetableCell } from '@/contexts/TimetableContext'

/* ══════════════════════════════ Helpers ══════════════════════════════ */

/** Stable colour palette for subjects — same subject always gets same colour */
const SUBJECT_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {}
const PALETTE = [
  { bg: '#eef2ff', text: '#4338ca', darkBg: '#312e8144', darkText: '#a5b4fc' },
  { bg: '#f0fdf4', text: '#166534', darkBg: '#14532d44', darkText: '#86efac' },
  { bg: '#fef3c7', text: '#92400e', darkBg: '#78350f44', darkText: '#fcd34d' },
  { bg: '#fce7f3', text: '#9d174d', darkBg: '#831843aa', darkText: '#f9a8d4' },
  { bg: '#e0f2fe', text: '#075985', darkBg: '#0c4a6e44', darkText: '#7dd3fc' },
  { bg: '#fae8ff', text: '#6b21a8', darkBg: '#581c8744', darkText: '#d8b4fe' },
  { bg: '#fff7ed', text: '#9a3412', darkBg: '#7c2d1244', darkText: '#fdba74' },
  { bg: '#f1f5f9', text: '#334155', darkBg: '#33415544', darkText: '#cbd5e1' },
  { bg: '#ecfdf5', text: '#065f46', darkBg: '#064e3b44', darkText: '#6ee7b7' },
  { bg: '#fef2f2', text: '#991b1b', darkBg: '#7f1d1d44', darkText: '#fca5a5' },
  { bg: '#eff6ff', text: '#1e40af', darkBg: '#1e3a5f44', darkText: '#93c5fd' },
  { bg: '#f5f3ff', text: '#5b21b6', darkBg: '#4c1d9544', darkText: '#c4b5fd' },
]

let _colorIdx = 0
const getSubjectColor = (subject: string) => {
  if (!SUBJECT_COLORS[subject]) {
    SUBJECT_COLORS[subject] = PALETTE[_colorIdx % PALETTE.length]
    _colorIdx++
  }
  return SUBJECT_COLORS[subject]
}

/** Short day names for compact display */
const SHORT_DAYS: Record<string, string> = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED',
  Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT',
}

/* ══════════════════════════════ Component ══════════════════════════════ */

const ClassWise: React.FC = () => {
  const {
    classes,
    teachers,
    periodsPerDay,
    timetableGrid,
    setGridCell,
    clearGridForClass,
  } = useTimetable()

  // Selected class
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  // Cell editor state
  const [editingCell, setEditingCell] = useState<{ day: string; slot: number } | null>(null)
  const [cellDraft, setCellDraft] = useState<TimetableCell>({ ...EMPTY_CELL })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-select first class if none selected
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  )

  // If the selected class is deleted or no selection, pick first
  useMemo(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClassId(classes[0].id)
    }
  }, [selectedClass, classes])

  // Period slots array [0, 1, 2, ... periodsPerDay-1]
  const periodSlots = useMemo(
    () => Array.from({ length: periodsPerDay }, (_, i) => i),
    [periodsPerDay]
  )

  // Get a cell from the grid
  const getCell = useCallback(
    (classId: string, day: string, slot: number): TimetableCell => {
      return timetableGrid[classId]?.[day]?.[slot] ?? EMPTY_CELL
    },
    [timetableGrid]
  )

  // Stats for selected class
  const stats = useMemo(() => {
    if (!selectedClass) return { filled: 0, total: 0, bySubject: {} as Record<string, number> }
    const total = periodsPerDay * WEEKDAYS.length
    let filled = 0
    const bySubject: Record<string, number> = {}
    for (const day of WEEKDAYS) {
      for (let slot = 0; slot < periodsPerDay; slot++) {
        const cell = getCell(selectedClass.id, day, slot)
        if (cell.subject) {
          filled++
          bySubject[cell.subject] = (bySubject[cell.subject] || 0) + 1
        }
      }
    }
    return { filled, total, bySubject }
  }, [selectedClass, periodsPerDay, getCell])

  // Open cell editor
  const openEditor = useCallback((day: string, slot: number) => {
    if (!selectedClass) return
    const existing = getCell(selectedClass.id, day, slot)
    setCellDraft({ subject: existing.subject, teacher: existing.teacher })
    setEditingCell({ day, slot })
  }, [selectedClass, getCell])

  // Save cell
  const saveCell = useCallback(() => {
    if (!selectedClass || !editingCell) return
    setGridCell(selectedClass.id, editingCell.day, editingCell.slot, { ...cellDraft })
    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })
  }, [selectedClass, editingCell, cellDraft, setGridCell])

  // Clear a single cell
  const clearCell = useCallback(() => {
    if (!selectedClass || !editingCell) return
    setGridCell(selectedClass.id, editingCell.day, editingCell.slot, { ...EMPTY_CELL })
    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })
  }, [selectedClass, editingCell, setGridCell])

  // Close editor
  const closeEditor = useCallback(() => {
    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })
  }, [])

  // Click outside to close editor
  useEffect(() => {
    if (!editingCell) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeEditor()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editingCell, closeEditor])

  // Teachers filtered by subject for dropdown
  const getTeachersForSubject = useCallback(
    (subject: string) => {
      if (!subject) return teachers
      return teachers.filter((t) => t.subjects.length === 0 || t.subjects.includes(subject))
    },
    [teachers]
  )

  // Check teacher conflict: is teacher already assigned elsewhere at this day+slot?
  const hasTeacherConflict = useCallback(
    (teacherName: string, day: string, slot: number, excludeClassId: string): string | null => {
      if (!teacherName) return null
      for (const cls of classes) {
        if (cls.id === excludeClassId) continue
        const cell = getCell(cls.id, day, slot)
        if (cell.teacher === teacherName) {
          return `${cls.className}-${cls.section}`
        }
      }
      return null
    },
    [classes, getCell]
  )

  return (
    <div className="cw-page">
      <style>{`
        /* ───────── Page ───────── */
        .cw-page {
          padding: 12px 32px 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ───────── Top bar ───────── */
        .cw-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .cw-top-bar p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
        }
        .dark .cw-top-bar p { color: #94a3b8; }

        /* ───────── Class selector ───────── */
        .cw-class-selector {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .cw-class-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
        }
        .dark .cw-class-label { color: #cbd5e1; }
        .cw-class-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cw-class-tab {
          padding: 6px 16px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 600;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .dark .cw-class-tab {
          background: #1e293b;
          border-color: #475569;
          color: #94a3b8;
        }
        .cw-class-tab:hover {
          border-color: #6366f1;
          color: #4f46e5;
          background: #eef2ff;
        }
        .dark .cw-class-tab:hover {
          border-color: #818cf8;
          color: #a5b4fc;
          background: #312e8133;
        }
        .cw-class-tab-active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
          color: #fff !important;
          border-color: transparent !important;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
        }

        /* ───────── Card ───────── */
        .cw-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04);
          overflow: hidden;
          margin-bottom: 24px;
          border: 1px solid #e8ecf1;
          transition: box-shadow 0.3s ease;
        }
        .cw-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 10px 36px rgba(0,0,0,0.06);
        }
        .dark .cw-card {
          background: #1e293b;
          border-color: #334155;
        }

        /* ───────── Card header ───────── */
        .cw-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dark .cw-card-header {
          background: linear-gradient(135deg, #1e2a3e 0%, #2a1e3e 100%);
          border-color: #334155;
        }
        .cw-card-header h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dark .cw-card-header h3 { color: #f1f5f9; }
        .cw-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .cw-header-icon svg {
          width: 18px;
          height: 18px;
          color: #fff;
        }

        /* ───────── Header stats ───────── */
        .cw-header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .cw-stat-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .cw-stat-indigo {
          background: #eef2ff;
          color: #4f46e5;
        }
        .dark .cw-stat-indigo {
          background: #312e8133;
          color: #a5b4fc;
        }
        .cw-stat-green {
          background: #ecfdf5;
          color: #059669;
        }
        .dark .cw-stat-green {
          background: #064e3b33;
          color: #34d399;
        }
        .cw-stat-amber {
          background: #fef3c7;
          color: #92400e;
        }
        .dark .cw-stat-amber {
          background: #78350f33;
          color: #fbbf24;
        }

        /* ───────── Header actions ───────── */
        .cw-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .cw-btn svg { width: 14px; height: 14px; }
        .cw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cw-btn-danger {
          background: #fff;
          color: #ef4444;
          border: 1.5px solid #fecaca;
        }
        .dark .cw-btn-danger {
          background: #1e293b;
          border-color: #7f1d1d;
          color: #fca5a5;
        }
        .cw-btn-danger:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        /* ───────── Grid table ───────── */
        .cw-grid-wrap {
          overflow-x: auto;
        }
        .cw-grid {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .cw-grid thead th {
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
        .dark .cw-grid thead th {
          background: linear-gradient(180deg, #1e293b 0%, #1a2536 100%);
          color: #94a3b8;
          border-color: #334155;
        }
        .cw-grid thead th.cw-th-day {
          width: 80px;
          min-width: 80px;
          text-align: left;
          padding-left: 16px;
        }
        .cw-grid tbody td {
          padding: 0;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
          height: 64px;
          position: relative;
        }
        .dark .cw-grid tbody td {
          border-color: #334155;
        }
        .cw-grid tbody td.cw-td-day {
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
        .dark .cw-grid tbody td.cw-td-day {
          color: #94a3b8;
          background: #1a2536;
        }
        .cw-grid tbody tr:hover td {
          background: #fafaff;
        }
        .dark .cw-grid tbody tr:hover td {
          background: #1e2a3e;
        }
        .cw-grid tbody tr:hover td.cw-td-day {
          background: #f0f1f8;
        }
        .dark .cw-grid tbody tr:hover td.cw-td-day {
          background: #1a2a40;
        }

        /* ───────── Cell ───────── */
        .cw-cell {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 4px;
          transition: all 0.15s ease;
          user-select: none;
          min-height: 62px;
        }
        .cw-cell:hover {
          background: #eef2ff;
        }
        .dark .cw-cell:hover {
          background: #312e8122;
        }
        .cw-cell-empty {
          color: #cbd5e1;
          font-size: 0.72rem;
        }
        .dark .cw-cell-empty {
          color: #475569;
        }
        .cw-cell-empty:hover {
          color: #6366f1;
        }
        .cw-cell-filled {
          border-radius: 6px;
          margin: 3px;
          padding: 4px 6px;
        }
        .cw-cell-subject {
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
        }
        .cw-cell-teacher {
          font-size: 0.62rem;
          font-weight: 500;
          line-height: 1.2;
          text-align: center;
          opacity: 0.75;
          margin-top: 2px;
        }

        /* ───────── Cell editor dropdown ───────── */
        .cw-editor-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
        }
        .cw-editor {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          margin-top: 4px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          padding: 12px;
          min-width: 220px;
          white-space: nowrap;
        }
        .dark .cw-editor {
          background: #1e293b;
          border-color: #475569;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .cw-editor-title {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        .cw-editor-field {
          margin-bottom: 10px;
        }
        .cw-editor-field label {
          display: block;
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 4px;
        }
        .dark .cw-editor-field label { color: #94a3b8; }
        .cw-editor-select {
          width: 100%;
          padding: 6px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          background: #fff;
          color: #334155;
          transition: border-color 0.15s;
        }
        .dark .cw-editor-select {
          background: #0f172a;
          border-color: #475569;
          color: #e2e8f0;
        }
        .cw-editor-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .cw-editor-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          padding-top: 4px;
          border-top: 1px solid #f1f5f9;
          margin-top: 4px;
        }
        .dark .cw-editor-actions {
          border-color: #334155;
        }
        .cw-editor-btn {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cw-editor-btn-save {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
        }
        .cw-editor-btn-save:hover {
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }
        .cw-editor-btn-clear {
          background: none;
          color: #ef4444;
        }
        .cw-editor-btn-clear:hover {
          background: #fef2f2;
        }
        .cw-editor-btn-cancel {
          background: none;
          color: #94a3b8;
        }
        .cw-editor-btn-cancel:hover {
          background: #f1f5f9;
          color: #64748b;
        }
        .dark .cw-editor-btn-cancel:hover {
          background: #334155;
          color: #cbd5e1;
        }
        .cw-conflict-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: #ef4444;
          margin-top: 2px;
        }
        .dark .cw-conflict-badge { color: #fca5a5; }

        /* ───────── Subject legend ───────── */
        .cw-legend {
          padding: 12px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .dark .cw-legend {
          border-color: #334155;
        }
        .cw-legend-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-right: 8px;
        }
        .cw-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 600;
        }
        .cw-legend-count {
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.6;
        }

        /* ───────── Empty state ───────── */
        .cw-empty {
          padding: 48px 24px;
          text-align: center;
        }
        .cw-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cw-empty-icon svg {
          width: 32px;
          height: 32px;
          color: #94a3b8;
        }
        .cw-empty h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 6px;
        }
        .dark .cw-empty h3 { color: #f1f5f9; }
        .cw-empty p {
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0 0 6px;
        }
        .cw-empty a {
          color: #6366f1;
          font-weight: 600;
          text-decoration: none;
        }
        .cw-empty a:hover { text-decoration: underline; }

        /* ───────── No subjects notice ───────── */
        .cw-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #92400e;
          background: #fef3c7;
          border-bottom: 1px solid #fde68a;
        }
        .dark .cw-notice {
          background: #78350f33;
          border-color: #92400e;
          color: #fbbf24;
        }
        .cw-notice svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .cw-notice a {
          color: inherit;
          font-weight: 700;
          text-decoration: underline;
        }

        /* ───────── No teachers notice ───────── */
        .cw-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          font-size: 0.78rem;
          font-weight: 500;
          color: #1e40af;
          background: #eff6ff;
          border-bottom: 1px solid #bfdbfe;
        }
        .dark .cw-info {
          background: #1e3a5f33;
          border-color: #1e40af;
          color: #93c5fd;
        }
        .cw-info svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
      `}</style>

      {/* ── Top bar ── */}
      <div className="cw-top-bar">
        <p>Assign subjects and teachers to each period for every class</p>
      </div>

      {/* ── Empty state: no classes ── */}
      {classes.length === 0 && (
        <div className="cw-card">
          <div className="cw-empty">
            <div className="cw-empty-icon">
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3>No Classes to Schedule</h3>
            <p>Add classes on the <a href="#/time-table/classes">Classes</a> page first, then come back here to build timetables.</p>
          </div>
        </div>
      )}

      {/* ── Class tabs ── */}
      {classes.length > 0 && (
        <>
          <div className="cw-class-selector" style={{ marginBottom: 20 }}>
            <span className="cw-class-label">Select Class:</span>
            <div className="cw-class-tabs">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  className={`cw-class-tab ${selectedClassId === cls.id ? 'cw-class-tab-active' : ''}`}
                  onClick={() => setSelectedClassId(cls.id)}
                >
                  {cls.className}-{cls.section}
                </button>
              ))}
            </div>
          </div>

          {/* ── Selected class grid ── */}
          {selectedClass && (
            <div className="cw-card">
              {/* Header */}
              <div className="cw-card-header">
                <h3>
                  <span className="cw-header-icon">
                    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </span>
                  {selectedClass.className} — Section {selectedClass.section}
                </h3>
                <div className="cw-header-stats">
                  <span className="cw-stat-pill cw-stat-indigo">
                    {stats.filled} / {stats.total} filled
                  </span>
                  <span className={`cw-stat-pill ${stats.filled === stats.total && stats.total > 0 ? 'cw-stat-green' : 'cw-stat-amber'}`}>
                    {stats.total - stats.filled} free
                  </span>
                  {selectedClass.incharge && (
                    <span className="cw-stat-pill cw-stat-indigo">
                      Incharge: {selectedClass.incharge}
                    </span>
                  )}
                </div>
                <button
                  className="cw-btn cw-btn-danger"
                  onClick={() => {
                    if (window.confirm(`Clear all timetable entries for ${selectedClass.className}-${selectedClass.section}?`)) {
                      clearGridForClass(selectedClass.id)
                    }
                  }}
                  disabled={stats.filled === 0}
                >
                  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Clear All
                </button>
              </div>

              {/* No subjects warning */}
              {selectedClass.subjects.length === 0 && (
                <div className="cw-notice">
                  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span>This class has no subjects assigned. <a href="#/time-table/classes">Assign subjects</a> first.</span>
                </div>
              )}

              {/* No teachers info */}
              {teachers.length === 0 && selectedClass.subjects.length > 0 && (
                <div className="cw-info">
                  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <span>No teachers added yet. You can still assign subjects to periods. Add teachers on the Classes page (Incharge field) or they will be available once the teachers list is set up.</span>
                </div>
              )}

              {/* Grid */}
              {selectedClass.subjects.length > 0 && (
                <div className="cw-grid-wrap">
                  <table className="cw-grid">
                    <thead>
                      <tr>
                        <th className="cw-th-day">Day</th>
                        {periodSlots.map((slot) => (
                          <th key={slot}>Period {slot + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {WEEKDAYS.map((day) => (
                        <tr key={day}>
                          <td className="cw-td-day">{SHORT_DAYS[day]}</td>
                          {periodSlots.map((slot) => {
                            const cell = getCell(selectedClass.id, day, slot)
                            const isEditing = editingCell?.day === day && editingCell?.slot === slot
                            const color = cell.subject ? getSubjectColor(cell.subject) : null

                            return (
                              <td key={slot} style={{ position: 'relative' }}>
                                <div
                                  className="cw-cell"
                                  onClick={() => openEditor(day, slot)}
                                  style={color ? {
                                    background: `var(--cw-cell-bg, ${color.bg})`,
                                  } : undefined}
                                >
                                  {cell.subject ? (
                                    <div
                                      className="cw-cell-filled"
                                      style={{
                                        background: color!.bg,
                                        color: color!.text,
                                      }}
                                    >
                                      <div className="cw-cell-subject">{cell.subject}</div>
                                      {cell.teacher && (
                                        <div className="cw-cell-teacher" style={{ color: color!.text }}>{cell.teacher}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="cw-cell-empty">+</span>
                                  )}
                                </div>

                                {/* Cell editor dropdown */}
                                {isEditing && (
                                  <div className="cw-editor" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                                    <div className="cw-editor-title">{SHORT_DAYS[day]} — Period {slot + 1}</div>
                                    <div className="cw-editor-field">
                                      <label>Subject</label>
                                      <select
                                        className="cw-editor-select"
                                        value={cellDraft.subject}
                                        onChange={(e) => setCellDraft((p) => ({ ...p, subject: e.target.value, teacher: '' }))}
                                      >
                                        <option value="">— None —</option>
                                        {selectedClass.subjects.map((subj) => (
                                          <option key={subj} value={subj}>{subj}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="cw-editor-field">
                                      <label>Teacher</label>
                                      <select
                                        className="cw-editor-select"
                                        value={cellDraft.teacher}
                                        onChange={(e) => setCellDraft((p) => ({ ...p, teacher: e.target.value }))}
                                        disabled={!cellDraft.subject}
                                      >
                                        <option value="">— None —</option>
                                        {getTeachersForSubject(cellDraft.subject).map((t) => {
                                          const conflict = hasTeacherConflict(t.name, day, slot, selectedClass.id)
                                          return (
                                            <option key={t.id} value={t.name} disabled={!!conflict}>
                                              {t.name}{t.shortName ? ` (${t.shortName})` : ''}{conflict ? ` [busy: ${conflict}]` : ''}
                                            </option>
                                          )
                                        })}
                                      </select>
                                      {cellDraft.teacher && (
                                        (() => {
                                          const conflict = hasTeacherConflict(cellDraft.teacher, day, slot, selectedClass.id)
                                          return conflict ? (
                                            <div className="cw-conflict-badge">Conflict: {cellDraft.teacher} is in {conflict}</div>
                                          ) : null
                                        })()
                                      )}
                                    </div>
                                    <div className="cw-editor-actions">
                                      {cell.subject && (
                                        <button className="cw-editor-btn cw-editor-btn-clear" onClick={clearCell}>Clear</button>
                                      )}
                                      <button className="cw-editor-btn cw-editor-btn-cancel" onClick={closeEditor}>Cancel</button>
                                      <button className="cw-editor-btn cw-editor-btn-save" onClick={saveCell}>Save</button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Subject legend + period counts */}
              {selectedClass.subjects.length > 0 && stats.filled > 0 && (
                <div className="cw-legend">
                  <span className="cw-legend-title">Subjects</span>
                  {selectedClass.subjects.map((subj) => {
                    const color = getSubjectColor(subj)
                    const count = stats.bySubject[subj] || 0
                    return (
                      <span
                        key={subj}
                        className="cw-legend-item"
                        style={{ background: color.bg, color: color.text }}
                      >
                        {subj}
                        {count > 0 && <span className="cw-legend-count">({count})</span>}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ClassWise
