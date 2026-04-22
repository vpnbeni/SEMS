import React, { useEffect, useMemo, useState } from 'react'
import timetableService, { type TimetableVersionSummary } from '@/services/timetableService'
import toast from 'react-hot-toast'

type FormatType = 'excel' | 'class-pdf' | 'teacher-pdf'

const FORMAT_OPTIONS: Array<{ value: FormatType; label: string; helper: string }> = [
  {
    value: 'excel',
    label: 'Excel (.xlsx)',
    helper: 'All class timetables in spreadsheet format',
  },
  {
    value: 'class-pdf',
    label: 'Class-wise PDF',
    helper: 'Combined class timetable PDF',
  },
  {
    value: 'teacher-pdf',
    label: 'Teacher-wise PDF',
    helper: 'Combined teacher timetable PDF',
  },
]

const toSafeName = (value: string) => value.replace(/[^a-zA-Z0-9-]/g, '_')

const Formats: React.FC = () => {
  const [versions, setVersions] = useState<TimetableVersionSummary[]>([])
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('excel')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const loadVersions = async () => {
      setLoadingVersions(true)
      try {
        const data = await timetableService.getVersions()
        setVersions(data)

        const preferred = data.find((item) => item.status === 'published') || data[0]
        if (preferred) {
          setSelectedVersionId(preferred._id)
        }
      } catch {
        toast.error('Failed to load timetable versions.')
      } finally {
        setLoadingVersions(false)
      }
    }

    void loadVersions()
  }, [])

  const selectedVersion = useMemo(
    () => versions.find((item) => item._id === selectedVersionId) || null,
    [versions, selectedVersionId]
  )

  const handleDownload = async () => {
    if (!selectedVersion) {
      toast.error('Select a version first.')
      return
    }

    setDownloading(true)
    try {
      const safeVersionName = toSafeName(selectedVersion.name || 'version')
      if (selectedFormat === 'excel') {
        await timetableService.exportExcel(selectedVersion._id, `timetable-${safeVersionName}.xlsx`)
      } else if (selectedFormat === 'class-pdf') {
        await timetableService.exportClassPDF(selectedVersion._id, undefined, `class-timetable-${safeVersionName}.pdf`)
      } else {
        await timetableService.exportTeacherPDF(selectedVersion._id, undefined, `teacher-timetable-${safeVersionName}.pdf`)
      }
      toast.success('Download started.')
    } catch {
      toast.error('Failed to download timetable in selected format.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Timetable Formats
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose a saved timetable version and format type, then download in one click.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="format-version"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Version
            </label>
            <select
              id="format-version"
              value={selectedVersionId}
              onChange={(event) => setSelectedVersionId(event.target.value)}
              disabled={loadingVersions || versions.length === 0}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {versions.length === 0 ? (
                <option value="">No versions found</option>
              ) : (
                versions.map((version) => (
                  <option key={version._id} value={version._id}>
                    {version.name} ({version.status})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="format-type"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Format Type
            </label>
            <select
              id="format-type"
              value={selectedFormat}
              onChange={(event) => setSelectedFormat(event.target.value as FormatType)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {FORMAT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {FORMAT_OPTIONS.find((item) => item.value === selectedFormat)?.helper}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loadingVersions || !selectedVersion}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {downloading ? 'Preparing download...' : 'Download Timetable'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default Formats
