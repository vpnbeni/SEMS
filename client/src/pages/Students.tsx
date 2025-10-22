import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '../redux/store'
import { showAddStudentModal, showEditStudentModal, fetchStudents } from '../redux/slices/studentSlice'
import StudentModal from '../components/students/StudentModal'

const Students: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')

  const { students, loading, error, pagination } = useSelector((state: RootState) => state.students)
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const SERVER_URL = API_BASE_URL.replace('/api', '');
  
  const getProfileImageUrl = (profileImage?: string) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    return `${SERVER_URL}${profileImage}`;
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch students on mount and when filters change
  useEffect(() => {
    const params: any = {
      page: 1,
      limit: pagination.itemsPerPage
    }
    
    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim()
    }
    
    if (classFilter) {
      params.class = classFilter
    }
    
    if (sectionFilter) {
      params.section = sectionFilter
    }
    
    dispatch(fetchStudents(params))
  }, [dispatch, debouncedSearch, classFilter, sectionFilter])

  // Event handlers
  const handleAddStudent = () => {
    dispatch(showAddStudentModal())
  }

  const handleImport = () => {
    console.log('Import Students clicked - Feature coming soon')
    // TODO: Implement import functionality
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleEditStudent = (student: any) => {
    dispatch(showEditStudentModal(student))
  }

  const handleViewStudent = (student: any) => {
    navigate(`/students/${student._id}`)
  }

  return (
    <div className="p-6">
      <StudentModal mode="add" />
      <StudentModal mode="edit" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Students
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage student information and enrollment
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex-1 max-w-2xl flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Classes</option>
            <option value="10th">Class 10</option>
            <option value="12th">Class 12</option>
          </select>
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleImport}
            className="btn btn-secondary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import
          </button>
          <button
            onClick={handleAddStudent}
            className="btn btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Student
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Roll Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            No students found. Add your first student to get started.
                          </p>
                          <button
                            onClick={handleAddStudent}
                            className="mt-4 btn btn-primary"
                          >
                            Add Student
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {student.profileImage ? (
                                <div className="relative">
                                  <img
                                    src={getProfileImageUrl(student.profileImage) || ''}
                                    alt={student.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div 
                                    className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold"
                                    style={{ display: 'none' }}
                                  >
                                    {student.name.charAt(0).toUpperCase()}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{student.rollNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{student.class}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{student.section}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{student.phone || 'N/A'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{student.guardianPhone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleViewStudent(student)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleEditStudent(student)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                          >
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => {
                      const params: any = {
                        page: pagination.currentPage - 1,
                        limit: pagination.itemsPerPage
                      }
                      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
                      if (classFilter) params.class = classFilter
                      if (sectionFilter) params.section = sectionFilter
                      dispatch(fetchStudents(params))
                    }}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      const params: any = {
                        page: pagination.currentPage + 1,
                        limit: pagination.itemsPerPage
                      }
                      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
                      if (classFilter) params.class = classFilter
                      if (sectionFilter) params.section = sectionFilter
                      dispatch(fetchStudents(params))
                    }}
                    disabled={!pagination.hasNextPage}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.itemsPerPage + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.totalItems}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => {
                          const params: any = {
                            page: pagination.currentPage - 1,
                            limit: pagination.itemsPerPage
                          }
                          if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
                          if (classFilter) params.class = classFilter
                          if (sectionFilter) params.section = sectionFilter
                          dispatch(fetchStudents(params))
                        }}
                        disabled={!pagination.hasPrevPage}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          const params: any = {
                            page: pagination.currentPage + 1,
                            limit: pagination.itemsPerPage
                          }
                          if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
                          if (classFilter) params.class = classFilter
                          if (sectionFilter) params.section = sectionFilter
                          dispatch(fetchStudents(params))
                        }}
                        disabled={!pagination.hasNextPage}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Students