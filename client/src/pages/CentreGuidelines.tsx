import React, { useState, useEffect } from 'react'

interface Chapter {
  number: string
  title: string
  description?: string
  fullContent?: string
  formattedContent?: ContentBlock[]
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
  const [uploading, setUploading] = useState(false)
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null)
  const [guidelinesData, setGuidelinesData] = useState<GuidelinesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'viewer' | 'chapters' | 'appendices' | 'search'>('viewer')
  const [expandedAppendix, setExpandedAppendix] = useState<string | null>(null)
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null)

  useEffect(() => {
    checkForExistingPdf()
  }, [])

  const checkForExistingPdf = async () => {
    const pdfPath = '/centre-guidelines.pdf'
    try {
      const response = await fetch(pdfPath, { method: 'HEAD' })
      if (response.ok) {
        setUploadedPdf(pdfPath)
        loadGuidelinesData()
      }
    } catch {
      // PDF doesn't exist yet
    }
  }

  const loadGuidelinesData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/guidelines/parse', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGuidelinesData(data.data)
      }
    } catch (error) {
      console.error('Error loading guidelines data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      alert('Please select a PDF file')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('pdf', selectedFile)

    try {
      const response = await fetch('/api/guidelines/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setUploadedPdf(data.path)
        setShowUploadModal(false)
        setSelectedFile(null)
        alert('Guidelines uploaded successfully!')
        loadGuidelinesData()
      } else {
        alert('Failed to upload guidelines')
      }
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
      const response = await fetch(`/api/guidelines/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results)
        setActiveTab('search')
      }
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
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Centre Guidelines
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Important guidelines and instructions for examination centre management
              </p>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Upload Guidelines
            </button>
          </div>

          {/* Search Bar */}
          {uploadedPdf && (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search within guidelines..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <svg className="absolute right-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 3}
                className="btn btn-primary"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          )}
        </div>

        {uploadedPdf && guidelinesData && (
          <>
            {/* Navigation Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('viewer')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'viewer'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    PDF Viewer
                  </button>
                  <button
                    onClick={() => setActiveTab('chapters')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'chapters'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Chapters ({guidelinesData.structure.chapters.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('appendices')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'appendices'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Appendices ({guidelinesData.structure.appendices.length})
                  </button>
                  {searchResults.length > 0 && (
                    <button
                      onClick={() => setActiveTab('search')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'search'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search Results ({searchResults.length})
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* PDF Viewer Tab */}
                {activeTab === 'viewer' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Centre Guidelines Document
                      </h3>
                      <a 
                        href={uploadedPdf} 
                        download 
                        className="btn btn-secondary text-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                      </a>
                    </div>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden" style={{ height: '700px' }}>
                      <iframe
                        src={uploadedPdf}
                        className="w-full h-full"
                        title="Centre Guidelines PDF"
                      />
                    </div>
                  </div>
                )}

                {/* Chapters Tab */}
                {activeTab === 'chapters' && (
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
                                      {!isExpanded && chapter.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                          {chapter.description}
                                        </p>
                                      )}
                                    </div>
                                    <button className="ml-2 flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
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
                {activeTab === 'appendices' && (
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
                                      {!isExpanded && appendix.subtitle && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                          {appendix.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <button className="ml-2 flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
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
                {activeTab === 'search' && (
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

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {guidelinesData.metadata.pages}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {guidelinesData.structure.chapters.length}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {guidelinesData.structure.appendices.length}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {guidelinesData.structure.guidelines.length}+
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Guidelines</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!uploadedPdf && (
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
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf"
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
                      {selectedFile ? selectedFile.name : 'Click to select PDF file'}
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
