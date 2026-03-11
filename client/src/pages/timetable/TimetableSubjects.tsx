import React, { useState } from 'react'
import { useTimetable, type TimetableSubject } from '@/contexts/TimetableContext'

const SUBJECT_TYPES = ['Language', 'Skill', 'Core', 'Elective', 'Co-Curricular', 'Other']

const EMPTY_FORM = {
  name: '',
  type: '',
}

const TYPE_COLORS: Record<string, { bg: string; color: string; darkBg: string; darkColor: string }> = {
  Language: { bg: '#eff6ff', color: '#2563eb', darkBg: '#1e3a5f33', darkColor: '#60a5fa' },
  Skill: { bg: '#ecfdf5', color: '#059669', darkBg: '#064e3b33', darkColor: '#34d399' },
  Core: { bg: '#eef2ff', color: '#4f46e5', darkBg: '#312e8133', darkColor: '#a5b4fc' },
  Elective: { bg: '#fef3c7', color: '#d97706', darkBg: '#78350f33', darkColor: '#fbbf24' },
  'Co-Curricular': { bg: '#f3e8ff', color: '#7c3aed', darkBg: '#4c1d9533', darkColor: '#a78bfa' },
  Other: { bg: '#f1f5f9', color: '#475569', darkBg: '#33415533', darkColor: '#94a3b8' },
}

