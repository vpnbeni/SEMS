import React, { useState } from 'react'
import { useTimetable, type TimetableClass } from '@/contexts/TimetableContext'

const FLOOR_OPTIONS = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor']
const SUBJECT_OPTIONS = [
  'English', 'Hindi', 'Mathematics', 'Science', 'Social Science',
  'Computer Science', 'Physical Education', 'Art', 'Music',
  'Sanskrit', 'Environmental Studies', 'General Knowledge',
]

const EMPTY_FORM = {
  className: '',
  section: '',
  floor: '',
  subjects: [] as string[],
  incharge: '',
}

const TimetableClasses: React.FC = () => {
  const { classes, addClass, updateClass, deleteClasses, subjects: allSubjects } = useTimetable()

  // Derive subject options: combine hardcoded list with any subjects added on the Subjects page
  const subjectNames = allSubjects.map((s) => s.name)
  const mergedSubjectOptions = Array.from(new Set([...SUBJECT_OPTIONS, ...subjectNames]))

  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newItem, setNewItem] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState({ ...EMPTY_FORM })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── CRUD ──
  const handleAdd = () => {
    if (!newItem.className.trim() || !newItem.section.trim() || !newItem.floor) return
    addClass(newItem)
    setNewItem({ ...EMPTY_FORM })
    setIsAddingNew(false)
  }

  const handleEdit = (item: TimetableClass) => {
    setEditingId(item.id)
    setEditingData({
      className: item.className,
      section: item.section,
      floor: item.floor,
      subjects: [...item.subjects],
      incharge: item.incharge,
    })
  }

  const handleSave = (id: string) => {
    updateClass(id, editingData)
    setEditingId(null)
    setEditingData({ ...EMPTY_FORM })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingData({ ...EMPTY_FORM })
    setIsAddingNew(false)
    setNewItem({ ...EMPTY_FORM })
  }

  // ── Selection ──
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllOnPage = () => {
    const ids = classes.map((c) => c.id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} selected class(es)? This cannot be undone.`)) return
    deleteClasses(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const allOnPageSelected = classes.length > 0 && classes.every((c) => selectedIds.has(c.id))
  const someOnPageSelected = classes.some((c) => selectedIds.has(c.id))

  // ── Floor badge class ──
  const floorBadgeClass = (floor: string) => {
    switch (floor) {
      case 'Ground Floor': return 'tc-floor-ground'
      case 'First Floor': return 'tc-floor-first'
      case 'Second Floor': return 'tc-floor-second'
      case 'Third Floor': return 'tc-floor-third'
      default: return 'tc-floor-default'
    }
  }

  // ── Stats ──
  const totalSections = classes.length
  const uniqueClasses = new Set(classes.map((c) => c.className)).size
  const floorCounts: Record<string, number> = {}
  classes.forEach((c) => { floorCounts[c.floor] = (floorCounts[c.floor] || 0) + 1 })

  // ── Subject multi-select helpers ──
  const toggleSubject = (
    subjects: string[],
    subject: string,
    setter: (subjects: string[]) => void
  ) => {
    if (subjects.includes(subject)) {
      setter(subjects.filter((s) => s !== subject))
    } else {
      setter([...subjects, subject])
    }
  }

  return (
    <div className="tc-page">
      <style>{`
        /* ───────── Page ───────── */
        .tc-page {
          padding: 12px 32px 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ───────── Card ───────── */
        .tc-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04);
          overflow: hidden;
          margin-bottom: 32px;
          border: 1px solid #e8ecf1;
          transition: box-shadow 0.3s ease;
        }
        .tc-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 10px 36px rgba(0,0,0,0.06);
        }
        .dark .tc-card {
          background: #1e293b;
          border-color: #334155;
        }

        /* ───────── Header ───────── */
        .tc-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .dark .tc-card-header {
          background: linear-gradient(135deg, #1e2a3e 0%, #2a1e3e 100%);
          border-color: #334155;
        }
        .tc-card-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dark .tc-card-header h3 {
          color: #f1f5f9;
        }
        .tc-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .tc-header-icon svg {
          width: 18px;
          height: 18px;
          color: #fff;
        }

        /* ───────── Header stats ───────── */
        .tc-header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          justify-content: center;
          min-width: 0;
          overflow-x: auto;
          padding: 2px 8px;
        }
        .tc-stat-card-inline {
          min-width: 82px;
          flex: 0 0 auto;
          padding: 6px 7px;
          border-radius: 8px;
          gap: 6px;
          display: flex;
          align-items: center;
        }
        .tc-stat-icon {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tc-stat-icon svg { width: 12px; height: 12px; color: #fff; }
        .tc-stat-value {
          font-size: 0.95rem;
          line-height: 1.05;
          font-weight: 800;
          color: #1e293b;
        }
        .dark .tc-stat-value { color: #f1f5f9; }
        .tc-stat-label {
          font-size: 0.5rem;
          letter-spacing: 0.04em;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .tc-bg-indigo-soft { background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); }
        .tc-bg-green-soft { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); }
        .tc-bg-indigo-grad { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .tc-bg-green-grad { background: linear-gradient(135deg, #10b981, #059669); }

        .dark .tc-bg-indigo-soft { background: linear-gradient(135deg, #312e81 0%, #3b2f6b 100%); }
        .dark .tc-bg-green-soft { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); }

        /* ───────── Buttons ───────── */
        .tc-btn-group {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .tc-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .tc-btn svg { width: 16px; height: 16px; }
        .tc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tc-btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #fff;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
        }
        .tc-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
        }
        .tc-btn-danger {
          background: #fff;
          color: #ef4444;
          border: 1.5px solid #fecaca;
          box-shadow: 0 1px 3px rgba(239, 68, 68, 0.1);
        }
        .tc-btn-danger:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fca5a5;
          transform: translateY(-1px);
        }

        /* ───────── Table ───────── */
        .tc-table-wrap { overflow-x: auto; }
        .tc-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .tc-table thead th {
          padding: 14px 20px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
          text-align: left;
          white-space: nowrap;
        }
        .dark .tc-table thead th {
          background: #1e293b;
          color: #94a3b8;
          border-color: #334155;
        }
        .tc-table tbody tr { transition: background 0.15s ease; }
        .tc-table tbody tr:hover { background: #f1f5f9; }
        .dark .tc-table tbody tr:hover { background: #283548; }
        .tc-table tbody tr:nth-child(even) { background: #fafbfd; }
        .dark .tc-table tbody tr:nth-child(even) { background: #1a2536; }
        .tc-table tbody tr:nth-child(even):hover { background: #f1f5f9; }
        .dark .tc-table tbody tr:nth-child(even):hover { background: #283548; }
        .tc-table tbody td {
          padding: 14px 20px;
          font-size: 0.88rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
        }
        .dark .tc-table tbody td {
          color: #e2e8f0;
          border-color: #1e293b;
        }
        .tc-table thead th:first-child,
        .tc-table tbody td:first-child {
          width: 48px;
          padding-left: 20px;
          padding-right: 8px;
        }

        /* ───────── Serial number ───────── */
        .tc-sr {
          font-weight: 600;
          color: #94a3b8;
          font-size: 0.82rem;
          min-width: 32px;
          display: inline-block;
        }

        /* ───────── Value styles ───────── */
        .tc-class-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .dark .tc-class-name { color: #f1f5f9; }
        .tc-section {
          font-weight: 600;
          color: #475569;
        }
        .dark .tc-section { color: #cbd5e1; }
        .tc-incharge {
          color: #475569;
          font-weight: 500;
        }
        .dark .tc-incharge { color: #cbd5e1; }

        /* ───────── Floor badges ───────── */
        .tc-floor-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .tc-floor-ground { background: #ecfdf5; color: #059669; }
        .tc-floor-first { background: #eff6ff; color: #2563eb; }
        .tc-floor-second { background: #fef3c7; color: #d97706; }
        .tc-floor-third { background: #f3e8ff; color: #7c3aed; }
        .tc-floor-default { background: #f1f5f9; color: #475569; }
        .dark .tc-floor-ground { background: #064e3b33; color: #34d399; }
        .dark .tc-floor-first { background: #1e3a5f33; color: #60a5fa; }
        .dark .tc-floor-second { background: #78350f33; color: #fbbf24; }
        .dark .tc-floor-third { background: #4c1d9533; color: #a78bfa; }
        .dark .tc-floor-default { background: #33415533; color: #94a3b8; }

        /* ───────── Subject pills ───────── */
        .tc-subject-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .tc-subject-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.72rem;
          font-weight: 600;
          background: #eef2ff;
          color: #4f46e5;
        }
        .dark .tc-subject-pill {
          background: #312e8133;
          color: #a5b4fc;
        }
        .tc-no-subjects {
          color: #94a3b8;
          font-size: 0.82rem;
          font-style: italic;
        }

        /* ───────── Subject multi-select dropdown ───────── */
        .tc-subject-select-wrap {
          position: relative;
        }
        .tc-subject-select-trigger {
          width: 100%;
          padding: 6px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.85rem;
          background: #fff;
          color: #334155;
          cursor: pointer;
          text-align: left;
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: all 0.2s ease;
          outline: none;
        }
        .dark .tc-subject-select-trigger {
          background: #1e293b;
          border-color: #475569;
          color: #e2e8f0;
        }
        .tc-subject-select-trigger:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .tc-subject-select-trigger svg {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          color: #94a3b8;
        }
        .tc-subject-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 50;
          margin-top: 4px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          max-height: 220px;
          overflow-y: auto;
          padding: 4px;
        }
        .dark .tc-subject-dropdown {
          background: #1e293b;
          border-color: #475569;
          box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        }
        .tc-subject-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          transition: background 0.12s ease;
          user-select: none;
        }
        .tc-subject-option:hover {
          background: #f1f5f9;
        }
        .dark .tc-subject-option {
          color: #e2e8f0;
        }
        .dark .tc-subject-option:hover {
          background: #334155;
        }
        .tc-subject-option input[type="checkbox"] {
          width: 15px;
          height: 15px;
          accent-color: #6366f1;
          border-radius: 3px;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* ───────── Action links ───────── */
        .tc-action-link {
          font-size: 0.82rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 6px;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tc-action-edit { color: #6366f1; }
        .tc-action-edit:hover { background: #eef2ff; color: #4f46e5; }
        .dark .tc-action-edit { color: #818cf8; }
        .dark .tc-action-edit:hover { background: #312e8133; }
        .tc-action-save { color: #10b981; }
        .tc-action-save:hover { background: #ecfdf5; color: #059669; }
        .tc-action-cancel { color: #94a3b8; }
        .tc-action-cancel:hover { background: #f1f5f9; color: #64748b; }
        .tc-action-group { display: flex; gap: 8px; }
        .tc-edit-icon {
          width: 14px;
          height: 14px;
          display: inline;
          margin-right: 4px;
          vertical-align: -2px;
        }

        /* ───────── Checkbox ───────── */
        .tc-checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .tc-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          accent-color: #6366f1;
        }

        /* ───────── New row ───────── */
        .tc-new-row {
          background: linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%) !important;
        }
        .dark .tc-new-row {
          background: linear-gradient(90deg, #1e2a4a 0%, #2a1e4a 100%) !important;
        }

        /* ───────── Input ───────── */
        .tc-input {
          width: 100%;
          padding: 6px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          outline: none;
          background: #fff;
          color: #334155;
        }
        .dark .tc-input {
          background: #1e293b;
          border-color: #475569;
          color: #e2e8f0;
        }
        .tc-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        /* ───────── Empty state ───────── */
        .tc-empty {
          padding: 48px 24px;
          text-align: center;
        }
        .tc-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tc-empty-icon svg {
          width: 32px;
          height: 32px;
          color: #94a3b8;
        }
        .tc-empty h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 6px;
        }
        .dark .tc-empty h3 { color: #f1f5f9; }
        .tc-empty p {
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0 0 20px;
        }
      `}</style>

      <div className="mb-6">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Manage classes and sections for timetable scheduling
        </p>
      </div>

      <div className="tc-card">
        {/* ── Header ── */}
        <div className="tc-card-header">
          <div>
            <h3>
              <span className="tc-header-icon">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              </span>
              Classes & Sections
            </h3>
          </div>
          <div className="tc-header-stats">
            <div className="tc-stat-card-inline tc-bg-indigo-soft">
              <div className="tc-stat-icon tc-bg-indigo-grad">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              </div>
              <div>
                <div className="tc-stat-value">{uniqueClasses}</div>
                <div className="tc-stat-label">Classes</div>
              </div>
            </div>
            <div className="tc-stat-card-inline tc-bg-green-soft">
              <div className="tc-stat-icon tc-bg-green-grad">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <div>
                <div className="tc-stat-value">{totalSections}</div>
                <div className="tc-stat-label">Sections</div>
              </div>
            </div>
          </div>
          <div className="tc-btn-group">
            {selectedIds.size > 0 && (
              <button onClick={handleDeleteSelected} className="tc-btn tc-btn-danger">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete {selectedIds.size}
              </button>
            )}
            <button
              onClick={() => setIsAddingNew(true)}
              disabled={isAddingNew}
              className="tc-btn tc-btn-primary"
            >
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
              Add Class
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="tc-table-wrap">
          <table className="tc-table">
            <thead>
              <tr>
                <th>
                  <label className="tc-checkbox-label">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected
                      }}
                      onChange={selectAllOnPage}
                      className="tc-checkbox"
                      aria-label="Select all"
                    />
                  </label>
                </th>
                <th>Sr No</th>
                <th>Class</th>
                <th>Section</th>
                <th>Floor</th>
                <th>Subjects</th>
                <th>Incharge</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add new row */}
              {isAddingNew && (
                <NewOrEditRow
                  mode="new"
                  data={newItem}
                  subjectOptions={mergedSubjectOptions}
                  onFieldChange={(field, value) => setNewItem((prev) => ({ ...prev, [field]: value }))}
                  onToggleSubject={(subj) =>
                    toggleSubject(newItem.subjects, subj, (subjects) =>
                      setNewItem((prev) => ({ ...prev, subjects }))
                    )
                  }
                  onSave={handleAdd}
                  onCancel={handleCancelEdit}
                />
              )}

              {/* Rows */}
              {classes.map((item, index) => {
                const isEditing = editingId === item.id
                if (isEditing) {
                  return (
                    <NewOrEditRow
                      key={item.id}
                      mode="edit"
                      index={index}
                      selected={selectedIds.has(item.id)}
                      onToggleSelect={() => toggleSelection(item.id)}
                      data={editingData}
                      subjectOptions={mergedSubjectOptions}
                      onFieldChange={(field, value) => setEditingData((prev) => ({ ...prev, [field]: value }))}
                      onToggleSubject={(subj) =>
                        toggleSubject(editingData.subjects, subj, (subjects) =>
                          setEditingData((prev) => ({ ...prev, subjects }))
                        )
                      }
                      onSave={() => handleSave(item.id)}
                      onCancel={handleCancelEdit}
                    />
                  )
                }

                return (
                  <tr key={item.id}>
                    <td>
                      <label className="tc-checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="tc-checkbox"
                          aria-label={`Select ${item.className} ${item.section}`}
                        />
                      </label>
                    </td>
                    <td><span className="tc-sr">{index + 1}</span></td>
                    <td><span className="tc-class-name">{item.className}</span></td>
                    <td><span className="tc-section">{item.section}</span></td>
                    <td>
                      <span className={`tc-floor-badge ${floorBadgeClass(item.floor)}`}>
                        {item.floor}
                      </span>
                    </td>
                    <td>
                      {item.subjects.length > 0 ? (
                        <div className="tc-subject-pills">
                          {item.subjects.map((s) => (
                            <span key={s} className="tc-subject-pill">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="tc-no-subjects">No subjects</span>
                      )}
                    </td>
                    <td><span className="tc-incharge">{item.incharge || '—'}</span></td>
                    <td>
                      <button onClick={() => handleEdit(item)} className="tc-action-link tc-action-edit">
                        <svg className="tc-edit-icon" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* Empty state */}
              {classes.length === 0 && !isAddingNew && (
                <tr>
                  <td colSpan={8}>
                    <div className="tc-empty">
                      <div className="tc-empty-icon">
                        <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                        </svg>
                      </div>
                      <h3>No Classes Added</h3>
                      <p>Add classes and sections to start building your timetable.</p>
                      <button onClick={() => setIsAddingNew(true)} className="tc-btn tc-btn-primary">
                        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                        </svg>
                        Add Class
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Inline-editing row (shared between "add new" and "edit")
   ═══════════════════════════════════════════════════ */
interface RowProps {
  mode: 'new' | 'edit'
  index?: number
  selected?: boolean
  onToggleSelect?: () => void
  data: {
    className: string
    section: string
    floor: string
    subjects: string[]
    incharge: string
  }
  subjectOptions: string[]
  onFieldChange: (field: string, value: string) => void
  onToggleSubject: (subject: string) => void
  onSave: () => void
  onCancel: () => void
}

const NewOrEditRow: React.FC<RowProps> = ({
  mode,
  index,
  selected,
  onToggleSelect,
  data,
  subjectOptions,
  onFieldChange,
  onToggleSubject,
  onSave,
  onCancel,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <tr className={mode === 'new' ? 'tc-new-row' : undefined}>
      <td>
        {mode === 'edit' && onToggleSelect ? (
          <label className="tc-checkbox-label">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="tc-checkbox"
            />
          </label>
        ) : null}
      </td>
      <td>
        <span className="tc-sr">{mode === 'new' ? '—' : (index ?? 0) + 1}</span>
      </td>
      <td>
        <input
          type="text"
          title="Class name"
          value={data.className}
          onChange={(e) => onFieldChange('className', e.target.value)}
          placeholder="e.g. 10"
          className="tc-input"
        />
      </td>
      <td>
        <input
          type="text"
          title="Section"
          value={data.section}
          onChange={(e) => onFieldChange('section', e.target.value)}
          placeholder="e.g. A"
          className="tc-input"
        />
      </td>
      <td>
        <select
          title="Floor"
          value={data.floor}
          onChange={(e) => onFieldChange('floor', e.target.value)}
          className="tc-input"
        >
          <option value="">Select Floor</option>
          {FLOOR_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </td>
      <td>
        <div className="tc-subject-select-wrap">
          <button
            type="button"
            className="tc-subject-select-trigger"
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span>
              {data.subjects.length === 0
                ? 'Select subjects...'
                : `${data.subjects.length} selected`}
            </span>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="tc-subject-dropdown">
              {subjectOptions.map((subj) => (
                <label key={subj} className="tc-subject-option">
                  <input
                    type="checkbox"
                    checked={data.subjects.includes(subj)}
                    onChange={() => onToggleSubject(subj)}
                  />
                  {subj}
                </label>
              ))}
            </div>
          )}
        </div>
      </td>
      <td>
        <input
          type="text"
          title="Class incharge"
          value={data.incharge}
          onChange={(e) => onFieldChange('incharge', e.target.value)}
          placeholder="Teacher name"
          className="tc-input"
        />
      </td>
      <td>
        <div className="tc-action-group">
          <button onClick={onSave} className="tc-action-link tc-action-save">Save</button>
          <button onClick={onCancel} className="tc-action-link tc-action-cancel">Cancel</button>
        </div>
      </td>
    </tr>
  )
}

export default TimetableClasses
