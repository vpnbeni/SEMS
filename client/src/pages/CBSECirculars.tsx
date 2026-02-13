import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import cbseCircularService, { CBSECircular } from '../services/cbseCircularService'

const CBSECirculars: React.FC = () => {
  const [circulars, setCirculars] = useState<CBSECircular[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    circularNumber: '',
    publishDate: '',
    sourceUrl: '',
    summary: '',
  })

  const loadCirculars = async () => {
    try {
      setLoading(true)
      const response = await cbseCircularService.getAll()
      setCirculars(response.data?.data || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load CBSE circulars')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCirculars()
  }, [])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.publishDate) {
      toast.error('Title and publish date are required')
      return
    }

    try {
      setSaving(true)
      await cbseCircularService.create({
        title: form.title.trim(),
        circularNumber: form.circularNumber.trim() || undefined,
        publishDate: form.publishDate,
        sourceUrl: form.sourceUrl.trim() || undefined,
        summary: form.summary.trim() || undefined,
      })
      setShowAddModal(false)
      setForm({
        title: '',
        circularNumber: '',
        publishDate: '',
        sourceUrl: '',
        summary: '',
      })
      await loadCirculars()
      toast.success('Circular added')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add circular')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this circular?')
    if (!confirmed) return

    try {
      await cbseCircularService.deleteById(id)
      setCirculars((prev) => prev.filter((item) => item._id !== id))
      toast.success('Circular deleted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete circular')
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CBSE Circulars</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Examination circulars sorted by publish date
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Add Circular
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading circulars...</div>
        ) : circulars.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No circulars added yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {circulars.map((item) => (
              <div key={item._id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                      <span>
                        {new Date(item.publishDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {item.circularNumber ? <span>No: {item.circularNumber}</span> : null}
                    </div>
                    {item.summary ? (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.summary}</p>
                    ) : null}
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Open Circular
                      </a>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Add CBSE Circular</h3>
            </div>
            <div className="p-5 space-y-4">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title *"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={form.circularNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, circularNumber: e.target.value }))}
                  placeholder="Circular Number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, publishDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <input
                value={form.sourceUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                placeholder="Source URL (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <textarea
                value={form.summary}
                onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                placeholder="Summary (optional)"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CBSECirculars
