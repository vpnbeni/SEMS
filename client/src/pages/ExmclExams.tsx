import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import exmclExamService, { type ExmclExamDefinition } from '@/services/exmclExamService'

const DEFAULT_EXAM_TEMPLATES = [
  { name: 'Unit Test 1', code: 'UT1' },
  { name: 'Unit Test 2', code: 'UT2' },
  { name: 'Periodic Test 1', code: 'PT1' },
  { name: 'Periodic Test 2', code: 'PT2' },
  { name: 'Semester Assessment 1', code: 'SA1' },
  { name: 'Semester Assessment 2 / Annual', code: 'SA2/ANNUAL' },
]

const ExmclExams: React.FC = () => {
  const [items, setItems] = useState<ExmclExamDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [duration, setDuration] = useState('')
  const [maximumMarks, setMaximumMarks] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setCode('')
    setDuration('')
    setMaximumMarks('')
  }

  const loadExams = async () => {
    setLoading(true)
    try {
      const data = await exmclExamService.getAll()
      setItems(data)
    } catch {
      toast.error('Failed to load exams.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExams()
  }, [])

  const codeSet = useMemo(() => {
    return new Set(items.map((item) => item.code.trim().toUpperCase()))
  }, [items])

  const hasTemplate = (templateCode: string) => codeSet.has(templateCode.trim().toUpperCase())

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Exam name and code are required.')
      return
    }
    const parsedMaximumMarks = Number(maximumMarks)
    if (!Number.isFinite(parsedMaximumMarks) || parsedMaximumMarks < 0) {
      toast.error('Maximum Marks (M.M.) must be a non-negative number.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        duration: duration.trim(),
        maximumMarks: parsedMaximumMarks,
        displayOrder: editingId
          ? items.find((item) => item._id === editingId)?.displayOrder ?? items.length
          : items.length,
      }

      if (editingId) {
        await exmclExamService.update(editingId, payload)
        toast.success('Exam updated.')
      } else {
        await exmclExamService.create(payload)
        toast.success('Exam created.')
      }
      resetForm()
      await loadExams()
    } catch {
      toast.error('Unable to save exam.')
    } finally {
      setSaving(false)
    }
  }

  const handleUseTemplate = (template: { name: string; code: string }) => {
    setEditingId(null)
    setName(template.name)
    setCode(template.code)
  }

  const handleEdit = (item: ExmclExamDefinition) => {
    setEditingId(item._id)
    setName(item.name)
    setCode(item.code)
    setDuration(String(item.duration || ''))
    setMaximumMarks(String(item.maximumMarks ?? 0))
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this exam?')) return
    try {
      await exmclExamService.remove(id)
      toast.success('Exam deleted.')
      if (editingId === id) resetForm()
      await loadExams()
    } catch {
      toast.error('Failed to delete exam.')
    }
  }

  const fieldClassName =
    'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
      <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {DEFAULT_EXAM_TEMPLATES.map((template) => (
            <button
              key={template.code}
              type="button"
              onClick={() => handleUseTemplate(template)}
              disabled={hasTemplate(template.code) && !editingId}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300"
              title={hasTemplate(template.code) ? 'Already added in this session' : `Use ${template.code}`}
            >
              {template.code}
            </button>
          ))}
          <input
            id="exam-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Exam name"
            title="Exam name"
            aria-label="Exam name"
            className={`${fieldClassName} min-w-[180px] flex-1`}
          />
          <input
            id="exam-code"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Code"
            title="Exam code"
            aria-label="Exam code"
            className={`${fieldClassName} w-[110px]`}
          />
          <input
            id="exam-duration"
            type="text"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="Duration"
            title="Duration"
            aria-label="Duration"
            className={`${fieldClassName} w-[120px]`}
          />
          <input
            id="exam-mm"
            type="number"
            min={0}
            value={maximumMarks}
            onChange={(event) => setMaximumMarks(event.target.value)}
            placeholder="M.M."
            title="Maximum marks"
            aria-label="Maximum marks"
            className={`${fieldClassName} w-[88px]`}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create Exam'}
          </button>
          {(editingId || name || code || duration || maximumMarks) && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Session Exams</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Total exams: {items.length}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadExams()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading exams...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No exams created yet. Add exams like UT1, UT2, PT1, PT2, SA1, SA2/ANNUAL.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Exam Name</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">M.M.</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, index) => (
                  <tr key={item._id}>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{item.name}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.duration || '-'}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.maximumMarks ?? 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item._id)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}

export default ExmclExams
