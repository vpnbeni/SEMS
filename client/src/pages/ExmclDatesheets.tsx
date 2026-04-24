import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import datesheetService from '@/services/datesheetService'
import subjectService from '@/services/subjectService'
import { useAcademicSession } from '@/contexts/AcademicSessionContext'

type SubjectOption = {
  _id: string
  name: string
  code: string
  class: string
  duration?: number
}

type ScheduleRow = {
  id: string
  subjectId: string
  examDate: string
  start: string
  end: string
  duration: number
}

type SavedDatesheet = {
  _id: string
  title: string
  class: string
  subjects: Array<{
    _id?: string
    subject?: { _id?: string; name?: string; code?: string }
    examDate?: string
    timeSlot?: { start?: string; end?: string }
    duration?: number
  }>
  createdAt: string
}

const toAcademicYear = (session?: string | null) => {
  if (session && /^\d{4}-\d{4}$/.test(session)) return session
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${year + 1}`
}

const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const ExmclDatesheets: React.FC = () => {
  const { currentSession } = useAcademicSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [savedDatesheets, setSavedDatesheets] = useState<SavedDatesheet[]>([])
  const [title, setTitle] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [rows, setRows] = useState<ScheduleRow[]>([
    { id: generateRowId(), subjectId: '', examDate: '', start: '10:30', end: '13:30', duration: 180 },
  ])

  const loadData = async () => {
    setLoading(true)
    try {
      const [subjectRes, datesheetRes] = await Promise.all([
        subjectService.getAll({ page: 1, limit: 500 }),
        datesheetService.getAll({ examType: 'internal' }),
      ])

      const subjectList = Array.isArray(subjectRes?.data?.data) ? subjectRes.data.data : []
      setSubjects(subjectList)

      const datesheetList = Array.isArray(datesheetRes?.data?.data?.datesheets)
        ? datesheetRes.data.data.datesheets
        : []
      setSavedDatesheets(datesheetList)
    } catch {
      toast.error('Failed to load datesheet data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const classOptions = useMemo(() => {
    const uniq = new Set(
      subjects
        .map((item) => String(item.class || '').trim())
        .filter(Boolean)
    )
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [subjects])

  const filteredSubjects = useMemo(() => {
    if (!selectedClass) return []
    const classKey = selectedClass.trim().toLowerCase()
    return subjects
      .filter((item) => String(item.class || '').trim().toLowerCase() === classKey)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [subjects, selectedClass])

  const resetBuilder = () => {
    setTitle('')
    setSelectedClass('')
    setRows([{ id: generateRowId(), subjectId: '', examDate: '', start: '10:30', end: '13:30', duration: 180 }])
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: generateRowId(), subjectId: '', examDate: '', start: '10:30', end: '13:30', duration: 180 },
    ])
  }

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  const updateRow = (id: string, patch: Partial<ScheduleRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const handleCreateDatesheet = async () => {
    if (!selectedClass || !title.trim()) {
      toast.error('Class and title are required.')
      return
    }
    const invalidRow = rows.find((row) => !row.subjectId || !row.examDate || !row.start || !row.end || !row.duration)
    if (invalidRow) {
      toast.error('Please fill all schedule row fields.')
      return
    }

    const examDates = rows.map((row) => new Date(row.examDate))
    const startDate = new Date(Math.min(...examDates.map((date) => date.getTime()))).toISOString().slice(0, 10)
    const endDate = new Date(Math.max(...examDates.map((date) => date.getTime()))).toISOString().slice(0, 10)

    setSaving(true)
    try {
      const createRes = await datesheetService.create({
        title: title.trim(),
        examType: 'internal',
        class: selectedClass,
        academicYear: toAcademicYear(currentSession),
        startDate,
        endDate,
        generalInstructions: [],
      })

      const createdId = createRes?.data?.data?.datesheet?._id
      if (!createdId) throw new Error('Failed to create datesheet')

      await datesheetService.update(createdId, {
        subjects: rows.map((row) => ({
          subject: row.subjectId,
          examDate: row.examDate,
          timeSlot: { start: row.start, end: row.end },
          duration: Number(row.duration),
          instructions: '',
          isOptional: false,
        })),
      })

      toast.success('Datesheet created successfully.')
      resetBuilder()
      await loadData()
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Unable to create datesheet.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create Datesheet</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Build your own datesheet by selecting dates and subjects from ExmCl Subjects.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Datesheet Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. PT2 Datesheet"
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Class</label>
            <select
              title="Select class"
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Select class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Subject</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Start</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">End</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Duration (min)</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <select
                      title="Select subject"
                      value={row.subjectId}
                      onChange={(event) => updateRow(row.id, { subjectId: event.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">{selectedClass ? 'Select subject' : 'Select class first'}</option>
                      {filteredSubjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.code} - {subject.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      title="Exam date"
                      value={row.examDate}
                      onChange={(event) => updateRow(row.id, { examDate: event.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      title="Start time"
                      value={row.start}
                      onChange={(event) => updateRow(row.id, { start: event.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      title="End time"
                      value={row.end}
                      onChange={(event) => updateRow(row.id, { end: event.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      title="Duration in minutes"
                      min={30}
                      value={row.duration}
                      onChange={(event) => updateRow(row.id, { duration: Number(event.target.value || 0) })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          >
            Add Row
          </button>
          <button
            type="button"
            onClick={handleCreateDatesheet}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Create Datesheet'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Saved Datesheets</h2>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading datesheets...</div>
        ) : savedDatesheets.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No datesheets yet. Create your first datesheet above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Subjects</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {savedDatesheets.map((sheet) => (
                  <tr key={sheet._id}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{sheet.title}</td>
                    <td className="px-3 py-2">{sheet.class}</td>
                    <td className="px-3 py-2">{sheet.subjects?.length || 0}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {new Date(sheet.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default ExmclDatesheets
