import React, { useState, useMemo } from 'react'
import { Pencil } from 'lucide-react'
import SubjectsImportModal from '../components/subjects/ImportModal'
import { Tabs } from '../components/common/Tabs'
import { Dropdown } from '../components/common/Dropdown'
import {
  useSubjectList,
  useSubjectStats,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useImportSubjectsMutation,
} from '../hooks/useSubjects'

type SubjectTabId = 'all' | '10th' | '12th'

interface Subject {
  _id: string
  name: string
  code: string
  class: string
  duration: number
  isActive: boolean
  answerSheet?: string
}

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
]

const Subjects: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'name' | 'code' | 'duration' | 'answerSheet' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [classFilter, setClassFilter] = useState<SubjectTabId>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      ...(searchTerm && { search: searchTerm }),
      ...(classFilter !== 'all' && { class: classFilter }),
      ...(sortField && sortOrder && { sortField, sortOrder }),
    }),
    [page, pageSize, searchTerm, classFilter, sortField, sortOrder]
  )

  const { data, isLoading: loading, refetch } = useSubjectList(queryParams)
  const { data: stats = { total: 0, class10th: 0, class12th: 0 } } = useSubjectStats()

  const createMutation = useCreateSubjectMutation()
  const updateMutation = useUpdateSubjectMutation()
  const deleteMutation = useDeleteSubjectMutation()
  const importMutation = useImportSubjectsMutation()

  const subjects = data?.data ?? []
  const pagination = useMemo(
    () => ({
      page: data?.page ?? 1,
      pages: data?.pages ?? 1,
      total: data?.total ?? 0,
      limit: data?.limit ?? pageSize,
    }),
    [data, pageSize]
  )

  const handlePageSizeChange = (value: string | number | (string | number)[]) => {
    const newSize = Number(Array.isArray(value) ? value[0] : value)
    setPageSize(newSize)
    setPage(1)
  }

  const sortedSubjects = subjects

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPage(1)
  }

  const handleTabChange = (id: SubjectTabId) => {
    setClassFilter(id)
    setPage(1)
  }

  const handleSort = (field: 'name' | 'code' | 'duration' | 'answerSheet') => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortField(null)
        setSortOrder(null)
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject)
    setIsEditModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setIsAddModalOpen(false)
    setEditingSubject(null)
    setError(null) // Clear errors when closing modal
  }

  const handleAddClick = () => {
    setError(null) // Clear any previous errors
    setIsAddModalOpen(true)
  }

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleUpdateSubject = async (updatedSubject: Partial<Subject>) => {
    if (!editingSubject) return
    setError(null)
    updateMutation.mutate(
      { id: editingSubject._id, data: updatedSubject },
      {
        onSuccess: () => {
          showSuccess('Subject updated successfully!')
          handleCloseModal()
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to update subject'
          if (err?.response?.status === 409) setError('Subject code already exists')
          else if (err?.response?.status === 400) setError('Invalid data provided')
          else if (err?.response?.status === 404) setError('Subject not found')
          else setError(msg)
        },
      }
    )
  }

  const handleCreateSubject = async (newSubject: Partial<Subject>) => {
    setError(null)
    createMutation.mutate(newSubject, {
      onSuccess: () => {
        showSuccess('Subject created successfully!')
        handleCloseModal()
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to create subject'
        if (err?.response?.status === 409) setError('Subject code already exists')
        else if (err?.response?.status === 400) setError('Invalid data provided')
        else setError(msg)
      },
    })
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllOnPage = () => {
    const ids = sortedSubjects.map((s) => s._id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} selected subject(s)? This cannot be undone.`)) return
    setError(null)
    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)))
      clearSelection()
      showSuccess(`${ids.length} subject(s) deleted successfully!`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to delete some subjects')
    }
  }

  const allOnPageSelected = sortedSubjects.length > 0 && sortedSubjects.every((s) => selectedIds.has(s._id))
  const someOnPageSelected = sortedSubjects.some((s) => selectedIds.has(s._id))

  const handleImportSubjects = async (file: File) => {
    setError(null)
    importMutation.mutate(file, {
      onSuccess: () => {
        setShowImportModal(false)
        showSuccess('Subjects imported successfully!')
      },
      onError: (err: any) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Failed to import subjects')
      },
    })
  }

  return (
    <div className="pt-4 px-8 pb-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {/* Stat cards (display only) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Subjects</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class 10th</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.class10th}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-violet-50 text-violet-500 dark:bg-violet-900/20 dark:text-violet-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class 12th</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.class12th}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search (above table card) */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table card: tabs + buttons bar, then table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Ribbon: Tabs + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <Tabs<SubjectTabId>
            tabs={[
              { id: 'all', label: 'Total Subjects', color: 'blue' },
              { id: '10th', label: 'Class 10th', color: 'emerald' },
              { id: '12th', label: 'Class 12th', color: 'purple' }
            ]}
            activeTab={classFilter}
            onChange={handleTabChange}
            variant="pill"
            size="sm"
            ariaLabel="Subject views"
          />
          <div className="flex gap-3 shrink-0">
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-700 shadow-sm text-sm font-medium rounded-lg text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
              >
                Delete {selectedIds.size} selected
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-lg text-blue-600 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import PDF
            </button>
            <button
              onClick={handleAddClick}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Subject
            </button>
          </div>
        </div>
        {/* Subjects Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected
                      }}
                      onChange={selectAllOnPage}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      aria-label="Select all on page"
                    />
                  </label>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <button onClick={() => handleSort('code')} className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none">
                    <span>Sub Code</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === 'code' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                      <svg className={`w-3 h-3 -mt-1 ${sortField === 'code' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none">
                    <span>Subject Name</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === 'name' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                      <svg className={`w-3 h-3 -mt-1 ${sortField === 'name' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <button onClick={() => handleSort('duration')} className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none">
                    <span>Duration (Hours)</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === 'duration' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                      <svg className={`w-3 h-3 -mt-1 ${sortField === 'duration' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <button onClick={() => handleSort('answerSheet')} className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none">
                    <span>Answer Sheet</span>
                    <div className="flex flex-col">
                      <svg className={`w-3 h-3 ${sortField === 'answerSheet' && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                      <svg className={`w-3 h-3 -mt-1 ${sortField === 'answerSheet' && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading subjects...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-red-500">{error}</p>
                      <button 
                        onClick={() => refetch()}
                        className="mt-4 btn btn-primary"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : sortedSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'No subjects match your search.' : 'No subjects found. Add your first subject to get started.'}
                      </p>
                      <button onClick={handleAddClick} className="mt-4 btn btn-primary">
                        Add Subject
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedSubjects.map((subject) => (
                  <tr key={subject._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    subject.class === '10th' 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : subject.class === '12th' 
                      ? 'bg-purple-50 dark:bg-purple-900/20' 
                      : ''
                  }`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(subject._id)}
                          onChange={() => toggleSelection(subject._id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                          aria-label={`Select ${subject.name}`}
                        />
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        subject.class === '10th'
                          ? 'text-green-800 dark:text-green-300'
                          : subject.class === '12th'
                          ? 'text-purple-800 dark:text-purple-300'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {subject.code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        subject.class === '10th'
                          ? 'text-green-800 dark:text-green-300'
                          : subject.class === '12th'
                          ? 'text-purple-800 dark:text-purple-300'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {subject.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${
                        subject.class === '10th'
                          ? 'text-green-700 dark:text-green-400'
                          : subject.class === '12th'
                          ? 'text-purple-700 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {subject.class}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        subject.class === '10th'
                          ? 'text-green-700 dark:text-green-400'
                          : subject.class === '12th'
                          ? 'text-purple-700 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {subject.duration ? `${subject.duration} ${subject.duration === 1 ? 'Hour' : 'Hours'}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${
                        subject.class === '10th'
                          ? 'text-green-700 dark:text-green-400'
                          : subject.class === '12th'
                          ? 'text-purple-700 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>{
                        subject.answerSheet === '32_pages' ? '32 Pages' :
                        subject.answerSheet === '20_pages' ? '20 Pages' :
                        subject.answerSheet === '40_graph' ? '40 Graph' :
                        subject.answerSheet === 'none' ? 'None' : '—'
                      }</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium align-middle">
                      <button
                        type="button"
                        onClick={() => handleEditClick(subject)}
                        title="Edit"
                        aria-label={`Edit ${subject.name}`}
                        className={`
                          inline-flex items-center justify-center p-1 rounded-md transition-colors leading-none
                          ${subject.class === '10th'
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200/70 dark:hover:bg-emerald-800/40 hover:text-emerald-800 dark:hover:text-emerald-300'
                            : subject.class === '12th'
                            ? 'text-violet-600 dark:text-violet-400 hover:bg-violet-200/70 dark:hover:bg-violet-800/40 hover:text-violet-800 dark:hover:text-violet-300'
                            : 'text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-blue-800 dark:hover:text-blue-300'
                          }
                        `}
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">
                    {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Per page</span>
                  <Dropdown
                    options={PAGE_SIZE_OPTIONS}
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    size="sm"
                    clearable={false}
                    searchable={false}
                    placeholder=""
                    className="w-20"
                  />
                </div>
              </div>
              {pagination.pages > 1 && (
                <>
                  <div className="flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingSubject && (
        <EditSubjectModal
          subject={editingSubject}
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleUpdateSubject}
          isSubmitting={updateMutation.isPending}
        />
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddSubjectModal
          isOpen={isAddModalOpen}
          onClose={handleCloseModal}
          onCreate={handleCreateSubject}
          isSubmitting={createMutation.isPending}
        />
      )}

      {/* Import Subjects Modal */}
      {showImportModal && (
        <SubjectsImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportSubjects}
          importing={importMutation.isPending}
        />
      )}
    </div>
  )
}

// Reusable segment button group for modal
const segmentBtnBase =
  'min-h-[44px] px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800'
const segmentBtnActive =
  'bg-primary-600 text-white shadow-sm dark:bg-primary-500'
const segmentBtnInactive =
  'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 border border-transparent'

// Edit Subject Modal Component
interface EditSubjectModalProps {
  subject: Subject
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedSubject: Partial<Subject>) => void
  isSubmitting: boolean
}

const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  subject,
  isOpen,
  onClose,
  onUpdate,
  isSubmitting
}) => {
  const [formData, setFormData] = useState({
    name: subject.name || '',
    code: subject.code || '',
    class: subject.class || '',
    duration: subject.duration || 3,
    answerSheet: subject.answerSheet || '32_pages'
  })

  // Sync form when subject changes (e.g. opening modal for another subject)
  React.useEffect(() => {
    if (isOpen && subject) {
      setFormData({
        name: subject.name || '',
        code: subject.code || '',
        class: subject.class || '',
        duration: subject.duration || 3,
        answerSheet: subject.answerSheet || '32_pages'
      })
    }
  }, [isOpen, subject])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? Number(value) : name === 'code' ? value.toUpperCase() : value
    }))
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-subject-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
          <h2
            id="edit-subject-title"
            className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            Edit Subject
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          <div className="grid gap-4 sm:gap-5">
            <div>
              <label htmlFor="edit-subject-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Subject Name
              </label>
              <input
                id="edit-subject-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label htmlFor="edit-subject-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Subject Code
              </label>
              <input
                id="edit-subject-code"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                pattern="[A-Z0-9]{3,8}"
                title="Subject code must be 3-8 uppercase letters and numbers"
                className="input w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, class: '10th' }))}
                  className={`${segmentBtnBase} ${formData.class === '10th' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  Class 10
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, class: '12th' }))}
                  className={`${segmentBtnBase} ${formData.class === '12th' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  Class 12
                </button>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exam Duration (hours)</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, duration: 2 }))}
                  className={`${segmentBtnBase} ${formData.duration === 2 ? segmentBtnActive : segmentBtnInactive}`}
                >
                  2 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, duration: 3 }))}
                  className={`${segmentBtnBase} ${formData.duration === 3 ? segmentBtnActive : segmentBtnInactive}`}
                >
                  3 Hours
                </button>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Answer Sheet</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, answerSheet: '32_pages' }))}
                  className={`${segmentBtnBase} ${formData.answerSheet === '32_pages' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  32 Pages
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, answerSheet: '20_pages' }))}
                  className={`${segmentBtnBase} ${formData.answerSheet === '20_pages' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  20 Pages
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, answerSheet: '40_graph' }))}
                  className={`${segmentBtnBase} ${formData.answerSheet === '40_graph' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  40 Graph
                </button>
              </div>
            </div>
          </div>

          {/* Footer: responsive stack on small screens */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-outline w-full sm:w-auto min-h-[44px] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full sm:w-auto min-h-[44px] rounded-xl flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Subject'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Subject Modal Component
interface AddSubjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (newSubject: Partial<Subject>) => void
  isSubmitting: boolean
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isSubmitting
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    class: '',
    duration: 3,
    answerSheet: '32_pages'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? Number(value) : name === 'code' ? value.toUpperCase() : value
    }))
  }

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        code: '',
        class: '',
        duration: 3,
        answerSheet: '32_pages'
      })
    }
  }, [isOpen])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-subject-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
          <h2
            id="add-subject-title"
            className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            Add Subject
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          <div className="grid gap-4 sm:gap-5">
            <div>
              <label htmlFor="add-subject-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Subject Name
              </label>
              <input
                id="add-subject-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter subject name"
                className="input w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label htmlFor="add-subject-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Subject Code
              </label>
              <input
                id="add-subject-code"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                pattern="[A-Z0-9]{3,8}"
                title="Subject code must be 3-8 uppercase letters and numbers"
                placeholder="Enter subject code (e.g., 055)"
                className="input w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, class: '10th' }))}
                  className={`${segmentBtnBase} ${formData.class === '10th' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  Class 10
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, class: '12th' }))}
                  className={`${segmentBtnBase} ${formData.class === '12th' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  Class 12
                </button>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exam Duration (hours)</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, duration: 2 }))}
                  className={`${segmentBtnBase} ${formData.duration === 2 ? segmentBtnActive : segmentBtnInactive}`}
                >
                  2 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, duration: 3 }))}
                  className={`${segmentBtnBase} ${formData.duration === 3 ? segmentBtnActive : segmentBtnInactive}`}
                >
                  3 Hours
                </button>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Answer Sheet</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, answerSheet: '32_pages' }))}
                  className={`${segmentBtnBase} ${formData.answerSheet === '32_pages' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  32 Pages
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, answerSheet: '20_pages' }))}
                  className={`${segmentBtnBase} ${formData.answerSheet === '20_pages' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  20 Pages
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, answerSheet: '40_graph' }))}
                  className={`${segmentBtnBase} ${formData.answerSheet === '40_graph' ? segmentBtnActive : segmentBtnInactive}`}
                >
                  40 Graph
                </button>
              </div>
            </div>
          </div>

          {/* Footer: responsive stack on small screens */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-outline w-full sm:w-auto min-h-[44px] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full sm:w-auto min-h-[44px] rounded-xl flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                'Add Subject'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Subjects