const TimetableSubjects: React.FC = () => {
  const { subjects, addSubject, updateSubject, deleteSubjects } = useTimetable()
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newItem, setNewItem] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState({ ...EMPTY_FORM })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── CRUD ──
  const handleAdd = () => {
    if (!newItem.name.trim() || !newItem.type) return
    addSubject(newItem)
    setNewItem({ ...EMPTY_FORM })
    setIsAddingNew(false)
  }

  const handleEdit = (item: TimetableSubject) => {
    setEditingId(item.id)
    setEditingData({ name: item.name, type: item.type })
  }

  const handleSave = (id: string) => {
    updateSubject(id, editingData)
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
    const ids = subjects.map((s) => s.id)
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
    if (!window.confirm(`Delete ${selectedIds.size} selected subject(s)? This cannot be undone.`)) return
    deleteSubjects(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const allOnPageSelected = subjects.length > 0 && subjects.every((s) => selectedIds.has(s.id))
  const someOnPageSelected = subjects.some((s) => selectedIds.has(s.id))

  // ── Stats ──
  const typeCounts: Record<string, number> = {}
  subjects.forEach((s) => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1 })

  return (
    <div className="ts-page">
      <style>{`
        /* ───────── Page ───────── */
        .ts-page {
          padding: 12px 32px 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ───────── Card ───────── */
        .ts-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04);
          overflow: hidden;
          margin-bottom: 32px;
          border: 1px solid #e8ecf1;
          transition: box-shadow 0.3s ease;
        }
        .ts-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 10px 36px rgba(0,0,0,0.06);
        }
        .dark .ts-card {
          background: #1e293b;
          border-color: #334155;
        }

        /* ───────── Header ───────── */
        .ts-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .dark .ts-card-header {
          background: linear-gradient(135deg, #1e2a3e 0%, #2a1e3e 100%);
          border-color: #334155;
        }
        .ts-card-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dark .ts-card-header h3 {
          color: #f1f5f9;
        }
        .ts-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .ts-header-icon svg {
          width: 18px;
          height: 18px;
          color: #fff;
        }

        /* ───────── Header stats ───────── */
        .ts-header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          justify-content: center;
          min-width: 0;
          overflow-x: auto;
          padding: 2px 8px;
        }
        .ts-stat-card-inline {
          min-width: 82px;
          flex: 0 0 auto;
          padding: 6px 7px;
          border-radius: 8px;
          gap: 6px;
          display: flex;
          align-items: center;
        }
        .ts-stat-icon {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ts-stat-icon svg { width: 12px; height: 12px; color: #fff; }
        .ts-stat-value {
          font-size: 0.95rem;
          line-height: 1.05;
          font-weight: 800;
          color: #1e293b;
        }
        .dark .ts-stat-value { color: #f1f5f9; }
        .ts-stat-label {
          font-size: 0.5rem;
          letter-spacing: 0.04em;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .ts-bg-indigo-soft { background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); }
        .ts-bg-green-soft { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); }
        .ts-bg-amber-soft { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); }
        .ts-bg-indigo-grad { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .ts-bg-green-grad { background: linear-gradient(135deg, #10b981, #059669); }
        .ts-bg-amber-grad { background: linear-gradient(135deg, #f59e0b, #d97706); }

        .dark .ts-bg-indigo-soft { background: linear-gradient(135deg, #312e81 0%, #3b2f6b 100%); }
        .dark .ts-bg-green-soft { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); }
        .dark .ts-bg-amber-soft { background: linear-gradient(135deg, #78350f 0%, #92400e 100%); }

        /* ───────── Buttons ───────── */
        .ts-btn-group {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .ts-btn {
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
        .ts-btn svg { width: 16px; height: 16px; }
        .ts-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ts-btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #fff;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
        }
        .ts-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
        }
        .ts-btn-danger {
          background: #fff;
          color: #ef4444;
          border: 1.5px solid #fecaca;
          box-shadow: 0 1px 3px rgba(239, 68, 68, 0.1);
        }
        .ts-btn-danger:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fca5a5;
          transform: translateY(-1px);
        }

        /* ───────── Table ───────── */
        .ts-table-wrap { overflow-x: auto; }
        .ts-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .ts-table thead th {
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
        .dark .ts-table thead th {
          background: #1e293b;
          color: #94a3b8;
          border-color: #334155;
        }
        .ts-table tbody tr { transition: background 0.15s ease; }
        .ts-table tbody tr:hover { background: #f1f5f9; }
        .dark .ts-table tbody tr:hover { background: #283548; }
        .ts-table tbody tr:nth-child(even) { background: #fafbfd; }
        .dark .ts-table tbody tr:nth-child(even) { background: #1a2536; }
        .ts-table tbody tr:nth-child(even):hover { background: #f1f5f9; }
        .dark .ts-table tbody tr:nth-child(even):hover { background: #283548; }
        .ts-table tbody td {
          padding: 14px 20px;
          font-size: 0.88rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
        }
        .dark .ts-table tbody td {
          color: #e2e8f0;
          border-color: #1e293b;
        }
        .ts-table thead th:first-child,
        .ts-table tbody td:first-child {
          width: 48px;
          padding-left: 20px;
          padding-right: 8px;
        }

        /* ───────── Serial number ───────── */
        .ts-sr {
          font-weight: 600;
          color: #94a3b8;
          font-size: 0.82rem;
          min-width: 32px;
          display: inline-block;
        }

        /* ───────── Value styles ───────── */
        .ts-subject-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .dark .ts-subject-name { color: #f1f5f9; }

        /* ───────── Type badge ───────── */
        .ts-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        /* ───────── Action links ───────── */
        .ts-action-link {
          font-size: 0.82rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 6px;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ts-action-edit { color: #6366f1; }
        .ts-action-edit:hover { background: #eef2ff; color: #4f46e5; }
        .dark .ts-action-edit { color: #818cf8; }
        .dark .ts-action-edit:hover { background: #312e8133; }
        .ts-action-save { color: #10b981; }
        .ts-action-save:hover { background: #ecfdf5; color: #059669; }
        .ts-action-cancel { color: #94a3b8; }
        .ts-action-cancel:hover { background: #f1f5f9; color: #64748b; }
        .ts-action-group { display: flex; gap: 8px; }
        .ts-edit-icon {
          width: 14px;
          height: 14px;
          display: inline;
          margin-right: 4px;
          vertical-align: -2px;
        }

        /* ───────── Checkbox ───────── */
        .ts-checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .ts-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          accent-color: #6366f1;
        }

        /* ───────── New row ───────── */
        .ts-new-row {
          background: linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%) !important;
        }
        .dark .ts-new-row {
          background: linear-gradient(90deg, #1e2a4a 0%, #2a1e4a 100%) !important;
        }

        /* ───────── Input ───────── */
        .ts-input {
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
        .dark .ts-input {
          background: #1e293b;
          border-color: #475569;
          color: #e2e8f0;
        }
        .ts-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        /* ───────── Empty state ───────── */
        .ts-empty {
          padding: 48px 24px;
          text-align: center;
        }
        .ts-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ts-empty-icon svg {
          width: 32px;
          height: 32px;
          color: #94a3b8;
        }
        .ts-empty h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 6px;
        }
        .dark .ts-empty h3 { color: #f1f5f9; }
        .ts-empty p {
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0 0 20px;
        }
      `}</style>

      <div className="mb-6">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Manage subjects and their types for timetable scheduling
        </p>
      </div>

      <div className="ts-card">
        {/* ── Header ── */}
        <div className="ts-card-header">
          <div>
            <h3>
              <span className="ts-header-icon">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </span>
              Subjects
            </h3>
          </div>
          <div className="ts-header-stats">
            <div className="ts-stat-card-inline ts-bg-indigo-soft">
              <div className="ts-stat-icon ts-bg-indigo-grad">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div>
                <div className="ts-stat-value">{subjects.length}</div>
                <div className="ts-stat-label">Total</div>
              </div>
            </div>
            {Object.entries(typeCounts).map(([type, count]) => {
              const colors = TYPE_COLORS[type] || TYPE_COLORS.Other
              return (
                <div
                  key={type}
                  className="ts-stat-card-inline"
                  style={{ background: colors.bg }}
                >
                  <div className="ts-stat-icon" style={{ background: colors.color }}>
                    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  </div>
                  <div>
                    <div className="ts-stat-value">{count}</div>
                    <div className="ts-stat-label">{type}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="ts-btn-group">
            {selectedIds.size > 0 && (
              <button onClick={handleDeleteSelected} className="ts-btn ts-btn-danger">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete {selectedIds.size}
              </button>
            )}
            <button
              onClick={() => setIsAddingNew(true)}
              disabled={isAddingNew}
              className="ts-btn ts-btn-primary"
            >
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
              Add Subject
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="ts-table-wrap">
          <table className="ts-table">
            <thead>
              <tr>
                <th>
                  <label className="ts-checkbox-label">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected
                      }}
                      onChange={selectAllOnPage}
                      className="ts-checkbox"
                      aria-label="Select all"
                    />
                  </label>
                </th>
                <th>Sr No</th>
                <th>Name</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add new row */}
              {isAddingNew && (
                <tr className="ts-new-row">
                  <td />
                  <td><span className="ts-sr">—</span></td>
                  <td>
                    <input
                      type="text"
                      title="Subject name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="e.g. Mathematics"
                      className="ts-input"
                    />
                  </td>
                  <td>
                    <select
                      title="Subject type"
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                      className="ts-input"
                    >
                      <option value="">Select Type</option>
                      {SUBJECT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="ts-action-group">
                      <button onClick={handleAdd} className="ts-action-link ts-action-save">Save</button>
                      <button onClick={handleCancelEdit} className="ts-action-link ts-action-cancel">Cancel</button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows */}
              {subjects.map((item, index) => {
                const isEditing = editingId === item.id
                const colors = TYPE_COLORS[item.type] || TYPE_COLORS.Other

                if (isEditing) {
                  return (
                    <tr key={item.id}>
                      <td>
                        <label className="ts-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            className="ts-checkbox"
                          />
                        </label>
                      </td>
                      <td><span className="ts-sr">{index + 1}</span></td>
                      <td>
                        <input
                          type="text"
                          title="Edit subject name"
                          value={editingData.name}
                          onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                          placeholder="Subject name"
                          className="ts-input"
                        />
                      </td>
                      <td>
                        <select
                          title="Edit subject type"
                          value={editingData.type}
                          onChange={(e) => setEditingData({ ...editingData, type: e.target.value })}
                          className="ts-input"
                        >
                          {SUBJECT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="ts-action-group">
                          <button onClick={() => handleSave(item.id)} className="ts-action-link ts-action-save">Save</button>
                          <button onClick={handleCancelEdit} className="ts-action-link ts-action-cancel">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={item.id}>
                    <td>
                      <label className="ts-checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="ts-checkbox"
                          aria-label={`Select ${item.name}`}
                        />
                      </label>
                    </td>
                    <td><span className="ts-sr">{index + 1}</span></td>
                    <td><span className="ts-subject-name">{item.name}</span></td>
                    <td>
                      <span
                        className="ts-type-badge"
                        style={{ background: colors.bg, color: colors.color }}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleEdit(item)} className="ts-action-link ts-action-edit">
                        <svg className="ts-edit-icon" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* Empty state */}
              {subjects.length === 0 && !isAddingNew && (
                <tr>
                  <td colSpan={5}>
                    <div className="ts-empty">
                      <div className="ts-empty-icon">
                        <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                      <h3>No Subjects Added</h3>
                      <p>Add subjects to define what is taught in your school for timetable generation.</p>
                      <button onClick={() => setIsAddingNew(true)} className="ts-btn ts-btn-primary">
                        <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                        </svg>
                        Add Subject
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

export default TimetableSubjects
