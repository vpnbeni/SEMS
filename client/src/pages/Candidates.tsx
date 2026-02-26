import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import CandidateTable from '../components/candidates/CandidateTable'
import ImportModal from '../components/candidates/ImportModal'
import { Tabs } from '../components/common/Tabs'
import { Dropdown } from '../components/common/Dropdown'
import {
  useCandidates,
  useCandidateStats,
  useCandidatesWithoutSubjects,
  useCandidateFilterOptions,
  useImportCandidatesMutation,
  useDeleteCandidateMutation,
} from '../hooks/useCandidates'

type ClassTabId = 'all' | '10th' | '12th'

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
]

const DEFAULT_PAGE_SIZE = 50

const CANDIDATES_WITHOUT_SUBJECTS_ACCORDION_THRESHOLD = 5

const Candidates: React.FC = () => {
  const navigate = useNavigate()
  const [showImportModal, setShowImportModal] = useState(false)
  const [withoutSubjectsAccordionOpen, setWithoutSubjectsAccordionOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState({
    search: '',
    class: '',
    schoolCode: '',
    subjectCode: '',
    category: '',
    pwd: '',
    medium: '',
  })
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const classTabId: ClassTabId = filters.class === '' ? 'all' : (filters.class === '10th' ? '10th' : '12th')

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      ...(filters.search && { search: filters.search }),
      ...(filters.class && { class: filters.class }),
      ...(filters.schoolCode && { schoolCode: filters.schoolCode }),
      ...(filters.subjectCode && { subjectCode: filters.subjectCode }),
      ...(filters.category && { category: filters.category }),
      ...(filters.pwd && { pwd: filters.pwd }),
      ...(filters.medium && { medium: filters.medium }),
    }),
    [page, pageSize, filters]
  )

  const statsParams = useMemo(
    () => ({
      ...(filters.search && { search: filters.search }),
      ...(filters.class && { class: filters.class }),
      ...(filters.schoolCode && { schoolCode: filters.schoolCode }),
      ...(filters.subjectCode && { subjectCode: filters.subjectCode }),
      ...(filters.category && { category: filters.category }),
      ...(filters.pwd && { pwd: filters.pwd }),
      ...(filters.medium && { medium: filters.medium }),
    }),
    [filters]
  )

  const { data, isLoading: loading } = useCandidates(queryParams)
  const { data: stats } = useCandidateStats(statsParams)
  const { data: candidatesWithoutSubjects = [] } = useCandidatesWithoutSubjects()
  const { data: filterOptions } = useCandidateFilterOptions()

  const importMutation = useImportCandidatesMutation()
  const deleteMutation = useDeleteCandidateMutation()

  const candidates = data?.data ?? []
  const pagination = useMemo(
    () => ({
      page: data?.page ?? 1,
      pages: data?.pages ?? 1,
      total: data?.total ?? 0,
      limit: data?.limit ?? pageSize,
    }),
    [data, pageSize]
  )

  const activeFilterCount = useMemo(() => {
    const { schoolCode, subjectCode, category, pwd, medium } = filters
    return [schoolCode, subjectCode, category, pwd, medium].filter(Boolean).length
  }, [filters])

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleClassTabChange = (id: ClassTabId) => {
    handleFilterChange({ ...filters, class: id === 'all' ? '' : id })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  const handleImport = async (file: File) => {
    importMutation.mutate(file, {
      onSuccess: (response: any) => {
        const payload = response?.data?.data ?? response?.data
        const imported = payload?.imported ?? 0
        const skipped = payload?.errors ?? 0
        if (imported === 0 && skipped === 0) {
          toast('No candidates found in PDF', { icon: 'ℹ️' })
        } else if (imported === 0) {
          toast.success(`All ${skipped} candidates already exist — nothing new to import`)
        } else if (skipped === 0) {
          toast.success(`Successfully added ${imported} new candidate${imported !== 1 ? 's' : ''}`)
        } else {
          toast.success(`Added ${imported} new candidate${imported !== 1 ? 's' : ''} (${skipped} already existed, skipped)`)
        }
        setShowImportModal(false)
      },
      onError: (error: any) => {
        if (error?.code === 'ECONNABORTED') {
          toast.error('Request timeout. The PDF file might be too large or complex.')
        } else if (error?.message === 'canceled') {
          toast.error('Upload was canceled. Please try again.')
        } else {
          toast.error(error?.response?.data?.message || 'Failed to import candidates')
        }
      },
    })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Candidate deleted successfully')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to delete candidate')
      },
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats at top (display only – use tabs below for filtering) */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>

          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        </div>
      )}

      {/* Alert for candidates without subjects - shows on all pages */}
      {candidatesWithoutSubjects.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Candidates Without Subjects
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  <strong>{candidatesWithoutSubjects.length}</strong> candidate{candidatesWithoutSubjects.length !== 1 ? 's' : ''} {candidatesWithoutSubjects.length !== 1 ? 'have' : 'has'} no subjects assigned.
                  This may affect datesheet accuracy.
                </p>

                {candidatesWithoutSubjects.length > CANDIDATES_WITHOUT_SUBJECTS_ACCORDION_THRESHOLD ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setWithoutSubjectsAccordionOpen((prev) => !prev)}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md bg-yellow-100/80 dark:bg-yellow-800/40 hover:bg-yellow-200/80 dark:hover:bg-yellow-700/40 transition-colors"
                    >
                      <svg
                        className={`h-4 w-4 text-yellow-600 dark:text-yellow-400 transition-transform ${withoutSubjectsAccordionOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>
                        {withoutSubjectsAccordionOpen
                          ? 'Hide list'
                          : `Show list of ${candidatesWithoutSubjects.length} candidates`}
                      </span>
                    </button>
                    {withoutSubjectsAccordionOpen && (
                      <div className="mt-2 space-y-1 max-h-64 overflow-y-auto pr-2">
                        {candidatesWithoutSubjects.map((c, index) => (
                          <div key={c.rollNumber} className="flex items-center justify-between">
                            <span>
                              {index + 1}. {c.rollNumber} - {c.name}
                            </span>
                            <button
                              onClick={() => handlePageChange(c.page)}
                              className="ml-4 text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-700 rounded hover:bg-yellow-300 dark:hover:bg-yellow-600"
                            >
                              Go to Page {c.page}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    {candidatesWithoutSubjects.map((c, index) => (
                      <div key={c.rollNumber} className="flex items-center justify-between">
                        <span>
                          {index + 1}. {c.rollNumber} - {c.name}
                        </span>
                        <button
                          onClick={() => handlePageChange(c.page)}
                          className="ml-4 text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-700 rounded hover:bg-yellow-300 dark:hover:bg-yellow-600"
                        >
                          Go to Page {c.page}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <a
                    href="/relink-candidate-subjects.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Re-link Subjects
                    <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table card: ribbon (tabs + filters + buttons) + table */}
      <div className="glass rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        {/* Ribbon: Tabs + search + status dropdown + actions (like DateSheets) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-secondary-50/50 dark:bg-secondary-900/50 border-b border-secondary-200 dark:border-secondary-700">
          <Tabs<ClassTabId>
            tabs={[
              { id: 'all', label: 'All', color: 'blue' },
              { id: '10th', label: 'Class 10th', color: 'green' },
              { id: '12th', label: 'Class 12th', color: 'purple' },
            ]}
            activeTab={classTabId}
            onChange={handleClassTabChange}
            variant="pill"
            size="sm"
            ariaLabel="Class filter"
          />
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative w-56">
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
                className="block w-full pl-10 pr-3 py-2 border-2 border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-primary-500 dark:focus:border-primary-400 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              className="inline-flex items-center px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm font-medium text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-.553.894l-4 2A1 1 0 019 21v-8.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-primary-600 shadow-sm text-sm font-medium rounded-lg text-primary-600 bg-white dark:bg-secondary-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import PDF
            </button>
            <button
              onClick={() => navigate('/candidates/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Candidate
            </button>
          </div>
        </div>

        {showFilterPanel && (
          <div className="px-4 pb-3 bg-secondary-50/70 dark:bg-secondary-900/70 border-b border-secondary-200 dark:border-secondary-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              <div>
                <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                  School
                </p>
                <Dropdown
                  options={[
                    { value: '', label: 'All Schools' },
                    ...(filterOptions?.schools ?? []).map((s) => ({
                      value: s.schoolCode || s.schoolName || '',
                      label: `${s.schoolCode ? `${s.schoolCode} – ` : ''}${s.schoolName || 'Unknown School'}`,
                    })),
                  ]}
                  value={filters.schoolCode}
                  onChange={(value) =>
                    handleFilterChange({
                      ...filters,
                      schoolCode: String(Array.isArray(value) ? value[0] : value ?? ''),
                    })
                  }
                  size="sm"
                  clearable={false}
                  searchable
                  placeholder="School"
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                  Subject
                </p>
                <Dropdown
                  options={[
                    { value: '', label: 'All Subjects' },
                    ...(filterOptions?.subjectCodes ?? []).map((code) => ({
                      value: code,
                      label: code,
                    })),
                  ]}
                  value={filters.subjectCode}
                  onChange={(value) =>
                    handleFilterChange({
                      ...filters,
                      subjectCode: String(Array.isArray(value) ? value[0] : value ?? ''),
                    })
                  }
                  size="sm"
                  clearable={false}
                  searchable
                  placeholder="Subject"
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                  Category
                </p>
                <Dropdown
                  options={[
                    { value: '', label: 'All Categories' },
                    ...(filterOptions?.categories ?? []).map((cat) => ({
                      value: cat,
                      label: cat,
                    })),
                  ]}
                  value={filters.category}
                  onChange={(value) =>
                    handleFilterChange({
                      ...filters,
                      category: String(Array.isArray(value) ? value[0] : value ?? ''),
                    })
                  }
                  size="sm"
                  clearable={false}
                  searchable
                  placeholder="Category"
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                  PwD
                </p>
                <Dropdown
                  options={[
                    { value: '', label: 'All PwD' },
                    ...(filterOptions?.pwdValues ?? []).map((pwd) => ({
                      value: pwd,
                      label: pwd,
                    })),
                  ]}
                  value={filters.pwd}
                  onChange={(value) =>
                    handleFilterChange({
                      ...filters,
                      pwd: String(Array.isArray(value) ? value[0] : value ?? ''),
                    })
                  }
                  size="sm"
                  clearable={false}
                  searchable
                  placeholder="PwD"
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                  Medium
                </p>
                <Dropdown
                  options={[
                    { value: '', label: 'All Mediums' },
                    ...(filterOptions?.mediums ?? []).map((m) => ({
                      value: m.value,
                      label: m.label,
                    })),
                  ]}
                  value={filters.medium}
                  onChange={(value) =>
                    handleFilterChange({
                      ...filters,
                      medium: String(Array.isArray(value) ? value[0] : value ?? ''),
                    })
                  }
                  size="sm"
                  clearable={false}
                  searchable={false}
                  placeholder="Medium"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        <CandidateTable
          candidates={candidates}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onDelete={handleDelete}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          noCard
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          importing={importMutation.isPending}
        />
      )}
    </div>
  )
}

export default Candidates