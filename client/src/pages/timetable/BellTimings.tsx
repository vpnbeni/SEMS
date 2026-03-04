import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import toast from 'react-hot-toast'
import { useAcademicSession } from '@/contexts/AcademicSessionContext'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/* ──────────────────────────── Types ──────────────────────────── */

type PeriodType = 'period' | 'break'

/** Stored row — only label, type, and duration. "from"/"to" are derived. */
interface BellRow {
  id: string
  type: PeriodType
  label: string       // e.g. "1st", "LUNCH", "RECREATION"
  duration: number    // minutes
}

/** Derived row with computed from / to for display & PDF */
interface ComputedRow extends BellRow {
  from: string   // "HH:MM" 24-h
  to: string     // "HH:MM" 24-h
}

interface BellMeta {
  schoolName: string
  title: string
  session: string
  effectiveDate: string   // "YYYY-MM-DD"
}

/* ──────────────────────────── Helpers ──────────────────────────── */

let _uid = 0
const uid = () => `bt-${++_uid}-${Date.now()}`

/** "HH:MM" → total minutes since midnight */
const toMins = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Total minutes → "HH:MM" */
const fromMins = (total: number): string => {
  const clamped = ((total % 1440) + 1440) % 1440 // wrap within 24h
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/** Format minutes → "X Minutes" */
const fmtDuration = (mins: number): string => {
  if (mins <= 0) return '-'
  return `${mins} Minutes`
}

/** "HH:MM" → "hh:MM AM/PM" with zero-padded hour */
const to12h = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Ordinal label for a period number */
const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/** Format "YYYY-MM-DD" → "dd.MM.yyyy (DayName)" */
const formatEffectiveDate = (iso: string): string => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
  return `${dd}.${mm}.${yyyy} (${dayName})`
}

/* ──────────────────────────── Default data ──────────────────────────── */

const defaultMeta: BellMeta = {
  schoolName: '',
  title: 'SUMMER BELL TIMINGS',
  session: '',
  effectiveDate: '',
}

const defaultStartTime = '08:00'

const defaultRows: BellRow[] = [
  { id: uid(), type: 'break',  label: 'RECREATION', duration: 45 },
  { id: uid(), type: 'period', label: '1st',        duration: 40 },
  { id: uid(), type: 'period', label: '2nd',        duration: 40 },
  { id: uid(), type: 'period', label: '3rd',        duration: 40 },
  { id: uid(), type: 'break',  label: 'LUNCH',      duration: 15 },
  { id: uid(), type: 'period', label: '4th',        duration: 40 },
  { id: uid(), type: 'period', label: '5th',        duration: 40 },
  { id: uid(), type: 'period', label: '6th',        duration: 40 },
  { id: uid(), type: 'period', label: '7th',        duration: 40 },
]

/* ──────────────────────────── PDF Generation ──────────────────────────── */

