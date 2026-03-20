import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCentreDatesheetEntries, useGenerateSeatingPlanPDFMutation } from '../hooks/useSeatingPlan'

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatTime = (time: string) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

const getCalendarDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const Stickers: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const { data: entries = [], isLoading, error, refetch } = useCentreDatesheetEntries()
  const pdfMutation = useGenerateSeatingPlanPDFMutation({
    autoDownload: false,
    onSuccess: (blob, variables) => {
      const blobUrl = URL.createObjectURL(blob)
      setPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl)
        return blobUrl
      })
      setPreviewFilename(variables.filename || 'roll-no-stickers.pdf')
    },
  })
  const downloadingId = pdfMutation.isPending ? pdfMutation.variables?.datesheetId ?? null : null
  const searchTerm = searchParams.get('q') || ''

  const todayDateKey = useMemo(() => getCalendarDateKey(new Date()), [])
  const nextExamDateKey = useMemo(() => {
    const futureExamDateKeys = entries
      .map((entry) => getCalendarDateKey(entry.examDate))
      .filter((key) => key && key > todayDateKey)
      .sort()

    return futureExamDateKeys[0] || null
  }, [entries, todayDateKey])

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) return entries

    return entries.filter((entry) => {
      return (
        entry.subjectName.toLowerCase().includes(normalizedSearch) ||
        entry.subjectCode.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [entries, searchTerm])

  const handleDownload = (datesheetId: string, examDate: string, classValue: string, subjectName: string) => {
    const date = new Date(examDate)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const safeSubject = subjectName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim()
    const filename = `Roll No Stickers - ${day}-${month}-${year} - Class ${classValue} - ${safeSubject}.pdf`
    setPreviewSubject(subjectName)

    pdfMutation.mutate({
      datesheetId,
      format: 'mainGate',
      filename,
    })
  }

  const closePreview = () => {
    setPreviewSubject('')
    setPreviewFilename('')
    setPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return null
    })
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="px-8 pb-8 pt-3 max-w-[1600px] mx-auto min-h-screen">
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-slate-500">
            <svg className="mb-4 h-8 w-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Loading main gate seating plan table...</span>
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-lg font-semibold text-slate-900">Failed to load seating plan entries</h3>
            <p className="mt-2 text-sm text-slate-500">{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              {searchTerm.trim() ? 'No matching seating plan entries' : 'No seating plan entries found'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {searchTerm.trim()
                ? `No subject name or code matches "${searchTerm.trim()}".`
                : 'No main gate seating plan rows are available yet. Generate or refresh seating plan data first.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-auto min-w-max border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Sr No</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Day</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Subject Code</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Subject Name</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Class</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Candidates</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">No Of Rooms</th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center align-middle text-xs font-semibold uppercase tracking-wide text-slate-500">Download</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredEntries.map((entry, index) => {
                  const examDateKey = getCalendarDateKey(entry.examDate)
                  const isTodayExam = examDateKey === todayDateKey
                  const isNextExam = !isTodayExam && !!nextExamDateKey && examDateKey === nextExamDateKey

                  return (
                    <tr
                      key={entry._id}
                      className={
                        isTodayExam
                          ? 'bg-green-100 hover:bg-green-100'
                          : isNextExam
                            ? 'bg-yellow-100 hover:bg-yellow-100'
                            : `hover:bg-slate-50 ${entry.class === '10' ? 'bg-green-50/50' : entry.class === '12' ? 'bg-violet-50/50' : ''}`
                      }
                    >
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm text-slate-900">{index + 1}</td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm text-slate-900">
                        <div className="inline-flex items-center justify-center gap-2">
                          <span>{formatDate(entry.examDate)}</span>
                          {isTodayExam && (
                            <span className="inline-flex items-center rounded-full bg-green-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-900">
                              Today
                            </span>
                          )}
                          {isNextExam && (
                            <span className="inline-flex items-center rounded-full bg-yellow-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-900">
                              Next
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm text-slate-600">{entry.dayName || 'Unknown'}</td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm font-mono text-slate-900">{entry.subjectCode}</td>
                      <td className="border-b border-slate-100 px-2 py-2 text-center align-middle text-sm text-slate-900">{entry.subjectName}</td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            entry.class === '10'
                              ? 'bg-green-100 text-green-800'
                              : entry.class === '12'
                                ? 'bg-violet-100 text-violet-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Class {entry.class}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm text-slate-600">
                        {formatTime(entry.timeSlot.start)} - {formatTime(entry.timeSlot.end)}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm font-semibold text-blue-600">{entry.candidateCount}</td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm font-semibold text-violet-600">
                        {entry.roomsNeeded === 0 ? (
                          <span className="italic text-xs text-amber-600">Shared</span>
                        ) : (
                          entry.roomsNeeded
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 whitespace-nowrap text-center align-middle text-sm">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleDownload(entry._id, entry.examDate, entry.class, entry.subjectName)}
                            disabled={pdfMutation.isPending}
                            className={`text-blue-600 transition hover:text-blue-800 disabled:opacity-50 ${
                              pdfMutation.isPending && downloadingId !== entry._id ? 'cursor-not-allowed' : ''
                            }`}
                            title="Preview Roll No Stickers"
                          >
                            {downloadingId === entry._id ? (
                              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </button>
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

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/35">
          <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preview</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">Roll No Stickers</h2>
                <p className="mt-1 truncate text-sm text-slate-500">{previewSubject || previewFilename}</p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = previewUrl
                  link.download = previewFilename || 'roll-no-stickers.pdf'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open in New Tab
              </button>
            </div>

            <div className="flex-1 bg-slate-100 p-4">
              <iframe
                title="Roll No Stickers PDF Preview"
                src={previewUrl}
                className="h-full w-full rounded-2xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Stickers
