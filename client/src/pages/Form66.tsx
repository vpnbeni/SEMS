import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, Download, Upload, RefreshCw, FileText, Calendar, Users, BookOpen } from 'lucide-react'
import { getTenantHeader, isLocalRuntime, resolveApiBaseUrl, resolveTenantSlug } from '../utils/tenantRuntime'

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
}

type ProcessingStep = 'idle' | 'uploading' | 'converting' | 'analyzing' | 'saving' | 'complete' | 'error'

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
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null)
  const [processedPdfUrl, setProcessedPdfUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const API_BASE_URL = resolveApiBaseUrl()
  const tenantHeader = getTenantHeader()
  const tenantSlug = resolveTenantSlug()

  const withTenantHeader = (options: RequestInit = {}): RequestInit => ({
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(tenantHeader ? { 'x-tenant-slug': tenantHeader } : {}),
    },
  })

  const buildLocalTenantQuery = () => {
    if (!isLocalRuntime() || !tenantSlug) {
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

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true)
      const response = await fetch(`${API_BASE_URL}/form66/records`, withTenantHeader())
      const data = await response.json()
      setRecords(data)

      // Group records by date
      const grouped = groupRecordsByDate(data)
      setDateGroups(grouped)
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setLoadingRecords(false)
    }
  }

  const fetchFileUrls = async () => {
    try {
      // Fetch processed PDF URL
      const pdfResponse = await fetch(`${API_BASE_URL}/form66/processed-pdf`, withTenantHeader())
      if (pdfResponse.ok) {
        const pdfData = await pdfResponse.json()
        setProcessedPdfUrl(pdfData.url)
      }

      // Fetch original file URL
      const originalResponse = await fetch(`${API_BASE_URL}/form66/original-file`, withTenantHeader())
      if (originalResponse.ok) {
        const originalData = await originalResponse.json()
        setOriginalFileUrl(originalData.url)
      }
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

      const response = await fetch(`${API_BASE_URL}/form66/upload`, withTenantHeader({
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

        // Update file URLs
        if (data.originalFileUrl) setOriginalFileUrl(data.originalFileUrl)
        if (data.processedPdfUrl) setProcessedPdfUrl(data.processedPdfUrl)

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

      <input
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
            {processedPdfUrl && (
              <a
                href={processedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-green-600 shadow-sm text-sm font-medium rounded-lg text-green-600 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download PDF
              </a>
            )}
            {originalFileUrl && (
              <a
                href={originalFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Original TXT
              </a>
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
                              window.open(`${API_BASE_URL}/form66/dates/${dateGroup.date}/pdf${buildLocalTenantQuery()}`, '_blank')
                            }}
                            className="inline-flex items-center justify-center p-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/50 text-green-700 dark:text-green-400 rounded-lg transition-colors"
                            title="Download PDF"
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
                                          className={`cursor-pointer transition-colors ${
                                            isClass10
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
                                            <span className={`inline-flex items-center justify-center w-12 h-8 rounded-md text-xs font-bold ${
                                              isClass10
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
                                            }`}>
                                              {subject.code}
                                            </span>
                                          </td>
                                          <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                              <span className={`text-sm font-medium ${
                                                isClass10
                                                  ? 'text-emerald-800 dark:text-emerald-300'
                                                  : 'text-violet-800 dark:text-violet-300'
                                              }`}>
                                                {subject.name}
                                              </span>
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                isClass10
                                                  ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-300'
                                                  : 'bg-violet-200 text-violet-800 dark:bg-violet-800/50 dark:text-violet-300'
                                              }`}>
                                                {subjectClass}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-3 whitespace-nowrap text-right">
                                            <span className={`text-sm font-medium ${
                                              isClass10
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
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                              record.class === 'X' || record.class === '10th'
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
    </div>
  )
}

export default Form66