/** Generate PDF and return as Blob (does NOT auto-download) */
const generatePDFBlob = async (meta: BellMeta, computed: ComputedRow[]): Promise<Blob> => {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()   // 210
  const pageH = doc.internal.pageSize.getHeight()   // 297

  const marginX = 30
  const tableW = pageW - marginX * 2  // 150mm

  let y = 30

  /* ── Header Section ── */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(meta.schoolName || 'SCHOOL NAME', pageW / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(12)
  doc.text(meta.title || 'BELL TIMINGS', pageW / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Session (${meta.session || '____-____'})`, pageW / 2, y, { align: 'center' })
  y += 10

  /* ── Effective date row ── */
  if (meta.effectiveDate) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const dateStr = `w.e.f. ${formatEffectiveDate(meta.effectiveDate)}`
    const dateTextW = doc.getTextWidth(dateStr) + 8
    const dateBoxX = (pageW - dateTextW) / 2
    doc.setLineWidth(0.3)
    doc.rect(dateBoxX, y - 4, dateTextW, 7)
    doc.text(dateStr, pageW / 2, y, { align: 'center' })
    y += 12
  } else {
    y += 4
  }

  /* ── Table ── */
  const colRatios = [0.22, 0.26, 0.26, 0.26]
  const colWidths = colRatios.map(r => r * tableW)
  const colX = [marginX]
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1])
  }

  const rowH = 10
  const headerLabels = ['PERIOD', 'FROM', 'TO', 'DURATION']

  const drawCell = (x: number, w: number, h: number, text: string, bold = false, fontSize = 10) => {
    doc.setLineWidth(0.3)
    doc.rect(x, y, w, h)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(fontSize)
    doc.text(text, x + w / 2, y + h / 2 + 1, { align: 'center' })
  }

  // Header row
  for (let c = 0; c < 4; c++) {
    drawCell(colX[c], colWidths[c], rowH, headerLabels[c], true, 11)
  }
  y += rowH

  // Data rows
  for (const row of computed) {
    const isBold = row.type === 'break'
    drawCell(colX[0], colWidths[0], rowH, row.label, isBold, 10)
    drawCell(colX[1], colWidths[1], rowH, to12h(row.from), isBold, 10)
    drawCell(colX[2], colWidths[2], rowH, to12h(row.to), isBold, 10)
    drawCell(colX[3], colWidths[3], rowH, fmtDuration(row.duration), isBold, 10)
    y += rowH
  }

  /* ── Signature Section ── */
  const sigY = Math.max(y + 30, pageH - 50)

  doc.setLineWidth(0.3)

  const sigLeftX = marginX + 10
  doc.line(sigLeftX, sigY, sigLeftX + 40, sigY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('INCHARGE', sigLeftX + 20, sigY + 6, { align: 'center' })

  const sigRightX = pageW - marginX - 50
  doc.line(sigRightX, sigY, sigRightX + 40, sigY)
  doc.text('PRINCIPAL', sigRightX + 20, sigY + 6, { align: 'center' })

  /* ── Return as Blob ── */
  return doc.output('blob')
}

/* ──────────────────────────── Component ──────────────────────────── */

const BellTimings: React.FC = () => {
  const { currentSession } = useAcademicSession()
  const [meta, setMeta] = useState<BellMeta>(defaultMeta)
  const [rows, setRows] = useState<BellRow[]>(defaultRows)
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [isGenerating, setIsGenerating] = useState(false)

  /* ── PDF preview dialog state ── */
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewPageCount, setPreviewPageCount] = useState(0)
  const [previewRenderError, setPreviewRenderError] = useState<string | null>(null)

  /* ── Sync session from global academic session selector ── */
  useEffect(() => {
    if (currentSession) {
      setMeta(p => ({ ...p, session: currentSession }))
    }
  }, [currentSession])

  /* ── Cleanup blob URL on unmount ── */
  useEffect(() => {
    return () => {
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl)
    }
  }, [previewPdfUrl])

  /* ── Compute from / to for every row from startTime + durations ── */
  const computedRows: ComputedRow[] = useMemo(() => {
    let cursor = toMins(startTime)
    return rows.map(row => {
      const from = fromMins(cursor)
      const to = fromMins(cursor + row.duration)
      cursor += row.duration
      return { ...row, from, to }
    })
  }, [rows, startTime])

  /* ── Row CRUD ── */
  const updateRow = useCallback((id: string, patch: Partial<BellRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [])

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }, [])

  const addPeriod = useCallback(() => {
    const periodCount = rows.filter(r => r.type === 'period').length
    setRows(prev => [...prev, {
      id: uid(),
      type: 'period',
      label: ordinal(periodCount + 1),
      duration: 40,
    }])
  }, [rows])

  const addBreak = useCallback(() => {
    setRows(prev => [...prev, {
      id: uid(),
      type: 'break',
      label: 'BREAK',
      duration: 15,
    }])
  }, [])

  const moveRow = useCallback((id: string, direction: -1 | 1) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id)
      if (idx < 0) return prev
      const target = idx + direction
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
      return copy
    })
  }, [])

  /* ── Duration change handler ── */
  const handleDurationChange = useCallback((id: string, value: string) => {
    const num = parseInt(value, 10)
    if (value === '' || isNaN(num)) {
      // Allow empty field while typing, treat as 0
      setRows(prev => prev.map(r => r.id === id ? { ...r, duration: 0 } : r))
      return
    }
    if (num < 0 || num > 480) return // cap at 8 hours
    setRows(prev => prev.map(r => r.id === id ? { ...r, duration: num } : r))
  }, [])

  /* ── PDF preview: generate blob and open dialog ── */
  const handleDownload = async () => {
    if (rows.length === 0) {
      toast.error('Add at least one period before downloading.')
      return
    }
    setIsGenerating(true)
    try {
      const blob = await generatePDFBlob(meta, computedRows)
      const blobUrl = URL.createObjectURL(blob)
      setPreviewPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return blobUrl
      })
      setPreviewFilename(`bell-timings-${meta.session || 'schedule'}.pdf`)
      setPreviewPageCount(0)
      setPreviewRenderError(null)
      setShowPreviewDialog(true)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  const closePreviewDialog = () => {
    setShowPreviewDialog(false)
    setPreviewPageCount(0)
    setPreviewRenderError(null)
    setPreviewFilename('')
    setPreviewPdfUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const totalMinutes = rows.reduce((sum, r) => sum + r.duration, 0)

  /* ── Render ── */
  return (
    <div className="px-8 pb-8 pt-3 max-w-[1600px] mx-auto">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Configure school bell timings, period durations, and break schedules
        </p>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="btn btn-primary gap-2"
        >
          {isGenerating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* ── Meta fields card ── */}
      <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5">School Name</label>
            <input
              type="text"
              value={meta.schoolName}
              onChange={e => setMeta(p => ({ ...p, schoolName: e.target.value }))}
              placeholder="e.g. Delhi Public School, Jind Road, Rohtak"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5">Title</label>
            <input
              type="text"
              value={meta.title}
              onChange={e => setMeta(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. SUMMER BELL TIMINGS 3.0"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5">Session</label>
            <div className="relative">
              <input
                type="text"
                value={meta.session}
                readOnly
                tabIndex={-1}
                className="input bg-secondary-50 dark:bg-secondary-800/50 cursor-default pr-8"
              />
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="text-[10px] text-secondary-400 dark:text-secondary-500 mt-0.5">Linked to active session</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5">Effective Date (w.e.f.)</label>
            <input
              type="date"
              value={meta.effectiveDate}
              onChange={e => setMeta(p => ({ ...p, effectiveDate: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1.5">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* ── Bell timings table ── */}
      <div className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_0.6fr_150px_150px_130px_80px] gap-0 bg-secondary-50 dark:bg-secondary-800/60 border-b border-secondary-200 dark:border-secondary-700 px-4 py-3 text-xs font-semibold text-secondary-600 dark:text-secondary-300 uppercase tracking-wide">
          <span>Period</span>
          <span>Type</span>
          <span>From</span>
          <span>To</span>
          <span>Duration</span>
          <span className="text-center">Actions</span>
        </div>

        {/* Table rows */}
        <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
          {computedRows.map((row, idx) => (
            <div
              key={row.id}
              className={`grid grid-cols-[1fr_0.6fr_150px_150px_130px_80px] gap-0 items-center px-4 py-2.5 transition-colors ${
                row.type === 'break'
                  ? 'bg-amber-50/60 dark:bg-amber-900/10'
                  : 'hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30'
              }`}
            >
              {/* Label */}
              <div>
                <input
                  type="text"
                  value={row.label}
                  onChange={e => updateRow(row.id, { label: e.target.value })}
                  className={`w-full max-w-[160px] px-2.5 py-1.5 text-sm rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                    row.type === 'break' ? 'font-semibold' : ''
                  }`}
                />
              </div>

              {/* Type toggle */}
              <div>
                <button
                  onClick={() => updateRow(row.id, { type: row.type === 'period' ? 'break' : 'period' })}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    row.type === 'break'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                      : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                  }`}
                >
                  {row.type === 'break' ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  {row.type === 'break' ? 'Break' : 'Period'}
                </button>
              </div>

              {/* From (read-only, auto-computed) */}
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg border border-secondary-100 dark:border-secondary-700/50 bg-secondary-50 dark:bg-secondary-800/50 text-secondary-700 dark:text-secondary-300">
                  {to12h(row.from)}
                  <svg className="w-3.5 h-3.5 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>

              {/* To (read-only, auto-computed) */}
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg border border-secondary-100 dark:border-secondary-700/50 bg-secondary-50 dark:bg-secondary-800/50 text-secondary-700 dark:text-secondary-300">
                  {to12h(row.to)}
                  <svg className="w-3.5 h-3.5 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>

              {/* Duration (editable) */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={row.duration || ''}
                  onChange={e => handleDurationChange(row.id, e.target.value)}
                  className={`w-16 px-2.5 py-1.5 text-sm rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-center ${
                    row.type === 'break' ? 'font-semibold' : ''
                  }`}
                />
                <span className="text-xs text-secondary-400 dark:text-secondary-500">Min</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => moveRow(row.id, -1)}
                  disabled={idx === 0}
                  className="p-1 rounded-md text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move up"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveRow(row.id, 1)}
                  disabled={idx === computedRows.length - 1}
                  className="p-1 rounded-md text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move down"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => removeRow(row.id)}
                  className="p-1 rounded-md text-secondary-400 hover:text-error-500 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-secondary-400 dark:text-secondary-500">
              No periods added yet. Use the buttons below to add periods and breaks.
            </div>
          )}
        </div>

        {/* Add row buttons */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-800/30">
          <button onClick={addPeriod} className="btn btn-secondary gap-1.5 text-xs py-1.5 px-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Period
          </button>
          <button onClick={addBreak} className="btn btn-secondary gap-1.5 text-xs py-1.5 px-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Break
          </button>

          {/* Summary */}
          {rows.length > 0 && (
            <div className="ml-auto flex items-center gap-4 text-xs text-secondary-500 dark:text-secondary-400">
              <span>{rows.filter(r => r.type === 'period').length} periods</span>
              <span>{rows.filter(r => r.type === 'break').length} breaks</span>
              <span>Total: {fmtDuration(totalMinutes)}</span>
              {computedRows.length > 0 && (
                <span className="text-secondary-400 dark:text-secondary-500">
                  {to12h(computedRows[0].from)} — {to12h(computedRows[computedRows.length - 1].to)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PDF Preview Dialog (opens on Download PDF click) ── */}
      {showPreviewDialog && previewPdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl h-[88vh] bg-white dark:bg-secondary-900 rounded-xl shadow-xl overflow-hidden flex flex-col">

            {/* ── Header bar ── */}
            <div className="px-4 py-3 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">
                Bell Timings PDF Preview
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                  Open in New Tab
                </a>
                <a
                  href={previewPdfUrl}
                  download={previewFilename || 'bell-timings.pdf'}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"
                >
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={closePreviewDialog}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                  Close
                </button>
              </div>
            </div>

            {/* ── PDF rendering area ── */}
            <div className="w-full flex-1 overflow-auto bg-secondary-100 dark:bg-secondary-800 p-4">
              {previewRenderError ? (
                <div className="h-full w-full flex items-center justify-center p-6 text-center text-sm text-secondary-600 dark:text-secondary-300">
                  {previewRenderError}
                </div>
              ) : (
                <Document
                  file={previewPdfUrl}
                  loading={
                    <div className="h-full w-full flex items-center justify-center text-sm text-secondary-600 dark:text-secondary-300">
                      Loading PDF preview...
                    </div>
                  }
                  onLoadSuccess={({ numPages }) => {
                    setPreviewPageCount(numPages)
                    setPreviewRenderError(null)
                  }}
                  onLoadError={(error) => {
                    console.error('Failed to render bell timings preview:', error)
                    const message = (error as Error)?.message || 'Unknown PDF render error'
                    setPreviewRenderError(
                      `Failed to render preview (${message}). Use "Open in New Tab" or "Download PDF".`
                    )
                  }}
                  className="flex flex-col items-center gap-4"
                >
                  {Array.from({ length: previewPageCount }).map((_, index) => (
                    <Page
                      key={`bell-preview-page-${index + 1}`}
                      pageNumber={index + 1}
                      width={980}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ))}
                </Document>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BellTimings
