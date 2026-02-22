import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ChevronRight, ChevronDown, Download, Upload, RefreshCw, FileText, Calendar, Users, BookOpen, Eye, X } from 'lucide-react'
import { getTenantHeader, resolveApiBaseUrl, resolveTenantSlug } from '../utils/tenantRuntime'
import { Dialog } from '@/components/common/Dialog'

interface Form66Record {
  _id: string
  rollNo: string
  examDate: string
  subjectCode: string
  subject: string
  class: string
  centreNo?: string
  centreName?: string
}

interface DateGroup {
  date: string
  subjects: SubjectGroup[]
  totalRecords: number
}

interface SubjectGroup {
  code: string
  name: string
  records: Form66Record[]
  count: number
}

interface UploadResponse {
  message: string
  count: number
  dateCount?: number
  dates?: string[]
  originalFileUrl?: string
  processedPdfUrl?: string
  uploadId?: string
  uploadedClasses?: string[]
}

type ProcessingStep = 'idle' | 'uploading' | 'converting' | 'analyzing' | 'saving' | 'complete' | 'error'
type FormClassKey = 'X' | 'XII'

const processingSteps: { step: ProcessingStep; label: string }[] = [
  { step: 'uploading', label: 'Uploading file to cloud...' },
  { step: 'converting', label: 'Converting to PDF...' },
  { step: 'analyzing', label: 'Analyzing and rearranging by date...' },
  { step: 'saving', label: 'Saving records to database...' },
  { step: 'complete', label: 'Processing complete!' }
]

