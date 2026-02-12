import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import undertakingService, { type UndertakingRecord } from '../services/undertakingService'

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('en-IN')
}

const formatBytes = (value?: number) => {
  if (!value || value <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

const UndertakingForm: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [record, setRecord] = useState<UndertakingRecord | null>(null)

  const loadCurrent = async () => {
    try {
      setLoading(true)
      const data = await undertakingService.getCurrent()
      setRecord(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load undertaking file')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrent().catch(() => undefined)
  }, [])

  const uploadedAt = useMemo(
    () => formatDateTime(record?.rolledOutAt || record?.createdAt),
    [record?.rolledOutAt, record?.createdAt]
  )

  const handleDownload = async () => {
    if (!record) return
    try {
      setDownloading(true)
      await undertakingService.downloadCurrent()
    } catch {
      // API layer shows toast
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700 max-w-4xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Undertaking Form
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Download the latest undertaking form rolled out by the super admin for all exam functionaries.
        </p>

        {loading ? (
          <div className="text-gray-600 dark:text-gray-400">Loading undertaking file...</div>
        ) : !record ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
            No undertaking file has been rolled out yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Title</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white">{record.title || '-'}</div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Academic Year</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white">{record.academicYear || '-'}</div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">File Size</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white">{formatBytes(record.metadata?.fileSize)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Rolled Out</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white">{uploadedAt}</div>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? 'Downloading...' : 'Download Undertaking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UndertakingForm
