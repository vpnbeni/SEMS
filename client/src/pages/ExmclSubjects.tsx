import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTimetable } from '@/contexts/TimetableContext'
import exmclExamService, { type ExmclExamDefinition, type ExamSubjectMatrix } from '@/services/exmclExamService'
import subjectService from '@/services/subjectService'

type SubjectRow = {
  key: string
  name: string
  source: 'timetable' | 'master' | 'both'
}

const subjectKey = (name: string) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')

const extractSubjectList = (payload: any): Array<{ name?: string }> => {
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const ExmclSubjects: React.FC = () => {
  const navigate = useNavigate()
  const { subjects: timetableSubjects, classes: timetableClasses } = useTimetable()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exams, setExams] = useState<ExmclExamDefinition[]>([])
  const [matrix, setMatrix] = useState<ExamSubjectMatrix>({})
  const [masterSubjectNames, setMasterSubjectNames] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [matrixPayload, masterRes] = await Promise.all([
        exmclExamService.getSubjectMatrix(),
        subjectService.getAll({ page: 1, limit: 500 }).catch(() => null),
      ])
      setExams(matrixPayload.exams as ExmclExamDefinition[])
      setMatrix(matrixPayload.matrix || {})
      setMasterSubjectNames(
        extractSubjectList(masterRes)
          .map((item) => String(item?.name || '').trim())
          .filter(Boolean)
      )
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load exam-subject matrix.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const subjectRows = useMemo(() => {
    const byKey = new Map<string, SubjectRow>()

    const add = (name: string, source: SubjectRow['source']) => {
      const trimmed = String(name || '').trim()
      if (!trimmed) return
      const key = subjectKey(trimmed)
      if (!key) return
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, { key, name: trimmed, source })
        return
      }
      if (existing.source !== source) {
        byKey.set(key, { ...existing, source: 'both' })
      }
    }

    ;(timetableSubjects || []).forEach((item) => add(String(item.name || ''), 'timetable'))
    ;(timetableClasses || []).forEach((row) => {
      ;(row.subjects || []).forEach((name) => add(String(name), 'timetable'))
    })
    masterSubjectNames.forEach((name) => add(name, 'master'))

    return Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
  }, [masterSubjectNames, timetableClasses, timetableSubjects])

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return subjectRows
    return subjectRows.filter((row) => row.name.toLowerCase().includes(q))
  }, [search, subjectRows])

  const isChecked = (examId: string, key: string) =>
    Array.isArray(matrix[examId]) && matrix[examId].includes(key)

  const toggleCell = (examId: string, key: string) => {
    setMatrix((prev) => {
      const current = new Set(prev[examId] || [])
      if (current.has(key)) current.delete(key)
      else current.add(key)
      return { ...prev, [examId]: Array.from(current) }
    })
  }

  const toggleExamColumn = (examId: string, checked: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [examId]: checked ? filteredSubjects.map((row) => row.key) : [],
    }))
  }

  const toggleSubjectRow = (key: string, checked: boolean) => {
    setMatrix((prev) => {
      const next = { ...prev }
      exams.forEach((exam) => {
        const current = new Set(next[exam._id] || [])
        if (checked) current.add(key)
        else current.delete(key)
        next[exam._id] = Array.from(current)
      })
      return next
    })
  }

  const handleSave = async () => {
    if (exams.length === 0) {
      toast.error('Create exams first, then mark subjects.')
      return
    }
    setSaving(true)
    try {
      const payload = await exmclExamService.saveSubjectMatrix(matrix)
      setExams(payload.exams as ExmclExamDefinition[])
      setMatrix(payload.matrix || {})
      toast.success('Exam-subject matrix saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save matrix.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects"
              title="Search subjects"
              aria-label="Search subjects"
              className="min-w-[200px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {subjectRows.length} subjects · {exams.length} exams
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/exmcl/exams')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Manage Exams
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || exams.length === 0}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Matrix'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading subjects and exams…</div>
          ) : exams.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No exams created yet. Add exams first, then mark subjects for each exam.
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No subjects found from timetable or subjects master. Add subjects in Timetable or Subjects first.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-max table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[200px]" />
                  {exams.map((exam) => (
                    <col key={exam._id} className="w-[56px]" />
                  ))}
                  <col className="w-[48px]" />
                </colgroup>
                <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="sticky left-0 z-30 border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                      Subject
                    </th>
                    {exams.map((exam) => {
                      const allSelected =
                        filteredSubjects.length > 0 &&
                        filteredSubjects.every((row) => isChecked(exam._id, row.key))
                      const someSelected =
                        !allSelected && filteredSubjects.some((row) => isChecked(exam._id, row.key))
                      return (
                        <th
                          key={exam._id}
                          className="border-b border-gray-200 px-1 py-1.5 text-center text-[11px] font-semibold uppercase tracking-normal text-gray-500 dark:border-gray-700 dark:text-gray-400"
                          title={exam.name}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="leading-tight">{exam.code}</span>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected
                              }}
                              onChange={(e) => toggleExamColumn(exam._id, e.target.checked)}
                              title={`Select all subjects for ${exam.code}`}
                              aria-label={`Select all subjects for ${exam.code}`}
                              className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </div>
                        </th>
                      )
                    })}
                    <th className="border-b border-gray-200 px-1 py-1.5 text-center text-[11px] font-semibold uppercase tracking-normal text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSubjects.map((row) => {
                    const rowAll =
                      exams.length > 0 && exams.every((exam) => isChecked(exam._id, row.key))
                    const rowSome = !rowAll && exams.some((exam) => isChecked(exam._id, row.key))
                    return (
                      <tr key={row.key} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30">
                        <td className="sticky left-0 z-10 truncate border-r border-gray-100 bg-white px-2 py-1.5 text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-800 dark:text-white" title={row.name}>
                          {row.name}
                        </td>
                        {exams.map((exam) => (
                          <td key={`${row.key}-${exam._id}`} className="px-1 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked(exam._id, row.key)}
                              onChange={() => toggleCell(exam._id, row.key)}
                              title={`${row.name} for ${exam.code}`}
                              aria-label={`${row.name} for ${exam.code}`}
                              className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={rowAll}
                            ref={(el) => {
                              if (el) el.indeterminate = rowSome
                            }}
                            onChange={(e) => toggleSubjectRow(row.key, e.target.checked)}
                            title={`Mark ${row.name} for all exams`}
                            aria-label={`Mark ${row.name} for all exams`}
                            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExmclSubjects
