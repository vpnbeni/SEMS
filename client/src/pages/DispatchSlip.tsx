import React, { useMemo, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import toast from 'react-hot-toast'
import { useCentreDatesheet } from '../hooks/useDatesheets'
import { useCentreDetails } from '../hooks/useCentreDetails'
import { useGenerateDispatchSlipPdfMutation } from '../hooks/useDispatchSlip'
import { useAttendanceAbsentees } from '../hooks/useAttendance'
import { dispatchSlipService } from '../services/dispatchSlipService'
import Loader from '../components/common/Loader'
import './SeatingPlan.css'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type CentreDatesheetEntry = any

const formatExamDate = (value: any) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getDateKey = (value: any) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toISOString().slice(0, 10)
}

const formatDayName = (value: any) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

const normalizeClassBadge = (value: any): '10' | '12' | '' => {
  const raw = String(value || '').toLowerCase()
  if (raw.includes('10')) return '10'
  if (raw.includes('12')) return '12'
  return ''
}

const toAttendanceClass = (classBadge: '10' | '12' | ''): 'X' | 'XII' | '' => {
  if (classBadge === '10') return 'X'
  if (classBadge === '12') return 'XII'
  return ''
}

const formatTimeRange = (entry: any) => {
  const start = String(entry?.startTime || entry?.timeSlot?.start || '').trim()
  const end = String(entry?.endTime || entry?.timeSlot?.end || '').trim()
  if (!start && !end) return '—'
  if (start && end) return `${start} - ${end}`
  return start || end
}

const DispatchSlip: React.FC = () => {
  const { data: centreDetails, isLoading: centreLoading } = useCentreDetails()
  const { data: centreData, isLoading: datesheetLoading } = useCentreDatesheet({ limit: 200 })
  const { data: absenteeRecords = [], isLoading: absenteesLoading } = useAttendanceAbsentees()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [previewPages, setPreviewPages] = useState<number>(1)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const entries: CentreDatesheetEntry[] = useMemo(() => centreData?.entries ?? [], [centreData?.entries])

  const datesheetEntries = useMemo(() => {
    const sorted = [...entries]
    sorted.sort((a, b) => {
      const aTime = a?.examDate ? new Date(a.examDate).getTime() : Number.POSITIVE_INFINITY
      const bTime = b?.examDate ? new Date(b.examDate).getTime() : Number.POSITIVE_INFINITY
      if (aTime !== bTime) return aTime - bTime
      return String(a?.subject?.code || '').localeCompare(String(b?.subject?.code || ''))
    })
    return sorted
  }, [entries])

  const absentCountByKey = useMemo(() => {
    const map = new Map<string, number>()
    absenteeRecords.forEach((r: any) => {
      const dateKey = getDateKey(r?.examDate)
      const code = String(r?.subjectCode || '').trim()
      const cls = String(r?.class || '').trim().toUpperCase()
      if (!dateKey || dateKey === 'Unknown' || !code || !cls) return
      const key = `${dateKey}|${code}|${cls}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [absenteeRecords])

  const generatePdfMutation = useGenerateDispatchSlipPdfMutation({
    autoDownload: false,
  })

  const openPreviewForEntry = async (entry: CentreDatesheetEntry) => {
    const entryId = String(entry?._id || '').trim()
    if (!entryId) {
      toast.error('Missing entry id for this subject')
      return
    }

    setDownloadingId(entryId)
    const subjectCode = String(entry?.subject?.code || '').trim()
    const classValue = String(entry?.subject?.class || '').trim()
    const examDate = formatExamDate(entry?.examDate)
    const title = [subjectCode, classValue, examDate].filter(Boolean).join(' · ')

    setPreviewTitle(title || 'Dispatch Slip')
    setPreviewBlob(null)
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPreviewPages(1)
    setPreviewOpen(true)

    try {
      const blob = await generatePdfMutation.mutateAsync({
        entryId,
        destination: 'CBSE Regional Office',
        filename: `dispatch-slip_${getDateKey(entry?.examDate)}_${subjectCode}_${classValue}.pdf`,
      })
      setPreviewBlob(blob)
      const blobUrl = URL.createObjectURL(blob)
      setPreviewBlobUrl(blobUrl)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate dispatch slip PDF')
      setPreviewOpen(false)
    } finally {
      setDownloadingId(null)
    }
  }

  const getPreviewFilename = () => {
    const safeTitle = previewTitle ? previewTitle.replace(/[^\w\-]+/g, '_') : 'dispatch-slip'
    return `${safeTitle}.pdf`
  }

  const handleDownloadPreview = () => {
    if (!previewBlob) return
    dispatchSlipService.downloadPDF(previewBlob, getPreviewFilename())
  }

  const closePreview = () => {
    setPreviewOpen(false)
    setPreviewBlob(null)
    setPreviewPages(1)
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  if (centreLoading || datesheetLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page heading/subtitle is provided by the global header. */}

      {datesheetEntries.length === 0 && (
        <div className="glass p-8 rounded-xl border border-secondary-200 dark:border-secondary-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No centre datesheet entries found. Please generate centre datesheet from the Datesheets page first.
          </p>
        </div>
      )}

      {datesheetEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Examination Schedule
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Centre: {centreDetails?.centreNo || centreDetails?.centreSchoolCode || '—'} · {centreDetails?.centreName || '—'}
            </div>
          </div>

          <div className="overflow-x-auto sp-datesheet-scroll-container">
            <div className="seating-table-wrapper overflow-x-auto pb-4">
              <table className="sp-schedule-table min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Sr No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Day
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subject Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subject Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Candidates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Absent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {(() => {
                    const dateSerialByKey = new Map<string, number>()
                    let nextSerial = 1
                    return datesheetEntries.map((entry, index) => {
                      const dateKey = getDateKey(entry?.examDate)
                      if (!dateSerialByKey.has(dateKey)) {
                        dateSerialByKey.set(dateKey, nextSerial)
                        nextSerial += 1
                      }
                      const dateSerial = dateSerialByKey.get(dateKey) || 0
                    const classBadge = normalizeClassBadge(entry?.subject?.class)
                    const attendanceClass = toAttendanceClass(classBadge)
                    const subjectCode = String(entry?.subject?.code || '').trim()
                    const absentKey = `${dateKey}|${subjectCode}|${attendanceClass}`
                    const absentCount = attendanceClass && subjectCode
                      ? (absentCountByKey.get(absentKey) || 0)
                      : 0
                    const rowClass = classBadge === '10'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : classBadge === '12'
                        ? 'bg-purple-50 dark:bg-purple-900/20'
                        : ''

                    return (
                      <tr
                        key={String(entry?._id || index)}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${rowClass}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {dateSerial}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatExamDate(entry?.examDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {String(entry?.dayName || '').trim() || formatDayName(entry?.examDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                          {String(entry?.subject?.code || '').trim() || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {String(entry?.subject?.name || '').trim() || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${classBadge === '10'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : classBadge === '12'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                            {classBadge ? `Class ${classBadge}` : (String(entry?.subject?.class || '').trim() || 'Class')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatTimeRange(entry)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {Number(entry?.candidateCount ?? 0) || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400">
                          {absenteesLoading ? '—' : absentCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => openPreviewForEntry(entry)}
                              disabled={generatePdfMutation.isPending && downloadingId !== String(entry?._id || '')}
                              className={`text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 ${generatePdfMutation.isPending && downloadingId !== String(entry?._id || '') ? 'cursor-not-allowed' : ''}`}
                              title="Download dispatch slip"
                            >
                              {downloadingId === String(entry?._id || '') ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inline preview (like Seating Plan format preview) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dispatch Slip Preview
          </h3>
        </div>

        <div className="p-6">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            This is a sample template preview (actual values will change per subject/date when you download).
          </div>

          <div className="w-full overflow-auto bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-900 mx-auto max-w-[820px]">
              <div className="space-y-6">
                {['top', 'bottom'].map((position) => {
                  const centreNo = String(centreDetails?.centreNo || '').trim() || '829261'
                  const insuredAmount = String(centreDetails?.dispatchSlipInsuredAmount || '').trim() || '1000'
                  const toLines = String(centreDetails?.dispatchSlipToAddress || '').trim()
                    ? String(centreDetails?.dispatchSlipToAddress || '')
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean)
                    : [
                        'The RO GURUGRAM (CBSE)',
                        '1st & 2nd FLOOR',
                        'C-1 BUILDING, TOWER-A, INFOCITY – 1,',
                        'SECTOR – 34,',
                        'GURUGRAM, PIN: 122001',
                        'HARYANA',
                        'Tel:- 0124-2973658',
                      ]
                  const centreName = String(centreDetails?.centreName || '').trim() || 'INTERNATIONAL BHARTI SCHOOL'
                  const fromLines = String(centreDetails?.dispatchSlipFromAddress || '').trim()
                    ? String(centreDetails?.dispatchSlipFromAddress || '')
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean)
                    : [
                        centreName,
                        'SKM MILESTONE, GOHANA ROAD',
                        'ROHTAK, HARYANA, PIN – 124001',
                        'School Code: 40921',
                        'Mobile No: 9138891415, 16',
                      ]

                  return (
                    <React.Fragment key={position}>
                      <div className="border border-gray-800 dark:border-gray-300 px-8 py-6">
                        {/* Header */}
                        <div className="flex justify-center mb-6">
                          <div className="text-sm font-extrabold tracking-wide text-gray-900 dark:text-white">
                            CENTRE No. <span className="inline-block min-w-[90px] border-b border-black pb-0.5 align-bottom">{centreNo}</span>
                          </div>
                        </div>

                        {/* Top grid */}
                        <div className="grid grid-cols-2 gap-8 text-xs text-gray-900 dark:text-gray-100 mb-6">
                          <div className="space-y-3">
                            <div>
                              <span className="font-semibold">Class:</span>{' '}
                              <span className="inline-block min-w-[80px] border-b border-black pb-0.5" />
                            </div>
                            <div>
                              <span className="font-semibold">Subject. Name:</span>{' '}
                              <span className="inline-block min-w-[200px] border-b border-black pb-0.5" />
                            </div>
                            <div>
                              <span className="font-semibold">Subject code:</span>{' '}
                              <span className="inline-block min-w-[80px] border-b border-black pb-0.5" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <span className="font-semibold">Date:</span>{' '}
                              <span className="inline-block min-w-[90px] border-b border-black pb-0.5" />
                            </div>
                            <div>
                              <span className="font-semibold">Insured:</span> Rs {insuredAmount}
                            </div>
                            <div>
                              <span className="font-semibold">No. of Answer Sheet Packed:</span>{' '}
                              <span className="inline-block min-w-[80px] border-b border-black pb-0.5" />
                            </div>
                            <div>
                              <span className="font-semibold">Parcel No.</span>{' '}
                              <span className="inline-block min-w-[80px] border-b border-black pb-0.5" />
                            </div>
                            <div>
                              <span className="font-semibold">Time of Packing:</span>{' '}
                              <span className="inline-block min-w-[80px] border-b border-black pb-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Address grid */}
                        <div className="grid grid-cols-2 gap-10 text-xs text-gray-900 dark:text-gray-100">
                          <div>
                            <div className="font-semibold mb-1">To,</div>
                            <div className="font-semibold leading-snug whitespace-pre-wrap">
                              {toLines.join('\n')}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold mb-1">From,</div>
                            <div className="font-semibold leading-snug whitespace-pre-wrap">
                              {fromLines.join('\n')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {position === 'top' && (
                        <div className="w-full border-t border-dashed border-gray-500 my-2" />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closePreview} />

            <div className="inline-block align-bottom bg-white dark:bg-secondary-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dispatch Slip PDF</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{previewTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewBlobUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-secondary-300 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-800 disabled:opacity-50"
                      onClick={(e) => {
                        if (!previewBlobUrl) e.preventDefault()
                      }}
                    >
                      Open in New Tab
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadPreview}
                      disabled={!previewBlob}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={closePreview}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border border-secondary-300 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-800"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg p-3 overflow-auto max-h-[70vh]">
                  {!previewBlob ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader size="lg" />
                    </div>
                  ) : (
                    <Document
                      file={previewBlob}
                      onLoadSuccess={(doc) => setPreviewPages(doc.numPages)}
                      loading={<div className="flex items-center justify-center py-12"><Loader size="lg" /></div>}
                    >
                      {Array.from({ length: previewPages }).map((_, idx) => (
                        <div key={idx} className="flex justify-center py-3">
                          <Page pageNumber={idx + 1} width={900} />
                        </div>
                      ))}
                    </Document>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DispatchSlip
