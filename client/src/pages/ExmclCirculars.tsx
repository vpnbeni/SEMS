import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import exmclCircularService, { type ExmclCircular } from '@/services/exmclCircularService'

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
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await exmclCircularService.update(editingId, { title, content })
        toast.success('Circular updated.')
      } else {
        await exmclCircularService.create({ title, content })
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
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
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
