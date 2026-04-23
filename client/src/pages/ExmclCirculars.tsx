import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import exmclCircularService, { type ExmclCircular } from '@/services/exmclCircularService'

const toInputDate = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const deriveSeriesFromReference = (referenceNumber?: string | null) => {
  const value = String(referenceNumber || '').trim()
  if (!value) return ''
  const match = value.match(/^(.*?)(\d+)$/)
  if (!match) return value
  return match[1].trim()
}

const getNextReferenceNumber = (seriesRaw: string, circulars: ExmclCircular[]) => {
  const series = seriesRaw.trim()
  if (!series) return ''
  const escapedSeries = series.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const suffixPattern = new RegExp(`^${escapedSeries}(\\d+)$`, 'i')

  let maxCounter = 0
  circulars.forEach((item) => {
    const value = item.referenceNumber?.trim()
    if (!value) return
    const match = value.match(suffixPattern)
    if (!match) return
    const parsed = Number.parseInt(match[1], 10)
    if (Number.isFinite(parsed) && parsed > maxCounter) {
      maxCounter = parsed
    }
  })

  return `${series}${String(maxCounter + 1).padStart(3, '0')}`
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ExmclCirculars: React.FC = () => {
  const [circulars, setCirculars] = useState<ExmclCircular[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [circularDate, setCircularDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [referenceSeries, setReferenceSeries] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

  const loadCirculars = async () => {
    setLoading(true)
    try {
      const data = await exmclCircularService.getAll()
      setCirculars(data)
    } catch {
      toast.error('Failed to load circulars.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCirculars()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setContent('')
    setCircularDate(new Date().toISOString().slice(0, 10))
  }

  useEffect(() => {
    if (editingId) return
    if (referenceSeries.trim()) return
    const latestWithSeries = circulars.find((item) => item.referenceSeries?.trim() || item.referenceNumber?.trim())
    if (!latestWithSeries) return
    const fallbackSeries = latestWithSeries.referenceSeries?.trim() || deriveSeriesFromReference(latestWithSeries.referenceNumber)
    if (fallbackSeries) setReferenceSeries(fallbackSeries)
  }, [circulars, editingId, referenceSeries])

  useEffect(() => {
    if (editingId) return
    setReferenceNumber(getNextReferenceNumber(referenceSeries, circulars))
  }, [referenceSeries, circulars, editingId])

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !circularDate || !referenceNumber.trim()) {
      toast.error('Title, content, date, and reference number are required.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await exmclCircularService.update(editingId, {
          title,
          content,
          circularDate,
          referenceSeries: referenceSeries.trim(),
          referenceNumber: referenceNumber.trim(),
        })
        toast.success('Circular updated.')
      } else {
        await exmclCircularService.create({
          title,
          content,
          circularDate,
          referenceSeries: referenceSeries.trim(),
          referenceNumber: referenceNumber.trim(),
        })
        toast.success('Circular drafted.')
      }
      resetForm()
      await loadCirculars()
    } catch {
      toast.error('Unable to save circular.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: ExmclCircular) => {
    setEditingId(item._id)
    setTitle(item.title)
    setContent(item.content)
    setCircularDate(toInputDate(item.circularDate))
    setReferenceSeries(item.referenceSeries?.trim() || deriveSeriesFromReference(item.referenceNumber))
    setReferenceNumber(item.referenceNumber || '')
  }

  const handlePublish = async (id: string) => {
    try {
      await exmclCircularService.publish(id)
      toast.success('Circular published.')
      await loadCirculars()
    } catch {
      toast.error('Failed to publish circular.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this circular?')) return
    try {
      await exmclCircularService.remove(id)
      toast.success('Circular deleted.')
      if (editingId === id) {
        resetForm()
      }
      await loadCirculars()
    } catch {
      toast.error('Failed to delete circular.')
    }
  }

  const publishedCount = useMemo(() => circulars.filter((item) => item.status === 'published').length, [circulars])
  const draftCount = circulars.length - publishedCount

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {editingId ? 'Edit Circular' : 'Draft Circular'}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create exam circular drafts and publish when ready.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="circular-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              id="circular-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter circular title"
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 md:max-w-xl dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="circular-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Date
              </label>
              <input
                id="circular-date"
                type="date"
                value={circularDate}
                onChange={(event) => setCircularDate(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="circular-reference-series" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reference Series
              </label>
              <input
                id="circular-reference-series"
                type="text"
                value={referenceSeries}
                onChange={(event) => setReferenceSeries(event.target.value)}
                placeholder="e.g. EXMCL/2026/"
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="circular-reference-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reference Number
              </label>
              <input
                id="circular-reference-number"
                type="text"
                value={referenceNumber}
                readOnly={!editingId}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Auto-generated from series"
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="circular-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Circular Content
            </label>
            <textarea
              id="circular-content"
              rows={8}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the circular details..."
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Update Circular' : 'Save as Draft'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Circulars</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Draft: {draftCount} | Published: {publishedCount}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadCirculars()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading circulars...</div>
        ) : circulars.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No circulars yet. Draft your first circular above.
          </div>
        ) : (
          <div className="space-y-3">
            {circulars.map((item) => (
              <article
                key={item._id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Date: {formatDate(item.circularDate)} | Ref: {item.referenceNumber || '-'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Updated: {formatDate(item.updatedAt)} | Published: {formatDate(item.publishedAt)}
                    </p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {item.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      Edit
                    </button>
                    {item.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => void handlePublish(item._id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete(item._id)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {item.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ExmclCirculars
