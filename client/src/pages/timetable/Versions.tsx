import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import timetableService, { type TimetableVersionSummary } from '@/services/timetableService'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EyeIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

const FILL_BAR_STYLES = `
.ver-fillbar { -webkit-appearance: none; appearance: none; height: 6px; width: 80px; border-radius: 9999px; border: none; background: #e2e8f0; }
.dark .ver-fillbar { background: #475569; }
.ver-fillbar::-webkit-progress-bar { background: #e2e8f0; border-radius: 9999px; }
.dark .ver-fillbar::-webkit-progress-bar { background: #475569; }
.ver-fillbar.fill-full::-webkit-progress-value { background: #10b981; border-radius: 9999px; }
.ver-fillbar.fill-full::-moz-progress-bar    { background: #10b981; border-radius: 9999px; }
.ver-fillbar.fill-high::-webkit-progress-value { background: #fbbf24; border-radius: 9999px; }
.ver-fillbar.fill-high::-moz-progress-bar    { background: #fbbf24; border-radius: 9999px; }
.ver-fillbar.fill-low::-webkit-progress-value  { background: #f87171; border-radius: 9999px; }
.ver-fillbar.fill-low::-moz-progress-bar     { background: #f87171; border-radius: 9999px; }
`

/* ══════════════════════════════ Helpers ══════════════════════════════ */

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  published: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  archived:  { label: 'Archived',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
}

const formatDate = (iso?: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const FillBar: React.FC<{ filled: number; total: number }> = ({ filled, total }) => {
  if (!total) return <span className="text-xs text-slate-400">—</span>
  const pct = Math.round((filled / total) * 100)
  const fillCls = pct === 100 ? 'fill-full' : pct >= 80 ? 'fill-high' : 'fill-low'
  return (
    <div className="flex items-center gap-2">
      <progress className={`ver-fillbar ${fillCls}`} value={pct} max={100} />
      <span className="text-xs text-slate-500 dark:text-slate-400">{pct}%</span>
    </div>
  )
}

/* ══════════════════════════════ Component ══════════════════════════════ */

const Versions: React.FC = () => {
  const navigate = useNavigate()
  const [versions, setVersions] = useState<TimetableVersionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await timetableService.getVersions()
      setVersions(data)
    } catch {
      toast.error('Failed to load versions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handlePublish = async (id: string) => {
    setActionId(id)
    try {
      await timetableService.publishVersion(id)
      toast.success('Version published.')
      void load()
    } catch {
      toast.error('Failed to publish version.')
    } finally {
      setActionId(null)
    }
  }

  const handleArchive = async (id: string) => {
    setActionId(id)
    try {
      await timetableService.archiveVersion(id)
      toast.success('Version archived.')
      void load()
    } catch {
      toast.error('Failed to archive version.')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete draft "${name}"? This cannot be undone.`)) return
    setActionId(id)
    try {
      await timetableService.deleteVersion(id)
      toast.success('Draft deleted.')
      void load()
    } catch {
      toast.error('Failed to delete version.')
    } finally {
      setActionId(null)
    }
  }

  const handleExportExcel = async (id: string, name: string) => {
    try {
      await timetableService.exportExcel(id, `timetable-${name.replace(/[^a-zA-Z0-9-]/g, '_')}.xlsx`)
    } catch {
      toast.error('Excel export failed.')
    }
  }

  return (
    <div className="space-y-6">
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: FILL_BAR_STYLES }} />
      {/* ── Page header ── */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-6 sm:px-8 dark:from-sky-950/30 dark:via-slate-800 dark:to-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
            Time Table
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Versions
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Manage generated timetable snapshots. Publish a version to make it the official
            schedule. Only draft versions can be deleted.
          </p>
        </div>
      </section>

      {/* ── Actions row ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => navigate('/time-table/generate')}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <SparklesIcon className="size-4" />
          Generate New
        </button>
      </div>

      {/* ── Version list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">
          Loading versions…
        </div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-600 dark:bg-slate-800">
          <ClockIcon className="size-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            No versions yet
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Click "Generate New" to create your first timetable.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Name', 'Status', 'Generated', 'Fill Rate', 'Conflicts', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {versions.map((v) => {
                const busy = actionId === v._id
                const style = STATUS_STYLES[v.status] ?? STATUS_STYLES.draft
                const stats = v.generationStats ?? { totalSlots: 0, filledSlots: 0 }

                return (
                  <tr key={v._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                    {/* Name */}
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {v.name}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.cls}`}>
                        {style.label}
                      </span>
                    </td>

                    {/* Generated at */}
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(v.generatedAt)}
                    </td>

                    {/* Fill rate */}
                    <td className="px-4 py-3">
                      <FillBar filled={stats.filledSlots} total={stats.totalSlots} />
                    </td>

                    {/* Conflicts */}
                    <td className="px-4 py-3">
                      {v.conflictCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {v.conflictCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircleIcon className="size-3.5" />
                          None
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* View */}
                        <button
                          type="button"
                          title="View in Class Grid"
                          onClick={() => navigate('/time-table/class-wise')}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                        >
                          <EyeIcon className="size-4" />
                        </button>

                        {/* Export Excel */}
                        <button
                          type="button"
                          title="Export Excel"
                          onClick={() => handleExportExcel(v._id, v.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
                        >
                          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </button>

                        {/* Publish (draft only) */}
                        {v.status === 'draft' && (
                          <button
                            type="button"
                            title="Publish"
                            disabled={busy}
                            onClick={() => handlePublish(v._id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                          >
                            <CheckCircleIcon className="size-4" />
                          </button>
                        )}

                        {/* Archive (published only) */}
                        {v.status === 'published' && (
                          <button
                            type="button"
                            title="Archive"
                            disabled={busy}
                            onClick={() => handleArchive(v._id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                          >
                            <ArchiveBoxIcon className="size-4" />
                          </button>
                        )}

                        {/* Delete (draft only) */}
                        {v.status === 'draft' && (
                          <button
                            type="button"
                            title="Delete draft"
                            disabled={busy}
                            onClick={() => handleDelete(v._id, v.name)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Versions
