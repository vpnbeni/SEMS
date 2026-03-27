import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimetable } from '@/contexts/TimetableContext'
import timetableService, {
  type GenerateResult,
  type ConflictReportEntry,
} from '@/services/timetableService'
import toast from 'react-hot-toast'
import {
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

/* ══════════════════════════════ Pre-flight types ══════════════════════════════ */

interface PreflightIssue {
  severity: 'error' | 'warning'
  message: string
}

interface PreflightStats {
  classCount: number
  subjectCount: number
  teacherCount: number
  totalPeriodSlots: number
  periodsPerWeek: number
  issues: PreflightIssue[]
}

/* ══════════════════════════════ Helpers ══════════════════════════════ */

const StatusBadge: React.FC<{ status: 'error' | 'warning' | 'ok' }> = ({ status }) => {
  if (status === 'error')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <XCircleIcon className="size-3.5" />
        Error
      </span>
    )
  if (status === 'warning')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <ExclamationTriangleIcon className="size-3.5" />
        Warning
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <CheckCircleIcon className="size-3.5" />
      Ready
    </span>
  )
}

/* ══════════════════════════════ Component ══════════════════════════════ */

const Generate: React.FC = () => {
  const navigate = useNavigate()
  const {
    classes,
    subjects,
    teachers,
    teacherSubjectAllocations,
    periodAllocation,
    periodsPerWeek,
    periodsPerDay,
    parallelSubjectPairs,
  } = useTimetable()

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [versionName, setVersionName] = useState('')

  // ── Pre-flight analysis ──────────────────────────────────────────────────

  const preflight = useMemo<PreflightStats>(() => {
    const issues: PreflightIssue[] = []

    if (classes.length === 0) {
      issues.push({ severity: 'error', message: 'No classes configured. Add classes in the Classes page.' })
    }

    if (subjects.length === 0) {
      issues.push({ severity: 'error', message: 'No subjects configured. Add subjects in the Subjects page.' })
    }

    if (teachers.length === 0) {
      issues.push({ severity: 'warning', message: 'No teachers configured. Periods will be generated without teacher assignments.' })
    }

    if (periodsPerDay === 0) {
      issues.push({ severity: 'error', message: 'Bell timings are not configured. Set up Bell Timings first.' })
    }

    // Build parallel-pair lookup: classNameLower → [[subjALower, subjBLower]]
    const parallelPairsByClass = new Map<string, [string, string][]>()
    parallelSubjectPairs.forEach((pair) => {
      const key = pair.className.trim().toLowerCase()
      if (!parallelPairsByClass.has(key)) parallelPairsByClass.set(key, [])
      parallelPairsByClass.get(key)!.push([
        pair.subjectA.trim().toLowerCase(),
        pair.subjectB.trim().toLowerCase(),
      ])
    })

    // Check subject-level issues per class
    classes.forEach((cls) => {
      const classAlloc = periodAllocation[cls.id] || {}

      if (Object.keys(classAlloc).length === 0) {
        issues.push({
          severity: 'error',
          message: `${cls.className} ${cls.section}: No period distribution set. Configure in Period Distribution.`,
        })
        return
      }

      // Subtract parallel-pair overlap (same logic as PeriodAllocation getRowTotal)
      const rawTotal = Object.values(classAlloc).reduce((sum, v) => sum + (v || 0), 0)
      const classPairs = parallelPairsByClass.get(cls.className.trim().toLowerCase()) || []
      let overlap = 0
      const seen = new Set<string>()
      classPairs.forEach(([a, b]) => {
        const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`
        if (seen.has(pairKey)) return
        seen.add(pairKey)
        const cA = classAlloc[a] || 0
        const cB = classAlloc[b] || 0
        if (cA > 0 && cB > 0) overlap += Math.min(cA, cB)
      })
      const totalAllocated = rawTotal - overlap

      const totalAvailable = periodsPerWeek
      if (totalAllocated > totalAvailable) {
        issues.push({
          severity: 'warning',
          message: `${cls.className} ${cls.section}: Allocated ${totalAllocated} periods but only ${totalAvailable} available per week.`,
        })
      }
    })

    // Check teacher assignments
    const teacherAssignedSubjectKeys = new Set<string>()
    teacherSubjectAllocations.forEach((alloc) => {
      alloc.assignments.forEach((assignment) => {
        assignment.subjects.forEach((subj) => {
          teacherAssignedSubjectKeys.add(`${assignment.classId}::${subj.toLowerCase()}`)
        })
      })
    })

    classes.forEach((cls) => {
      const classAlloc = periodAllocation[cls.id] || {}
      Object.keys(classAlloc).forEach((subj) => {
        if ((classAlloc[subj] || 0) > 0) {
          const key = `${cls.id}::${subj.toLowerCase()}`
          if (!teacherAssignedSubjectKeys.has(key)) {
            issues.push({
              severity: 'warning',
              message: `${cls.className} ${cls.section} — "${subj}": No teacher assigned in Departments. Will be scheduled without teacher.`,
            })
          }
        }
      })
    })

    return {
      classCount: classes.length,
      subjectCount: subjects.length,
      teacherCount: teachers.length,
      totalPeriodSlots: classes.length * 6 * periodsPerDay,
      periodsPerWeek,
      issues,
    }
  }, [classes, subjects, teachers, teacherSubjectAllocations, periodAllocation, periodsPerWeek, periodsPerDay])

  const hasErrors = preflight.issues.some((i) => i.severity === 'error')
  const hasWarnings = preflight.issues.some((i) => i.severity === 'warning')
  const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok'

  // ── Default version name ─────────────────────────────────────────────────

  useEffect(() => {
    if (!versionName) {
      const now = new Date()
      setVersionName(
        `v${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
      )
    }
  }, [])

  // ── Generate handler ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (hasErrors) {
      toast.error('Fix the errors above before generating.')
      return
    }

    setGenerating(true)
    setResult(null)

    try {
      const res = await timetableService.generate(versionName.trim() || undefined)
      setResult(res)

      if (res.stats.conflictCount === 0) {
        toast.success('Timetable generated successfully — no conflicts!')
      } else {
        toast.success(
          `Timetable generated with ${res.stats.conflictCount} unresolved conflict(s). Review below.`
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed. Please try again.'
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  // ── Conflict entry renderer ──────────────────────────────────────────────

  const ConflictRow: React.FC<{ entry: ConflictReportEntry }> = ({ entry }) => (
    <tr className="border-t border-slate-100 dark:border-slate-700">
      <td className="py-2 pr-4 text-sm font-medium text-slate-800 dark:text-slate-200">
        {entry.className}
      </td>
      <td className="py-2 pr-4 text-sm text-slate-600 dark:text-slate-400">
        {entry.subjectName}
      </td>
      <td className="py-2 pr-4 text-sm">
        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          {entry.type}
        </span>
      </td>
      <td className="py-2 pr-4 text-sm text-slate-600 dark:text-slate-400">
        {entry.actual} / {entry.expected}
      </td>
      <td className="py-2 text-sm text-slate-500 dark:text-slate-400">{entry.message}</td>
    </tr>
  )

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-6 py-6 sm:px-8 dark:from-indigo-950/30 dark:via-slate-800 dark:to-purple-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
            Time Table
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Generate Timetable
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            One-click automated generation. The system analyses your configuration — classes,
            subjects, period distribution, teacher assignments — and produces a clash-free
            timetable using a constraint-satisfaction algorithm.
          </p>
        </div>
      </section>

      {/* ── Pre-flight summary ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Configuration Check
          </h2>
          <StatusBadge status={overallStatus} />
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Classes', value: preflight.classCount },
            { label: 'Subjects', value: preflight.subjectCount },
            { label: 'Teachers', value: preflight.teacherCount },
            { label: 'Total Slots', value: preflight.totalPeriodSlots },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-700/50"
            >
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Issues list */}
        {preflight.issues.length > 0 && (
          <ul className="mt-4 space-y-2">
            {preflight.issues.map((issue, idx) => (
              <li
                key={idx}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  issue.severity === 'error'
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                }`}
              >
                {issue.severity === 'error' ? (
                  <XCircleIcon className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" />
                )}
                {issue.message}
              </li>
            ))}
          </ul>
        )}

        {preflight.issues.length === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircleIcon className="size-4 shrink-0" />
            All configuration checks passed. Ready to generate.
          </div>
        )}
      </section>

      {/* ── Generate action ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Generate
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Name this version and click Generate. A new draft will be saved that you can view, publish, or export.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="version-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Version Name
            </label>
            <input
              id="version-name"
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. Summer 2025-26 v1"
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || hasErrors}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              generating || hasErrors
                ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            {generating ? (
              <>
                <svg
                  className="size-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <SparklesIcon className="size-4" />
                Generate Timetable
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Result panel ── */}
      {result && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Result — {result.version.name}
          </h2>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Filled Slots',
                value: `${result.stats.filledSlots} / ${result.stats.totalSlots}`,
                good: result.stats.filledSlots === result.stats.totalSlots,
              },
              {
                label: 'Fill Rate',
                value: result.stats.totalSlots
                  ? `${Math.round((result.stats.filledSlots / result.stats.totalSlots) * 100)}%`
                  : '—',
                good: result.stats.filledSlots === result.stats.totalSlots,
              },
              {
                label: 'Conflicts',
                value: result.stats.conflictCount,
                good: result.stats.conflictCount === 0,
              },
              {
                label: 'Duration',
                value: `${result.stats.durationMs}ms`,
                good: true,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border p-3 text-center ${
                  stat.good
                    ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20'
                    : 'border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20'
                }`}
              >
                <div
                  className={`text-xl font-bold ${
                    stat.good
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Conflict table */}
          {result.conflictReport.length > 0 ? (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <ExclamationTriangleIcon className="size-4" />
                {result.conflictReport.length} unresolved period(s) — subjects below did not get
                their full weekly allocation
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      {['Class', 'Subject', 'Type', 'Actual / Expected', 'Message'].map((h) => (
                        <th
                          key={h}
                          className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800">
                    {result.conflictReport.map((entry, idx) => (
                      <ConflictRow key={idx} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                <InformationCircleIcon className="mt-0.5 size-4 shrink-0" />
                Conflicts usually occur when teacher supply can't cover all subject demands across classes
                simultaneously. Try adjusting period counts in Period Distribution or teacher assignments in Departments.
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              <CheckCircleIcon className="size-4" />
              All periods scheduled successfully — zero conflicts.
            </div>
          )}

          {/* Navigation actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/time-table/class-wise')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              View Class Grid
              <ArrowRightIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/time-table/teacher-wise')}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              View Teacher Schedules
            </button>
            <button
              type="button"
              onClick={() => navigate('/time-table/versions')}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              Manage Versions
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

export default Generate
