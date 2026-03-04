import React, { useState, useMemo } from 'react'
import { useTimetable, type TimetableClass } from '@/contexts/TimetableContext'

/* ══════════════════════════════ Helpers ══════════════════════════════ */

/** Build a stable key from a class's subject list (sorted, joined) */
const subjectSetKey = (subjects: string[]) => [...subjects].sort().join('||')

/** Group classes by their subject set */
interface ClassGroup {
  key: string
  subjects: string[]
  classes: TimetableClass[]
}

const PeriodAllocation: React.FC = () => {
  const {
    classes,
    periodsPerWeek,
    setPeriodsPerWeek,
    periodAllocation,
    setPeriodCount,
  } = useTimetable()

  const [editingPeriodsPerWeek, setEditingPeriodsPerWeek] = useState(false)
  const [draftPeriodsPerWeek, setDraftPeriodsPerWeek] = useState(periodsPerWeek)

  // Group classes by subject set
  const groups: ClassGroup[] = useMemo(() => {
    const map = new Map<string, ClassGroup>()
    classes.forEach((cls) => {
      if (cls.subjects.length === 0) return // skip classes with no subjects
      const key = subjectSetKey(cls.subjects)
      if (!map.has(key)) {
        map.set(key, { key, subjects: [...cls.subjects].sort(), classes: [] })
      }
      map.get(key)!.classes.push(cls)
    })
    return Array.from(map.values())
  }, [classes])

  // Classes without subjects
  const unassigned = useMemo(() => classes.filter((c) => c.subjects.length === 0), [classes])

  /** Get period count for a class-subject cell */
  const getCount = (classId: string, subject: string): number => {
    return periodAllocation[classId]?.[subject] ?? 0
  }

  /** Get row total for a class */
  const getRowTotal = (cls: TimetableClass): number => {
    const alloc = periodAllocation[cls.id] || {}
    return cls.subjects.reduce((sum, subj) => sum + (alloc[subj] || 0), 0)
  }

  /** Handle cell value change */
  const handleCellChange = (classId: string, subject: string, value: string) => {
    const num = value === '' ? 0 : parseInt(value, 10)
    if (isNaN(num) || num < 0) return
    setPeriodCount(classId, subject, num)
  }

  /** Save new periods per week */
  const handleSavePeriodsPerWeek = () => {
    if (draftPeriodsPerWeek > 0) {
      setPeriodsPerWeek(draftPeriodsPerWeek)
    }
    setEditingPeriodsPerWeek(false)
  }

  return (
    <div className="pa-page">
      <style>{`
        /* ───────── Page ───────── */
        .pa-page {
          padding: 12px 32px 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ───────── Top bar ───────── */
        .pa-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .pa-top-bar p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
        }
        .dark .pa-top-bar p { color: #94a3b8; }
        .pa-periods-config {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .dark .pa-periods-config {
          background: #1e293b;
          border-color: #334155;
        }
        .pa-periods-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
        }
        .dark .pa-periods-label { color: #cbd5e1; }
        .pa-periods-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: #6366f1;
          min-width: 28px;
          text-align: center;
        }
        .pa-periods-input {
          width: 60px;
          padding: 4px 8px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 700;
          text-align: center;
          outline: none;
          background: #fff;
          color: #334155;
        }
        .dark .pa-periods-input {
          background: #0f172a;
          border-color: #475569;
          color: #e2e8f0;
        }
        .pa-periods-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        /* ───────── Card ───────── */
        .pa-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04);
          overflow: hidden;
          margin-bottom: 24px;
          border: 1px solid #e8ecf1;
          transition: box-shadow 0.3s ease;
        }
        .pa-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 10px 36px rgba(0,0,0,0.06);
        }
        .dark .pa-card {
          background: #1e293b;
          border-color: #334155;
        }

        /* ───────── Card header ───────── */
        .pa-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .dark .pa-card-header {
          background: linear-gradient(135deg, #1e2a3e 0%, #2a1e3e 100%);
          border-color: #334155;
        }
        .pa-card-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dark .pa-card-header h3 { color: #f1f5f9; }
        .pa-header-icon {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .pa-header-icon svg {
          width: 16px;
          height: 16px;
          color: #fff;
        }

        /* ───────── Header stats ───────── */
        .pa-header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pa-stat-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .pa-stat-pill-indigo {
          background: #eef2ff;
          color: #4f46e5;
        }
        .dark .pa-stat-pill-indigo {
          background: #312e8133;
          color: #a5b4fc;
        }
        .pa-stat-pill-green {
          background: #ecfdf5;
          color: #059669;
        }
        .dark .pa-stat-pill-green {
          background: #064e3b33;
          color: #34d399;
        }

        /* ───────── Table ───────── */
        .pa-table-wrap {
          overflow-x: auto;
        }
        .pa-table {
          width: 100%;
          border-collapse: collapse;
        }
        .pa-table thead th {
          padding: 10px 12px;
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
        .dark .pa-table thead th {
          background: linear-gradient(180deg, #1e293b 0%, #1a2536 100%);
          color: #94a3b8;
          border-color: #334155;
        }
        .pa-table thead th.pa-th-class {
          text-align: left;
          min-width: 70px;
        }
        .pa-table thead th.pa-th-section {
          text-align: left;
          min-width: 60px;
        }
        .pa-table thead th.pa-th-sr {
          width: 48px;
          min-width: 48px;
        }
        .pa-table thead th.pa-th-total {
          min-width: 64px;
          background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
          color: #166534;
        }
        .dark .pa-table thead th.pa-th-total {
          background: linear-gradient(180deg, #14532d44 0%, #16653444 100%);
          color: #86efac;
        }
        .pa-table tbody td {
          padding: 6px 8px;
          font-size: 0.85rem;
          color: #334155;
          border: 1px solid #e2e8f0;
          text-align: center;
          vertical-align: middle;
        }
        .dark .pa-table tbody td {
          color: #e2e8f0;
          border-color: #334155;
        }
        .pa-table tbody tr:hover td {
          background: #f8faff;
        }
        .dark .pa-table tbody tr:hover td {
          background: #283548;
        }
        .pa-table tbody td.pa-td-class {
          text-align: left;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
        }
        .dark .pa-table tbody td.pa-td-class { color: #f1f5f9; }
        .pa-table tbody td.pa-td-section {
          text-align: left;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
        }
        .dark .pa-table tbody td.pa-td-section { color: #cbd5e1; }
        .pa-table tbody td.pa-td-sr {
          font-weight: 600;
          color: #94a3b8;
          font-size: 0.78rem;
        }

        /* ── Total column ── */
        .pa-table tbody td.pa-td-total {
          font-weight: 800;
          font-size: 0.9rem;
        }
        .pa-total-ok {
          background: #f0fdf4;
          color: #166534;
        }
        .dark .pa-total-ok {
          background: #14532d44;
          color: #86efac;
        }
        .pa-total-under {
          background: #fef3c7;
          color: #92400e;
        }
        .dark .pa-total-under {
          background: #78350f33;
          color: #fbbf24;
        }
        .pa-total-over {
          background: #fee2e2;
          color: #991b1b;
        }
        .dark .pa-total-over {
          background: #7f1d1d44;
          color: #fca5a5;
        }

        /* ── Cell input ── */
        .pa-cell-input {
          width: 48px;
          padding: 4px 4px;
          border: 1.5px solid transparent;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
          outline: none;
          background: transparent;
          color: #334155;
          transition: all 0.15s ease;
        }
        .dark .pa-cell-input {
          color: #e2e8f0;
        }
        .pa-cell-input:hover {
          background: #f1f5f9;
          border-color: #e2e8f0;
        }
        .dark .pa-cell-input:hover {
          background: #334155;
          border-color: #475569;
        }
        .pa-cell-input:focus {
          background: #fff;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .dark .pa-cell-input:focus {
          background: #1e293b;
          border-color: #818cf8;
        }
        .pa-cell-input-filled {
          color: #1e293b;
          font-weight: 700;
        }
        .dark .pa-cell-input-filled {
          color: #f1f5f9;
        }

        /* ───────── Buttons ───────── */
        .pa-btn {
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
        .pa-btn svg { width: 14px; height: 14px; }
        .pa-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pa-btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #fff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }
        .pa-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        }
        .pa-btn-secondary {
          background: #fff;
          color: #475569;
          border: 1.5px solid #e2e8f0;
        }
        .dark .pa-btn-secondary {
          background: #334155;
          color: #e2e8f0;
          border-color: #475569;
        }
        .pa-btn-secondary:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .dark .pa-btn-secondary:hover:not(:disabled) {
          background: #3b4f6b;
        }
        .pa-btn-save {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .pa-btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .pa-btn-cancel {
          background: none;
          color: #94a3b8;
          border: none;
          padding: 6px 10px;
        }
        .pa-btn-cancel:hover { color: #64748b; }

        /* ───────── Empty state ───────── */
        .pa-empty {
          padding: 48px 24px;
          text-align: center;
        }
        .pa-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pa-empty-icon svg {
          width: 32px;
          height: 32px;
          color: #94a3b8;
        }
        .pa-empty h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 6px;
        }
        .dark .pa-empty h3 { color: #f1f5f9; }
        .pa-empty p {
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0 0 6px;
        }
        .pa-empty a {
          color: #6366f1;
          font-weight: 600;
          text-decoration: none;
        }
        .pa-empty a:hover { text-decoration: underline; }

        /* ───────── Unassigned notice ───────── */
        .pa-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #92400e;
        }
        .dark .pa-notice {
          background: #78350f33;
          border-color: #92400e;
          color: #fbbf24;
        }
        .pa-notice svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .pa-notice strong {
          font-weight: 700;
        }
      `}</style>

      {/* ── Top bar ── */}
      <div className="pa-top-bar">
        <p>Distribute periods among subjects for each class</p>
        <div className="pa-periods-config">
          <span className="pa-periods-label">Periods / Week</span>
          {editingPeriodsPerWeek ? (
            <>
              <input
                type="number"
                className="pa-periods-input"
                value={draftPeriodsPerWeek}
                min={1}
                max={100}
                onChange={(e) => setDraftPeriodsPerWeek(parseInt(e.target.value, 10) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePeriodsPerWeek()
                  if (e.key === 'Escape') setEditingPeriodsPerWeek(false)
                }}
                autoFocus
              />
              <button className="pa-btn pa-btn-save" onClick={handleSavePeriodsPerWeek}>
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </button>
              <button className="pa-btn pa-btn-cancel" onClick={() => setEditingPeriodsPerWeek(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="pa-periods-value">{periodsPerWeek}</span>
              <button
                className="pa-btn pa-btn-secondary"
                onClick={() => {
                  setDraftPeriodsPerWeek(periodsPerWeek)
                  setEditingPeriodsPerWeek(true)
                }}
              >
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Unassigned classes notice ── */}
      {unassigned.length > 0 && (
        <div className="pa-notice">
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>
            <strong>{unassigned.length}</strong> class(es) have no subjects assigned and are not shown below.
            Assign subjects on the <a href="#/time-table/classes">Classes</a> page.
          </span>
        </div>
      )}

      {/* ── Empty state ── */}
      {groups.length === 0 && unassigned.length === 0 && (
        <div className="pa-card">
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
              </svg>
            </div>
            <h3>No Classes to Allocate</h3>
            <p>Add classes with subjects on the <a href="#/time-table/classes">Classes</a> page first, then come back here to distribute periods.</p>
          </div>
        </div>
      )}

      {groups.length === 0 && unassigned.length > 0 && (
        <div className="pa-card">
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3>No Subjects Assigned</h3>
            <p>All your classes have no subjects assigned yet. Go to the <a href="#/time-table/classes">Classes</a> page and assign subjects to each class.</p>
          </div>
        </div>
      )}

      {/* ── Group cards ── */}
      {groups.map((group, groupIdx) => {
        const groupLabel = group.classes.map((c) => `${c.className}`).join(', ')

        return (
          <div key={group.key} className="pa-card">
            <div className="pa-card-header">
              <h3>
                <span className="pa-header-icon">
                  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </span>
                Group {groupIdx + 1} — Classes: {groupLabel}
              </h3>
              <div className="pa-header-stats">
                <span className="pa-stat-pill pa-stat-pill-indigo">
                  {group.classes.length} class{group.classes.length !== 1 ? 'es' : ''}
                </span>
                <span className="pa-stat-pill pa-stat-pill-green">
                  {group.subjects.length} subject{group.subjects.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="pa-table-wrap">
              <table className="pa-table">
                <thead>
                  <tr>
                    <th className="pa-th-sr">Sr</th>
                    <th className="pa-th-class">Class</th>
                    <th className="pa-th-section">Section</th>
                    {group.subjects.map((subj) => (
                      <th key={subj}>{subj}</th>
                    ))}
                    <th className="pa-th-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {group.classes.map((cls, rowIdx) => {
                    const rowTotal = getRowTotal(cls)
                    const totalClass =
                      rowTotal === periodsPerWeek ? 'pa-total-ok' :
                      rowTotal > periodsPerWeek ? 'pa-total-over' :
                      rowTotal > 0 ? 'pa-total-under' : ''

                    return (
                      <tr key={cls.id}>
                        <td className="pa-td-sr">{rowIdx + 1}</td>
                        <td className="pa-td-class">{cls.className}</td>
                        <td className="pa-td-section">{cls.section}</td>
                        {group.subjects.map((subj) => {
                          const val = getCount(cls.id, subj)
                          return (
                            <td key={subj}>
                              <input
                                type="number"
                                className={`pa-cell-input ${val > 0 ? 'pa-cell-input-filled' : ''}`}
                                value={val || ''}
                                min={0}
                                placeholder="0"
                                onChange={(e) => handleCellChange(cls.id, subj, e.target.value)}
                              />
                            </td>
                          )
                        })}
                        <td className={`pa-td-total ${totalClass}`}>
                          {rowTotal} / {periodsPerWeek}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PeriodAllocation
