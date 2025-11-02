import React, { useState, useEffect } from 'react'

interface Subject {
  _id: string
  name: string
  code: string
  class: string
  duration: number
  isActive: boolean
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch('/api/subjects?limit=100', {
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
      } else {
        setError(data.message || 'Failed to fetch subjects')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort subjects alphabetically by name when sortOrder is set
  const sortedSubjects = sortOrder 
    ? [...filteredSubjects].sort((a, b) => {
        const nameA = a.name.toLowerCase()
        const nameB = b.name.toLowerCase()
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB)
        } else {
          return nameB.localeCompare(nameA)
        }
      })
    : filteredSubjects

  const handleSortByName = () => {
    if (sortOrder === null || sortOrder === 'desc') {
      setSortOrder('asc')
    } else {
      setSortOrder('desc')
    }
  }

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject)
    setIsEditModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setIsAddModalOpen(false)
    setEditingSubject(null)
  }

  const handleAddClick = () => {
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
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Subjects
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage subjects and course curriculum
        </p>
        
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <button onClick={handleAddClick} className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Subject
        </button>
      </div>

      {/* Subjects Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <button 
                    onClick={handleSortByName}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
                  >
                    <span>Subject Name</span>
                    <div className="flex flex-col">
                      <svg 
                        className={`w-3 h-3 ${sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <svg 
                        className={`w-3 h-3 -mt-1 ${sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Subject Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Exam Duration (Hours)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
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
              ) : filteredSubjects.length === 0 ? (
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
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {subject.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.code}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditClick(subject)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
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
    duration: subject.duration || 3
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class
            </label>
            <select
              name="class"
              value={formData.class}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Class</option>
              <option value="10th">Class 10</option>
              <option value="12th">Class 12</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exam Duration (hours)
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="1"
              max="5"
              step="0.5"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
    duration: 3
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
        duration: 3
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class
            </label>
            <select
              name="class"
              value={formData.class}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Class</option>
              <option value="10th">Class 10</option>
              <option value="12th">Class 12</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exam Duration (hours)
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="1"
              max="5"
              step="0.5"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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