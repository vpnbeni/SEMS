import React, { useState, useEffect, useRef } from 'react'
import { Tabs } from '../components/common/Tabs'
import type { TabConfig } from '../components/common/Tabs'
import api from '../services/api'

interface Chapter {
  number: string
  title: string
  description?: string
  fullContent?: string
  formattedContent?: ContentBlock[]
  startPage?: number
}

interface ContentBlock {
  type: 'heading' | 'numbered' | 'bullet' | 'paragraph' | 'table'
  text?: string
  rows?: string[][]
}

interface Appendix {
  letter: string
  title: string
  subtitle?: string
  fullContent?: string
  formattedContent?: ContentBlock[]
  startPage?: number
}

interface Guideline {
  number: string
  text: string
}

interface SearchResult {
  text: string
  index: number
}

interface GuidelinesData {
  metadata: {
    pages: number
    totalCharacters: number
  }
  structure: {
    chapters: Chapter[]
    appendices: Appendix[]
    guidelines: Guideline[]
    headings: string[]
  }
  fullText: string
}

const CentreGuidelines: React.FC = () => {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null)
  const [guidelinesData, setGuidelinesData] = useState<GuidelinesData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'viewer' | 'chapters' | 'appendices' | 'search'>('chapters')
  const [expandedAppendix, setExpandedAppendix] = useState<string | null>(null)
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [pdfViewerLoading, setPdfViewerLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const pdfBlobUrlRef = useRef<string | null>(null)
  const previousUploadedPdfRef = useRef<string | null>(null)

  useEffect(() => {
    checkForExistingPdf()
  }, [])

  // Invalidate PDF viewer cache when the guidelines document changes (new upload)
  useEffect(() => {
    if (previousUploadedPdfRef.current !== null && previousUploadedPdfRef.current !== uploadedPdf) {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current)
        pdfBlobUrlRef.current = null
        setPdfViewerUrl(null)
      }
    }
    previousUploadedPdfRef.current = uploadedPdf
  }, [uploadedPdf])

  // Fetch PDF as blob only when on PDF Viewer tab and no cached URL (cache persists when switching tabs)
  useEffect(() => {
    if (activeTab !== 'viewer' || !uploadedPdf) return
    if (pdfViewerUrl) return // use cached blob URL, no refetch

    let cancelled = false
    setPdfViewerLoading(true)
    api.get('/guidelines/file', { responseType: 'blob' })
      .then((res) => res.data as Blob)
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        pdfBlobUrlRef.current = url
        setPdfViewerUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPdfViewerUrl(null)
      })
      .finally(() => {
        if (!cancelled) setPdfViewerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, uploadedPdf, pdfViewerUrl])

  // Unmount: revoke blob URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current)
        pdfBlobUrlRef.current = null
      }
    }
  }, [])

  const checkForExistingPdf = async () => {
    try {
      const response = await api.get('/guidelines/check')
      const data = response.data
      if (data.exists && data.path) {
        setUploadedPdf(data.path)
        await loadGuidelinesData()
      } else {
        setLoading(false)
      }
    } catch {
      // PDF doesn't exist yet or API error
      setLoading(false)
    }
  }

  const loadGuidelinesData = async () => {
    try {
      const response = await api.get('/guidelines/parse')
      setGuidelinesData(response.data?.data ?? null)
    } catch (error) {
      console.error('Error loading guidelines data:', error)
    } finally {
      setLoading(false)
    }
  }

  const setFileIfPdf = (file: File | null) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else if (file) {
      alert('Please select a PDF file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileIfPdf(e.target.files?.[0] ?? null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    setFileIfPdf(file ?? null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('pdf', selectedFile)

    try {
      const response = await api.post('/guidelines/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const data = response.data
      setUploadedPdf(data.path)
      setShowUploadModal(false)
      setSelectedFile(null)
      alert('Guidelines uploaded successfully!')
      setLoading(true)
      await loadGuidelinesData()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error uploading guidelines')
    } finally {
      setUploading(false)
    }
  }

  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      alert('Please enter at least 3 characters to search')
      return
    }

    setSearching(true)
    try {
      const response = await api.get('/guidelines/search', {
        params: { query: searchQuery }
      })
      const data = response.data
      setSearchResults(data.results)
      setActiveTab('search')
    } catch (error) {
      console.error('Search error:', error)
      alert('Error searching guidelines')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {(uploadedPdf || loading) && (
          <>
            {/* Stats cards at top - show immediately (skeleton when loading) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    {loading || !guidelinesData ? (
                      <div className="animate-pulse">
                        <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {guidelinesData.metadata.pages}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Pages</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    {loading || !guidelinesData ? (
                      <div className="animate-pulse">
                        <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {guidelinesData.structure.chapters.length}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">Chapters</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    {loading || !guidelinesData ? (
                      <div className="animate-pulse">
                        <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {guidelinesData.structure.appendices.length}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">Appendices</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    {loading || !guidelinesData ? (
                      <div className="animate-pulse">
                        <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {guidelinesData.structure.guidelines.length}+
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">Guidelines</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs - same style as Date Sheets (pill, ribbon) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                {guidelinesData ? (
                  <Tabs<'viewer' | 'chapters' | 'appendices' | 'search'>
                    tabs={[
                      {
                        id: 'chapters',
                        label: 'Chapters',
                        badge: String(guidelinesData.structure.chapters.length),
                        color: 'blue'
                      },
                      {
                        id: 'appendices',
                        label: 'Appendices',
                        badge: String(guidelinesData.structure.appendices.length),
                        color: 'emerald'
                      },
                      {
                        id: 'viewer',
                        label: 'PDF Viewer',
                        color: 'indigo'
                      },
                      ...(searchResults.length > 0
                        ? [{
                          id: 'search' as const,
                          label: 'Search Results',
                          badge: String(searchResults.length),
                          color: 'purple' as const
                        }]
                        : [])
                    ] as TabConfig<'viewer' | 'chapters' | 'appendices' | 'search'>[]}
                    activeTab={activeTab}
                    onChange={(tabId) => setActiveTab(tabId)}
                    variant="pill"
                    size="sm"
                    ariaLabel="Centre guidelines sections"
                  />
                ) : (
                  <div className="animate-pulse flex gap-2">
                    <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                )}
                <div className="flex gap-3 shrink-0 items-center">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search guidelines..."
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[180px]"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={searching || searchQuery.length < 3}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {searching ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Searching...
                        </>
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Upload Guidelines
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Loading state - spinner inside content area (no standalone loader) */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <svg className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400">
                        {!uploadedPdf ? 'Checking for existing guidelines...' : 'Loading guidelines data...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* PDF Viewer Tab */}
                {!loading && activeTab === 'viewer' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Centre Guidelines Document
                      </h3>
                      <a
                        href={uploadedPdf ?? undefined}
                        download
                        className="btn btn-secondary text-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                      </a>
                    </div>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900" style={{ height: '700px' }}>
                      {pdfViewerLoading && (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                            <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Loading PDF…</span>
                          </div>
                        </div>
                      )}
                      {!pdfViewerLoading && pdfViewerUrl && (
                        <iframe
                          src={pdfViewerUrl}
                          className="w-full h-full"
                          title="Centre Guidelines PDF"
                        />
                      )}
                      {!pdfViewerLoading && !pdfViewerUrl && (
                        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                          Unable to load PDF
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Chapters Tab */}
                {!loading && activeTab === 'chapters' && guidelinesData && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Chapters Index
                    </h3>
                    <div className="space-y-4">
                      {guidelinesData.structure.chapters.map((chapter, index) => {
                        const isExpanded = expandedChapter === chapter.number

                        return (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all"
                          >
                            <div
                              onClick={() => setExpandedChapter(isExpanded ? null : chapter.number)}
                              className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                                  <span className="text-white font-bold text-lg">
                                    {chapter.number}
                                  </span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                                        Chapter {chapter.number}
                                      </h4>
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {chapter.title}
                                      </p>
                                      {chapter.startPage && uploadedPdf && (
                                        <a
                                          href={`${uploadedPdf}#page=${chapter.startPage}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          View in PDF (Page {chapter.startPage})
                                        </a>
                                      )}
                                      {!isExpanded && chapter.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                          {chapter.description}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      className="ml-2 flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                      title={isExpanded ? 'Collapse chapter' : 'Expand chapter'}
                                      aria-label={isExpanded ? 'Collapse chapter' : 'Expand chapter'}
                                    >
                                      <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center justify-between mb-4">
                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                      </svg>
                                      Full Content
                                    </h5>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedChapter(null)
                                      }}
                                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                    >
                                      Collapse
                                    </button>
                                  </div>

                                  <div className="max-h-[600px] overflow-y-auto space-y-4">
                                    {chapter.formattedContent && chapter.formattedContent.length > 0 ? (
                                      chapter.formattedContent.map((block, blockIndex) => {
                                        switch (block.type) {
                                          case 'heading':
                                            return (
                                              <h3 key={blockIndex} className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-3 uppercase">
                                                {block.text}
                                              </h3>
                                            )
                                          case 'numbered':
                                            return (
                                              <div key={blockIndex} className="flex items-start space-x-3 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">
                                                  {block.text?.match(/^\d+\./)?.[0]}
                                                </span>
                                                <span className="flex-1">{block.text?.replace(/^\d+\.\s*/, '')}</span>
                                              </div>
                                            )
                                          case 'bullet':
                                            return (
                                              <div key={blockIndex} className="flex items-start space-x-3 text-sm text-gray-700 dark:text-gray-300 ml-4">
                                                <span className="text-green-600 dark:text-green-400 flex-shrink-0">•</span>
                                                <span className="flex-1">{block.text?.replace(/^[•\-\*]\s*/, '').replace(/^[a-z]\)\s*/, '')}</span>
                                              </div>
                                            )
                                          case 'table':
                                            return (
                                              <div key={blockIndex} className="overflow-x-auto my-4">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {block.rows?.map((row, rowIndex) => (
                                                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50 dark:bg-gray-700' : ''}>
                                                        {row.map((cell, cellIndex) => (
                                                          <td
                                                            key={cellIndex}
                                                            className={`px-4 py-2 text-xs ${rowIndex === 0 ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} border-r border-gray-200 dark:border-gray-700 last:border-r-0`}
                                                          >
                                                            {cell}
                                                          </td>
                                                        ))}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )
                                          case 'paragraph':
                                          default:
                                            return (
                                              <p key={blockIndex} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {block.text}
                                              </p>
                                            )
                                        }
                                      })
                                    ) : (
                                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {chapter.fullContent}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Appendices Tab */}
                {!loading && activeTab === 'appendices' && guidelinesData && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Appendices Index
                    </h3>
                    <div className="space-y-4">
                      {guidelinesData.structure.appendices.map((appendix, index) => {
                        const isExpanded = expandedAppendix === appendix.letter

                        return (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all"
                          >
                            <div
                              onClick={() => setExpandedAppendix(isExpanded ? null : appendix.letter)}
                              className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                                  <span className="text-white font-bold text-lg">
                                    {appendix.letter}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                                        Appendix {appendix.letter}
                                      </h4>
                                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {appendix.title}
                                      </p>
                                      {appendix.startPage && uploadedPdf && (
                                        <a
                                          href={`${uploadedPdf}#page=${appendix.startPage}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          View in PDF (Page {appendix.startPage})
                                        </a>
                                      )}
                                      {!isExpanded && appendix.subtitle && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                          {appendix.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      className="ml-2 flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                      title={isExpanded ? 'Collapse appendix' : 'Expand appendix'}
                                      aria-label={isExpanded ? 'Collapse appendix' : 'Expand appendix'}
                                    >
                                      <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center justify-between mb-4">
                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      Full Content
                                    </h5>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedAppendix(null)
                                      }}
                                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                    >
                                      Collapse
                                    </button>
                                  </div>

                                  <div className="max-h-[600px] overflow-y-auto space-y-4">
                                    {appendix.formattedContent && appendix.formattedContent.length > 0 ? (
                                      appendix.formattedContent.map((block, blockIndex) => {
                                        switch (block.type) {
                                          case 'heading':
                                            return (
                                              <h3 key={blockIndex} className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-3 uppercase">
                                                {block.text}
                                              </h3>
                                            )
                                          case 'numbered':
                                            return (
                                              <div key={blockIndex} className="flex items-start space-x-3 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">
                                                  {block.text?.match(/^\d+\./)?.[0]}
                                                </span>
                                                <span className="flex-1">{block.text?.replace(/^\d+\.\s*/, '')}</span>
                                              </div>
                                            )
                                          case 'bullet':
                                            return (
                                              <div key={blockIndex} className="flex items-start space-x-3 text-sm text-gray-700 dark:text-gray-300 ml-4">
                                                <span className="text-green-600 dark:text-green-400 flex-shrink-0">•</span>
                                                <span className="flex-1">{block.text?.replace(/^[•\-\*]\s*/, '').replace(/^[a-z]\)\s*/, '')}</span>
                                              </div>
                                            )
                                          case 'table':
                                            return (
                                              <div key={blockIndex} className="overflow-x-auto my-4">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {block.rows?.map((row, rowIndex) => (
                                                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50 dark:bg-gray-700' : ''}>
                                                        {row.map((cell, cellIndex) => (
                                                          <td
                                                            key={cellIndex}
                                                            className={`px-4 py-2 text-xs ${rowIndex === 0 ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} border-r border-gray-200 dark:border-gray-700 last:border-r-0`}
                                                          >
                                                            {cell}
                                                          </td>
                                                        ))}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )
                                          case 'paragraph':
                                          default:
                                            return (
                                              <p key={blockIndex} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {block.text}
                                              </p>
                                            )
                                        }
                                      })
                                    ) : (
                                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {appendix.fullContent}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Search Results Tab */}
                {!loading && activeTab === 'search' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Search Results for "{searchQuery}"
                    </h3>
                    <div className="space-y-3">
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            ...{result.text}...
                          </p>
                        </div>
                      ))}
                      {searchResults.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                          No results found for "{searchQuery}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!uploadedPdf && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Guidelines Uploaded
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload a PDF document to view centre guidelines with searchable chapters and appendices
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary"
            >
              Upload Guidelines PDF
            </button>
          </div>
        )}

      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Upload Centre Guidelines
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFile(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Close upload modal"
                  aria-label="Close upload modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select PDF File
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                      : 'border-gray-300 dark:border-gray-600'
                    }`}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedFile
                        ? selectedFile.name
                        : 'Drag and drop your PDF here, or click to select'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFile(null)
                  }}
                  className="btn btn-secondary"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="btn btn-primary"
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CentreGuidelines