const Form66: React.FC = () => {
  const [uploading, setUploading] = useState(false)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle')
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [records, setRecords] = useState<Form66Record[]>([])
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [originalFileUrls, setOriginalFileUrls] = useState<Record<FormClassKey, string | null>>({
    X: null,
    XII: null,
  })
  const [processedPdfUrls, setProcessedPdfUrls] = useState<Record<FormClassKey, string | null>>({
    X: null,
    XII: null,
  })
  const [downloadDialogClass, setDownloadDialogClass] = useState<FormClassKey | null>(null)
  const [previewTab, setPreviewTab] = useState<'pdf' | 'txt'>('pdf')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [pdfPreviewUrls, setPdfPreviewUrls] = useState<Record<FormClassKey, string | null>>({
    X: null,
    XII: null,
  })
  const [txtPreviewContent, setTxtPreviewContent] = useState<Record<FormClassKey, string | null>>({
    X: null,
    XII: null,
  })
  const pdfObjectUrlsRef = useRef<Record<FormClassKey, string | null>>({
    X: null,
    XII: null,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Form 66 by-date PDF preview (same pattern as Duties preview) */
  const [form66DatePreviewDate, setForm66DatePreviewDate] = useState<string | null>(null)
  const [form66DatePreviewUrl, setForm66DatePreviewUrl] = useState<string | null>(null)
  const [showForm66DatePreview, setShowForm66DatePreview] = useState(false)
  const [form66DatePreviewLoading, setForm66DatePreviewLoading] = useState(false)
  const [form66DatePreviewError, setForm66DatePreviewError] = useState<string | null>(null)
  const API_BASE_URL = resolveApiBaseUrl()
  const tenantHeader = getTenantHeader()
  const tenantSlug = resolveTenantSlug()

  const withAuthAndTenantHeaders = (options: RequestInit = {}): RequestInit => {
    const token = localStorage.getItem('token')
    return {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(tenantHeader ? { 'x-tenant-slug': tenantHeader } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  }

  const parseJsonSafely = async (response: Response) => {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  const buildLocalTenantQuery = () => {
    if (!tenantSlug) {
      return ''
    }

    return `?tenant=${encodeURIComponent(tenantSlug)}`
  }

  // Compute stats
  const stats = useMemo(() => {
    const class10Records = records.filter(r => r.class === 'X' || r.class === '10th')
    const class12Records = records.filter(r => r.class === 'XII' || r.class === '12th')
    return {
      totalRecords: records.length,
      totalDates: dateGroups.length,
      class10th: class10Records.length,
      class12th: class12Records.length,
    }
  }, [records, dateGroups])

  useEffect(() => {
    fetchRecords()
    fetchFileUrls()
  }, [])

  useEffect(() => {
    return () => {
      Object.values(pdfObjectUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [])

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true)
      const response = await fetch(`${API_BASE_URL}/form66/records`, withAuthAndTenantHeaders())
      const data = await parseJsonSafely(response)
      const normalizedRecords = Array.isArray(data) ? data : []

      setRecords(normalizedRecords)

      if (!response.ok) {
        const message =
          (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) ||
          (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message) ||
          `Failed to fetch records (${response.status})`
        throw new Error(message)
      }

      // Group records by date
      const grouped = groupRecordsByDate(normalizedRecords)
      setDateGroups(grouped)
    } catch (error) {
      console.error('Failed to fetch records:', error)
      setRecords([])
      setDateGroups([])
    } finally {
      setLoadingRecords(false)
    }
  }

  const fetchFileUrls = async () => {
    try {
      const classConfigs: { key: FormClassKey; query: string }[] = [
        { key: 'X', query: '10th' },
        { key: 'XII', query: '12th' },
      ]

      const nextProcessedUrls: Record<FormClassKey, string | null> = { X: null, XII: null }
      const nextOriginalUrls: Record<FormClassKey, string | null> = { X: null, XII: null }

      await Promise.all(classConfigs.map(async ({ key, query }) => {
        const pdfResponse = await fetch(`${API_BASE_URL}/form66/processed-pdf?class=${query}`, withAuthAndTenantHeaders())
        if (pdfResponse.ok) {
          const pdfData = await parseJsonSafely(pdfResponse)
          nextProcessedUrls[key] = pdfData?.url || null
        }

        const originalResponse = await fetch(`${API_BASE_URL}/form66/original-file?class=${query}`, withAuthAndTenantHeaders())
        if (originalResponse.ok) {
          const originalData = await parseJsonSafely(originalResponse)
          nextOriginalUrls[key] = originalData?.url || null
        }
      }))

      setProcessedPdfUrls(nextProcessedUrls)
      setOriginalFileUrls(nextOriginalUrls)
    } catch (error) {
      console.error('Failed to fetch file URLs:', error)
    }
  }

  const groupRecordsByDate = (records: Form66Record[]): DateGroup[] => {
    if (!records || records.length === 0) {
      return []
    }

    const dateMap = new Map<string, Map<string, Form66Record[]>>()

    records.forEach(record => {
      // Skip records without examDate
      if (!record.examDate) return

      if (!dateMap.has(record.examDate)) {
        dateMap.set(record.examDate, new Map())
      }

      const subjectMap = dateMap.get(record.examDate)!
      const subjectKey = `${record.subjectCode || 'Unknown'}-${record.subject || 'Unknown'}`

      if (!subjectMap.has(subjectKey)) {
        subjectMap.set(subjectKey, [])
      }

      subjectMap.get(subjectKey)!.push(record)
    })

    const groups: DateGroup[] = []

    dateMap.forEach((subjectMap, date) => {
      const subjects: SubjectGroup[] = []
      let totalRecords = 0

      subjectMap.forEach((records, subjectKey) => {
        const [code, ...nameParts] = subjectKey.split('-')
        const name = nameParts.join('-')

        subjects.push({
          code,
          name,
          records: records.sort((a, b) => a.rollNo.localeCompare(b.rollNo)),
          count: records.length
        })

        totalRecords += records.length
      })

      groups.push({
        date,
        subjects: subjects.sort((a, b) => a.code.localeCompare(b.code)),
        totalRecords
      })
    })

    // Sort by date
    return groups.sort((a, b) => {
      if (!a.date || !b.date) return 0
      const dateA = a.date.split('.').reverse().join('')
      const dateB = b.date.split('.').reverse().join('')
      return dateA.localeCompare(dateB)
    })
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const simulateProcessingSteps = async () => {
    // Simulate step progression for better UX
    const steps: ProcessingStep[] = ['uploading', 'converting', 'analyzing', 'saving']
    for (const step of steps) {
      setProcessingStep(step)
      await new Promise(resolve => setTimeout(resolve, 800))
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type - only TXT files now
    const isTxtFile = file.name.toLowerCase().endsWith('.txt') ||
      file.type === 'text/plain'

    if (!isTxtFile) {
      setUploadStatus({ type: 'error', message: `Please select a .txt file. Selected: ${file.name}` })
      return
    }

    try {
      setUploading(true)
      setUploadStatus(null)
      setProcessingStep('uploading')

      const formData = new FormData()
      formData.append('file', file)

      // Start simulating steps in parallel with actual upload
      const stepPromise = simulateProcessingSteps()

      const response = await fetch(`${API_BASE_URL}/form66/upload`, withAuthAndTenantHeaders({
        method: 'POST',
        body: formData
      }))

      // Wait for step simulation to finish
      await stepPromise

      const data: UploadResponse = await response.json()

      if (response.ok) {
        setProcessingStep('complete')
        setUploadStatus({
          type: 'success',
          message: `Successfully uploaded! Processed ${data.count || 0} records across ${data.dateCount || 0} exam dates.`
        })

        await fetchFileUrls()
        fetchRecords() // Refresh the records table
      } else {
        setProcessingStep('error')
        setUploadStatus({
          type: 'error',
          message: data.message || 'Upload failed'
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setProcessingStep('error')
      setUploadStatus({
        type: 'error',
        message: 'Failed to upload file. Please try again.'
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Reset processing step after a delay
      setTimeout(() => setProcessingStep('idle'), 3000)
    }
  }

  const getCurrentStepIndex = () => {
    return processingSteps.findIndex(s => s.step === processingStep)
  }

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
        // Also collapse all subjects under this date
        setExpandedSubjects(prevSubjects => {
          const nextSubjects = new Set(prevSubjects)
          dateGroups.find(d => d.date === date)?.subjects.forEach(s => {
            nextSubjects.delete(`${date}-${s.code}`)
          })
          return nextSubjects
        })
      } else {
        next.add(date)
      }
      return next
    })
  }

  const toggleSubjectExpansion = (subjectKey: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev)
      if (next.has(subjectKey)) {
        next.delete(subjectKey)
      } else {
        next.add(subjectKey)
      }
      return next
    })
  }

  const expandAllDates = () => {
    setExpandedDates(new Set(dateGroups.map(d => d.date)))
  }

  const collapseAllDates = () => {
    setExpandedDates(new Set())
    setExpandedSubjects(new Set())
  }

  const closeForm66DatePreview = useCallback(() => {
    setShowForm66DatePreview(false)
    setForm66DatePreviewDate(null)
    setForm66DatePreviewError(null)
    setForm66DatePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  useEffect(() => {
    return () => {
      if (form66DatePreviewUrl) URL.revokeObjectURL(form66DatePreviewUrl)
    }
  }, [form66DatePreviewUrl])

  const openForm66DatePreview = async (date: string) => {
    setForm66DatePreviewDate(date)
    setForm66DatePreviewError(null)
    setForm66DatePreviewLoading(true)
    setShowForm66DatePreview(true)
    setForm66DatePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    try {
      const response = await fetch(`${API_BASE_URL}/form66/dates/${date}/pdf${buildLocalTenantQuery()}`, withAuthAndTenantHeaders())
      if (!response.ok) {
        const data = await parseJsonSafely(response)
        const message =
          (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message) ||
          `Failed to load PDF (${response.status})`
        throw new Error(message)
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      setForm66DatePreviewUrl(objectUrl)
    } catch (error: any) {
      console.error('Failed to load Form 66 PDF preview:', error)
      setForm66DatePreviewError(error?.message || 'Failed to load Form 66 PDF')
      setUploadStatus({ type: 'error', message: error?.message || 'Failed to load Form 66 PDF' })
    } finally {
      setForm66DatePreviewLoading(false)
    }
  }

  const form66DatePdfDownloadFilename = form66DatePreviewDate
    ? `Form66_${form66DatePreviewDate.replace(/\./g, '-')}.pdf`
    : 'Form66.pdf'

  const openDownloadDialog = (classKey: FormClassKey) => {
    const hasPdf = Boolean(processedPdfUrls[classKey])
    const hasTxt = Boolean(originalFileUrls[classKey])

    if (hasPdf) {
      setPreviewTab('pdf')
    } else if (hasTxt) {
      setPreviewTab('txt')
    }

    setPreviewError(null)
    setDownloadDialogClass(classKey)
  }

  const closeDownloadDialog = () => {
    setDownloadDialogClass(null)
    setPreviewTab('pdf')
    setPreviewError(null)
    setPreviewLoading(false)
  }

  useEffect(() => {
    const classKey = downloadDialogClass
    if (!classKey) return

    let isCancelled = false

    const loadPreview = async () => {
      setPreviewError(null)

      if (previewTab === 'pdf') {
        const sourceUrl = processedPdfUrls[classKey]
        if (!sourceUrl) {
          setPreviewError('No PDF available for preview.')
          return
        }

        if (pdfPreviewUrls[classKey]) return

        try {
          setPreviewLoading(true)
          const response = await fetch(sourceUrl)
          if (!response.ok) {
            throw new Error(`Unable to load PDF preview (${response.status})`)
          }

          const rawBlob = await response.blob()
          const pdfBlob = rawBlob.type === 'application/pdf'
            ? rawBlob
            : new Blob([rawBlob], { type: 'application/pdf' })
          const objectUrl = URL.createObjectURL(pdfBlob)

          if (isCancelled) {
            URL.revokeObjectURL(objectUrl)
            return
          }

          const previousObjectUrl = pdfObjectUrlsRef.current[classKey]
          if (previousObjectUrl) {
            URL.revokeObjectURL(previousObjectUrl)
          }

          pdfObjectUrlsRef.current[classKey] = objectUrl
          setPdfPreviewUrls((prev) => ({ ...prev, [classKey]: objectUrl }))
        } catch (error) {
          if (!isCancelled) {
            console.error('Failed to load PDF preview:', error)
            setPreviewError('Failed to load PDF preview.')
          }
        } finally {
          if (!isCancelled) {
            setPreviewLoading(false)
          }
        }
      } else {
        const sourceUrl = originalFileUrls[classKey]
        if (!sourceUrl) {
          setPreviewError('No TXT file available for preview.')
          return
        }

        if (txtPreviewContent[classKey]) return

        try {
          setPreviewLoading(true)
          const response = await fetch(sourceUrl)
          if (!response.ok) {
            throw new Error(`Unable to load TXT preview (${response.status})`)
          }

          const content = await response.text()
          if (!isCancelled) {
            setTxtPreviewContent((prev) => ({ ...prev, [classKey]: content }))
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('Failed to load TXT preview:', error)
            setPreviewError('Failed to load TXT preview.')
          }
        } finally {
          if (!isCancelled) {
            setPreviewLoading(false)
          }
        }
      }
    }

    loadPreview()

    return () => {
      isCancelled = true
    }
  }, [downloadDialogClass, previewTab, processedPdfUrls, originalFileUrls, pdfPreviewUrls, txtPreviewContent])

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Candidates</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalRecords}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Exam Dates</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalDates}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-green-50 text-green-500 dark:bg-green-900/20 dark:text-green-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class X</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.class10th}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-purple-50 text-purple-500 dark:bg-purple-900/20 dark:text-purple-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class XII</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.class12th}</p>
            </div>
          </div>
        </div>
      </div>

      <label htmlFor="form66-file-upload" className="sr-only">
        Upload Form 66 text file
      </label>
      <input
        id="form66-file-upload"
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Processing Steps */}
      {processingStep !== 'idle' && processingStep !== 'error' && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Processing Status
          </h3>
          <div className="space-y-3">
            {processingSteps.map((step, index) => {
              const currentIndex = getCurrentStepIndex()
              const isComplete = index < currentIndex || processingStep === 'complete'
              const isCurrent = index === currentIndex && processingStep !== 'complete'

              return (
                <div key={step.step} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isComplete
                    ? 'bg-green-500'
                    : isCurrent
                      ? 'bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                    {isComplete ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isCurrent ? (
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="text-white text-xs">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${isComplete
                    ? 'text-green-600 dark:text-green-400'
                    : isCurrent
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-400 dark:text-gray-500'
                    }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`mb-6 rounded-lg p-4 ${uploadStatus.type === 'success'
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {uploadStatus.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${uploadStatus.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
                }`}>
                {uploadStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions - only when no data */}
      {!loadingRecords && records.length === 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Instructions
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Upload Form 66 TXT File</strong></p>
            <p>1. Click the "Upload Form 66" button above</p>
            <p>2. Select your Form 66 TXT file from your computer</p>
            <p>3. The system will:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Upload to secure cloud storage</li>
              <li>Convert to PDF format</li>
              <li>Rearrange pages by exam date (matching datesheet)</li>
            </ul>
            <p>4. View and download the rearranged Form 66</p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              What is Form 66?
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Form 66 contains the official list of roll numbers for each exam. This data is used to generate accurate seating plans. The system automatically rearranges Form 66 pages in chronological order by exam date.
            </p>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Ribbon: Title + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Form 66 Records
            </h3>
            {dateGroups.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAllDates}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Expand All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={collapseAllDates}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={fetchRecords}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </button>
            {(processedPdfUrls.X || originalFileUrls.X) && (
              <button
                onClick={() => openDownloadDialog('X')}
                className="group relative inline-flex items-center px-3 py-1.5 border border-green-600 shadow-sm text-sm font-medium rounded-lg text-green-600 bg-white dark:bg-gray-800 hover:bg-green-600 hover:text-white dark:hover:bg-green-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                10th
              </button>
            )}
            {(processedPdfUrls.XII || originalFileUrls.XII) && (
              <button
                onClick={() => openDownloadDialog('XII')}
                className="group relative inline-flex items-center px-3 py-1.5 border border-green-600 shadow-sm text-sm font-medium rounded-lg text-green-600 bg-white dark:bg-gray-800 hover:bg-green-600 hover:text-white dark:hover:bg-green-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                12th
              </button>
            )}
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload Form 66
                </>
              )}
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loadingRecords ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Loading records...</span>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto h-24 w-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Form 66 Records</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
              No Form 66 records found. Import data using the upload button above.
            </p>
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Upload className="w-5 h-5 mr-2 -ml-1" />
              Upload Form 66
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    {/* Expand icon column */}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                    Sr No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Exam Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subjects
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Candidates
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {dateGroups.map((dateGroup, dateIndex) => {
                  const isDateExpanded = expandedDates.has(dateGroup.date)

                  return (
                    <React.Fragment key={dateGroup.date}>
                      {/* Date Row */}
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        onClick={() => toggleDateExpansion(dateGroup.date)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
                            {isDateExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                          {String(dateIndex + 1).padStart(2, '0')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                              <div className="text-center">
                                <div className="text-white font-bold text-sm leading-none">
                                  {dateGroup.date?.split('.')[0] || ''}
                                </div>
                                <div className="text-white text-[10px] opacity-90 leading-none mt-0.5">
                                  {dateGroup.date?.split('.')[1] || ''}
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {dateGroup.date}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {dateGroup.subjects.length} subject{dateGroup.subjects.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            {dateGroup.totalRecords}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openForm66DatePreview(dateGroup.date)
                            }}
                            disabled={form66DatePreviewLoading}
                            className="inline-flex items-center justify-center p-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/50 text-green-700 dark:text-green-400 rounded-lg transition-colors disabled:opacity-60"
                            title="Preview and download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Subjects Table */}
                      {isDateExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-700">
                              <table className="min-w-full">
                                <thead className="bg-gray-100/50 dark:bg-gray-800/50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12 pl-16">
                                      {/* Expand icon */}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                      Subject Code
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                      Subject Name
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                      Candidates
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {dateGroup.subjects.map((subject) => {
                                    const subjectKey = `${dateGroup.date}-${subject.code}`
                                    const isSubjectExpanded = expandedSubjects.has(subjectKey)
                                    const subjectClass = subject.records[0]?.class
                                    const isClass10 = subjectClass === 'X' || subjectClass === '10th'

                                    return (
                                      <React.Fragment key={subjectKey}>
                                        {/* Subject Row */}
                                        <tr
                                          className={`cursor-pointer transition-colors ${isClass10
                                            ? 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                            : 'bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                                            }`}
                                          onClick={() => toggleSubjectExpansion(subjectKey)}
                                        >
                                          <td className="px-6 py-3 whitespace-nowrap pl-16">
                                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
                                              {isSubjectExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-gray-500" />
                                              ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                              )}
                                            </button>
                                          </td>
                                          <td className="px-6 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center justify-center w-12 h-8 rounded-md text-xs font-bold ${isClass10
                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                              : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
                                              }`}>
                                              {subject.code}
                                            </span>
                                          </td>
                                          <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                              <span className={`text-sm font-medium ${isClass10
                                                ? 'text-emerald-800 dark:text-emerald-300'
                                                : 'text-violet-800 dark:text-violet-300'
                                                }`}>
                                                {subject.name}
                                              </span>
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${isClass10
                                                ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-300'
                                                : 'bg-violet-200 text-violet-800 dark:bg-violet-800/50 dark:text-violet-300'
                                                }`}>
                                                {subjectClass}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-3 whitespace-nowrap text-right">
                                            <span className={`text-sm font-medium ${isClass10
                                              ? 'text-emerald-700 dark:text-emerald-400'
                                              : 'text-violet-700 dark:text-violet-400'
                                              }`}>
                                              {subject.count}
                                            </span>
                                          </td>
                                        </tr>

                                        {/* Expanded Roll Numbers */}
                                        {isSubjectExpanded && (
                                          <tr>
                                            <td colSpan={4} className="p-0">
                                              <div className="bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 pl-24 pr-6 py-3">
                                                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                                      <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-16">Sr</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Roll No</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">Class</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                                      {subject.records.map((record, recordIndex) => (
                                                        <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{recordIndex + 1}</td>
                                                          <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">{record.rollNo}</td>
                                                          <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${record.class === 'X' || record.class === '10th'
                                                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                                              }`}>
                                                              {record.class}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Download Preview Dialog */}
      <Dialog
        isOpen={downloadDialogClass !== null}
        onClose={closeDownloadDialog}
        size="full"
        className="transition-all duration-300 !h-[96vh] !max-h-[96vh]"
      >
        <Dialog.Header
          className="!px-6 !py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          showClose={false}
        >
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                Form 66 Files
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                Class {downloadDialogClass === 'X' ? '10th' : '12th'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
                {downloadDialogClass && (
                  <>
                    {processedPdfUrls[downloadDialogClass] && (
                      <button
                        onClick={() => setPreviewTab('pdf')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${previewTab === 'pdf'
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                          }`}
                      >
                        <FileText className={`w-3.5 h-3.5 ${previewTab === 'pdf' ? 'text-blue-500' : ''}`} />
                        <span>PDF</span>
                      </button>
                    )}
                    {originalFileUrls[downloadDialogClass] && (
                      <button
                        onClick={() => setPreviewTab('txt')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${previewTab === 'txt'
                          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                          }`}
                      >
                        <FileText className={`w-3.5 h-3.5 ${previewTab === 'txt' ? 'text-blue-500' : ''}`} />
                        <span>TXT</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                <span className={`w-1.5 h-1.5 rounded-full ${previewLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
                {previewLoading ? 'Loading...' : 'Preview Ready'}
              </div>

              <button
                type="button"
                onClick={closeDownloadDialog}
                className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Dialog.Header>

        <Dialog.Body className="!p-0 !flex-1 !min-h-0 flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">

          {/* Preview area - scrolls inside the body */}
          <div className="flex-1 min-h-0 p-6 overflow-hidden flex flex-col">
            <div className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-lg relative group">
              {previewLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 transition-all">
                  <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Generating preview...</p>
                </div>
              ) : previewError ? (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-red-500" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Preview Error</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{previewError}</p>
                </div>
              ) : downloadDialogClass && previewTab === 'pdf' && pdfPreviewUrls[downloadDialogClass] ? (
                <div className="h-full relative overflow-hidden">
                  <iframe
                    src={`${pdfPreviewUrls[downloadDialogClass]}#toolbar=0`}
                    className="w-full h-full border-0 absolute inset-0"
                    title="Form 66 PDF Preview"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/80 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur pointer-events-none">
                    PDF Viewer
                  </div>
                </div>
              ) : downloadDialogClass && previewTab === 'txt' && txtPreviewContent[downloadDialogClass] ? (
                <div className="h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 p-8">
                  <pre className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words font-mono bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-h-full">
                    {txtPreviewContent[downloadDialogClass]}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No Selection</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No file selected for preview</p>
                </div>
              )}
            </div>
          </div>
        </Dialog.Body>

        <Dialog.Footer className="!px-6 !py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex flex-col sm:flex-row gap-3 justify-end items-stretch sm:items-center w-full">
            <button
              onClick={closeDownloadDialog}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              Close
            </button>

            {downloadDialogClass && originalFileUrls[downloadDialogClass] && (
              <a
                href={originalFileUrls[downloadDialogClass]!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-semibold rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Original
              </a>
            )}

            {downloadDialogClass && processedPdfUrls[downloadDialogClass] && (
              <a
                href={processedPdfUrls[downloadDialogClass]!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-lg text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-95"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Form 66 PDF
              </a>
            )}
          </div>
        </Dialog.Footer>
      </Dialog>

      {/* Form 66 by-date PDF preview modal (same pattern as Duties) */}
      {showForm66DatePreview && (form66DatePreviewUrl || form66DatePreviewLoading || form66DatePreviewError) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl h-[88vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Form 66 PDF Preview
                {form66DatePreviewDate && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                    ({form66DatePreviewDate})
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2">
                {form66DatePreviewUrl && (
                  <>
                    <a
                      href={form66DatePreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Open in New Tab
                    </a>
                    <a
                      href={form66DatePreviewUrl}
                      download={form66DatePdfDownloadFilename}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Download PDF
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeForm66DatePreview}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="w-full flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
              {form66DatePreviewLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                  <p>Loading PDF preview...</p>
                </div>
              ) : form66DatePreviewError ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-600 dark:text-gray-300">
                  <FileText className="w-12 h-12 text-amber-500" />
                  <p>{form66DatePreviewError}</p>
                  <p className="text-xs">Use Close and try again, or check that the date has Form 66 data.</p>
                </div>
              ) : form66DatePreviewUrl ? (
                <iframe
                  src={`${form66DatePreviewUrl}#toolbar=0`}
                  className="w-full h-full min-h-[60vh] border-0 rounded-lg bg-white dark:bg-gray-900"
                  title="Form 66 PDF Preview"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Form66
