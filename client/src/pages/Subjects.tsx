import React, { useState, useEffect } from 'react'
import SubjectsImportModal from '../components/subjects/ImportModal'
import subjectService from '../services/subjectService'

interface Subject {
  _id: string
  name: string
  code: string
  class: string
  duration: number
  isActive: boolean
  answerSheet?: string
}

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'name' | 'code' | 'duration' | 'answerSheet' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 50
  })
  const [classFilter, setClassFilter] = useState<'all' | '10th' | '12th'>('all')
  const [stats, setStats] = useState({
    total: 0,
    class10th: 0,
    class12th: 0
  })

  useEffect(() => {
    fetchSubjects()
  }, [pagination.page, searchTerm, classFilter])

  useEffect(() => {
    fetchStats()
  }, [])

  // Reload data when sort parameters change
  useEffect(() => {
    fetchSubjects()
  }, [sortField, sortOrder])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/subjects/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setStats({
            total: data.data.total || 0,
            class10th: data.data.class10th || 0,
            class12th: data.data.class12th || 0
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchTerm) {
        queryParams.append('search', searchTerm)
      }

      if (classFilter !== 'all') {
        queryParams.append('class', classFilter)
      }

      // Add sorting parameters if active
      if (sortField && sortOrder) {
        queryParams.append('sortField', sortField)
        queryParams.append('sortOrder', sortOrder)
      }

      const response = await fetch(`/api/subjects?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subjects')
      }

      const data = await response.json()
      if (data.success) {
        setSubjects(data.data || [])
        setPagination({
          page: data.meta?.currentPage || 1,
          pages: data.meta?.totalPages || 1,
          total: data.meta?.totalCount || 0,
          limit: pagination.limit
        })
      } else {
        setError(data.message || 'Failed to fetch subjects')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Note: Sorting is now handled server-side, so we use subjects directly
  const sortedSubjects = subjects

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page on search
  }

  const handleClassFilterChange = (filter: 'all' | '10th' | '12th') => {
    setClassFilter(filter)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page on filter change
  }

  const handleSort = (field: 'name' | 'code' | 'duration' | 'answerSheet') => {
    if (sortField === field) {
      // Toggle sort order for the same field
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        // Reset sorting
        setSortField(null)
        setSortOrder(null)
      }
    } else {
      // New field, start with ascending
      setSortField(field)
      setSortOrder('asc')
    }
    
    // Reset to first page when sorting changes
    setPagination(prev => ({ ...prev, page: 1 }))
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

  const handleUpdateSubject = async (updatedSubject: Partial<Subject>) => {
    if (!editingSubject) return

    try {
      setIsSubmitting(true)
      setError(null) // Clear previous errors
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`/api/subjects/${editingSubject._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSubject)
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 409) {
          setError(data.message || 'Subject code already exists')
        } else if (response.status === 400) {
          setError(data.message || 'Invalid data provided')
        } else if (response.status === 404) {
          setError('Subject not found')
        } else {
          setError(data.message || `Failed to update subject (${response.status})`)
        }
        return
      }

      if (data.success) {
        // Update the subject in the local state
        setSubjects(prev => prev.map(subject => 
          subject._id === editingSubject._id ? { ...subject, ...data.data } : subject
        ))
        setSuccessMessage('Subject updated successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
        handleCloseModal()
      } else {
        setError(data.message || 'Failed to update subject')
      }
    } catch (err) {
      console.error('Update subject error:', err)
      setError(err instanceof Error ? err.message : 'Network error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSubject = async (newSubject: Partial<Subject>) => {
    try {
      setIsSubmitting(true)
      setError(null) // Clear previous errors
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSubject)
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 409) {
          setError(data.message || 'Subject code already exists')
        } else if (response.status === 400) {
          setError(data.message || 'Invalid data provided')
        } else {
          setError(data.message || `Failed to create subject (${response.status})`)
        }
        return
      }

      if (data.success) {
        // Add the new subject to the local state
        setSubjects(prev => [...prev, data.data])
        setSuccessMessage('Subject created successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
        handleCloseModal()
      } else {
        setError(data.message || 'Failed to create subject')
      }
    } catch (err) {
      console.error('Create subject error:', err)
      setError(err instanceof Error ? err.message : 'Network error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubject = async (subject: Subject) => {
    if (!window.confirm(`Are you sure you want to delete "${subject.name}"?`)) {
      return
    }

    try {
      setError(null)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`/api/subjects/${subject._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        setError(data.message || `Failed to delete subject (${response.status})`)
        return
      }

      if (data.success) {
        // Remove the subject from local state
        setSubjects(prev => prev.filter(s => s._id !== subject._id))
        setSuccessMessage('Subject deleted successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(data.message || 'Failed to delete subject')
      }
    } catch (err) {
      console.error('Delete subject error:', err)
      setError(err instanceof Error ? err.message : 'Network error occurred')
    }
  }

  const handleImportSubjects = async (file: File) => {
    try {
      setImporting(true)
      await subjectService.importFromPDF(file)
      await fetchSubjects()
      setShowImportModal(false)
      setSuccessMessage('Subjects imported successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import subjects')
    } finally {
      setImporting(false)
    }
  }
  return (
    <div className="p-6">
      <div className="mb-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-lg">
          <div className="relative">
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
        <div className="flex gap-3">
        <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import PDF
        </button>
        <button onClick={handleAddClick} className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Subject
        </button>
        <button
          onClick={async () => {
            if (!window.confirm('Permanently delete ALL subjects? This cannot be undone.')) return
            try {
              const token = localStorage.getItem('token')
              if (!token) { setError('Authentication required'); return }
              const response = await fetch('/api/subjects', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              })
              if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.message || 'Failed to delete all subjects')
              }
              setSubjects([])
              setSuccessMessage('All subjects permanently deleted!')
              setTimeout(() => setSuccessMessage(null), 3000)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete all subjects')
            }
          }}
          className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
        >
          Delete All
        </button>
        </div>
      </div>

      {/* Stats Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => handleClassFilterChange('all')}
          className={`p-4 rounded-lg border-2 transition-all ${
            classFilter === 'all'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${classFilter === 'all' ? 'bg-blue-500' : 'bg-blue-100 dark:bg-blue-900'}`}>
              <svg className={`w-6 h-6 ${classFilter === 'all' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Subjects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleClassFilterChange('10th')}
          className={`p-4 rounded-lg border-2 transition-all ${
            classFilter === '10th'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${classFilter === '10th' ? 'bg-green-500' : 'bg-green-100 dark:bg-green-900'}`}>
              <svg className={`w-6 h-6 ${classFilter === '10th' ? 'text-white' : 'text-green-600 dark:text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400">Class 10th</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.class10th}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleClassFilterChange('12th')}
          className={`p-4 rounded-lg border-2 transition-all ${
            classFilter === '12th'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${classFilter === '12th' ? 'bg-purple-500' : 'bg-purple-100 dark:bg-purple-900'}`}>
              <svg className={`w-6 h-6 ${classFilter === '12th' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400">Class 12th</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.class12th}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Subjects Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
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
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading subjects...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-red-500">{error}</p>
                      <button 
                        onClick={fetchSubjects}
                        className="mt-4 btn btn-primary"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : sortedSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
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
                  <tr key={subject._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {subject.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.class}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.duration ? `${subject.duration} hrs` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{
                        subject.answerSheet === '32_pages' ? '32 Pages' :
                        subject.answerSheet === '20_pages' ? '20 Pages' :
                        subject.answerSheet === '40_graph' ? '40 Graph' :
                        subject.answerSheet === 'none' ? 'None' : '—'
                      }</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditClick(subject)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteSubject(subject)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
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
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
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
                </div>
              </div>
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
          isSubmitting={isSubmitting}
        />
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddSubjectModal
          isOpen={isAddModalOpen}
          onClose={handleCloseModal}
          onCreate={handleCreateSubject}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Import Subjects Modal */}
      {showImportModal && (
        <SubjectsImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportSubjects}
          importing={importing}
        />
      )}
    </div>
  )
}

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Subject
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject Code
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              pattern="[A-Z0-9]{3,8}"
              title="Subject code must be 3-8 uppercase letters and numbers"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
            <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, class: '10th' }))} className={`px-4 py-2 text-sm ${formData.class === '10th' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Class 10</button>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, class: '12th' }))} className={`px-4 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.class === '12th' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Class 12</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Duration (hours)</label>
            <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, duration: 2 }))} className={`px-4 py-2 text-sm ${formData.duration === 2 ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>2 Hours</button>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, duration: 3 }))} className={`px-4 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.duration === 3 ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>3 Hours</button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer Sheet</label>
              <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, answerSheet: '32_pages' }))} className={`px-3 py-2 text-sm ${formData.answerSheet === '32_pages' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>32 Pages</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, answerSheet: '20_pages' }))} className={`px-3 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.answerSheet === '20_pages' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>20 Pages</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, answerSheet: '40_graph' }))} className={`px-3 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.answerSheet === '40_graph' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>40 Graph</button>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add New Subject
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter subject name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject Code
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              pattern="[A-Z0-9]{3,8}"
              title="Subject code must be 3-8 uppercase letters and numbers"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter subject code (e.g., MATH10)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
            <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, class: '10th' }))} className={`px-4 py-2 text-sm ${formData.class === '10th' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Class 10</button>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, class: '12th' }))} className={`px-4 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.class === '12th' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Class 12</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Duration (hours)</label>
            <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, duration: 2 }))} className={`px-4 py-2 text-sm ${formData.duration === 2 ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>2 Hours</button>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, duration: 3 }))} className={`px-4 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.duration === 3 ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>3 Hours</button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer Sheet</label>
              <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, answerSheet: '32_pages' }))} className={`px-3 py-2 text-sm ${formData.answerSheet === '32_pages' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>32 Pages</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, answerSheet: '20_pages' }))} className={`px-3 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.answerSheet === '20_pages' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>20 Pages</button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, answerSheet: '40_graph' }))} className={`px-3 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${formData.answerSheet === '40_graph' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>40 Graph</button>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Subject'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Subjects