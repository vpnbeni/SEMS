import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import candidateService from '../services/candidateService'
import Loader from '../components/common/Loader'
import CandidateTable from '../components/candidates/CandidateTable'
import CandidateFilters from '../components/candidates/CandidateFilters'
import ImportModal from '../components/candidates/ImportModal'

interface Candidate {
  _id: string
  name: string
  rollNumber: string
  email?: string
  phone?: string
  course?: string
  semester?: number
  batch?: string
  department?: string
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  admissionDate?: string
  subjects?: Array<{ _id: string; name: string; code: string }>
  subjectCodes?: string[]
  importedFrom?: {
    fileName: string
    uploadDate: string
    cloudinaryUrl: string
  }
  createdAt: string
  updatedAt: string
}

interface CandidateStats {
  totalCandidates: number
  active: number
  inactive: number
  graduated: number
  suspended: number
  byCourse: Array<{ _id: string; count: number }>
  byDepartment: Array<{ _id: string; count: number }>
}

const Candidates: React.FC = () => {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [stats, setStats] = useState<CandidateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  })
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  })

  // Fetch candidates
  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await candidateService.getCandidates(queryParams.toString())
      setCandidates(response.data.data)
      setPagination({
        page: response.data.page,
        pages: response.data.pages,
        total: response.data.total,
        limit: pagination.limit
      })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch candidates')
    } finally {
      setLoading(false)
    }
  }

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await candidateService.getStats()
      setStats(response.data.data)
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    fetchCandidates()
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchStats()
  }, [])

  // Handle file drop for import
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }

    await handleImport(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: importing
  })

  // Handle PDF import
  const handleImport = async (file: File) => {
    try {
      setImporting(true)
      console.log('Starting PDF import...', { fileName: file.name, fileSize: file.size, fileType: file.type })
      
      const response = await candidateService.importFromPDF(file)
      
      console.log('Import response:', response.data)
      
      toast.success(
        `Successfully imported ${response.data.data.imported} candidates`
      )
      
      if (response.data.data.errors > 0) {
        toast.error(
          `${response.data.data.errors} candidates had errors during import`
        )
      }

      // Refresh data
      await fetchCandidates()
      await fetchStats()
      setShowImportModal(false)
    } catch (error: any) {
      console.error('Import error:', error)
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. The PDF file might be too large or complex.')
      } else if (error.message === 'canceled') {
        toast.error('Upload was canceled. Please try again.')
      } else {
        toast.error(error.response?.data?.message || 'Failed to import candidates')
      }
    } finally {
      setImporting(false)
    }
  }

  // Handle delete candidate
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) {
      return
    }

    try {
      await candidateService.deleteCandidate(id)
      toast.success('Candidate deleted successfully')
      await fetchCandidates()
      await fetchStats()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete candidate')
    }
  }

  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  if (loading && candidates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Candidates
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage examination candidates and import from PDF files
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import PDF
          </button>
          <button
            onClick={() => navigate('/candidates/new')}
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Candidate
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Candidates
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalCandidates.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.active.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inactive
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.inactive.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Graduated
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.graduated.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <CandidateFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        stats={stats}
      />

      {/* Import Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
        } ${importing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {importing ? (
            <div className="flex items-center">
              <Loader size="sm" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Processing PDF...
              </span>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF file here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                or click to select a file
              </p>
            </>
          )}
        </div>
      </div>

      {/* Candidates Table */}
      <CandidateTable
        candidates={candidates}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onDelete={handleDelete}
      />

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          importing={importing}
        />
      )}
    </div>
  )
}

export default Candidates