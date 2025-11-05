import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import candidateService from '../services/candidateService'
import Loader from '../components/common/Loader'
import CandidateTable from '../components/candidates/CandidateTable'
import ImportModal from '../components/candidates/ImportModal'
import { Candidate, CandidateStats } from '../types/candidate'

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
    limit: 50
  })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    class: ''
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

  // Drag-and-drop import removed; import handled via modal/button only

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
      {/* Header actions and inline filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Inline Filters */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search candidates..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
              className="block w-40 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-3">
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
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => handleFilterChange({ ...filters, class: '' })}
            className={`glass p-6 rounded-xl border-2 transition-all text-left ${
              filters.class === ''
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filters.class === '' ? 'bg-blue-500' : 'bg-blue-100 dark:bg-blue-900'
                }`}>
                  <svg className={`w-4 h-4 ${filters.class === '' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </button>

          <button
            onClick={() => handleFilterChange({ ...filters, class: '10th' })}
            className={`glass p-6 rounded-xl border-2 transition-all text-left ${
              filters.class === '10th'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filters.class === '10th' ? 'bg-green-500' : 'bg-green-100 dark:bg-green-900'
                }`}>
                  <svg className={`w-4 h-4 ${filters.class === '10th' ? 'text-white' : 'text-green-600 dark:text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Class 10th
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.class10th.toLocaleString()}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleFilterChange({ ...filters, class: '12th' })}
            className={`glass p-6 rounded-xl border-2 transition-all text-left ${
              filters.class === '12th'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  filters.class === '12th' ? 'bg-purple-500' : 'bg-purple-100 dark:bg-purple-900'
                }`}>
                  <svg className={`w-4 h-4 ${filters.class === '12th' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Class 12th
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.class12th.toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Removed separate filters panel and drag-and-drop import area */}

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