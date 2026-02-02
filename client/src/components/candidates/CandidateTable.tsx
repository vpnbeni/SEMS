import React from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../common/Loader'
import { Dropdown } from '../common/Dropdown'

interface Candidate {
  _id: string
  name: string
  rollNumber: string
  schoolName?: string
  schoolCode?: string
  class?: string
  motherName?: string
  fatherName?: string
  sex?: string
  category?: string
  pwd?: string
  consession?: string
  dateOfBirth?: string
  previousRoll?: string
  previousYear?: string
  flc?: string
  email?: string
  phone?: string
  course?: string
  semester?: number
  batch?: string
  department?: string
  status: 'active' | 'inactive' | 'graduated' | 'suspended'
  admissionDate?: string
  subjects?: Array<{ _id: string; name: string; code: string }>
  subjectCodes?: Array<{ code: string; medium?: string }> | string[]
  importedFrom?: {
    fileName: string
    uploadDate: string
    cloudinaryUrl: string
  }
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  pages: number
  total: number
  limit: number
}

interface CandidateTableProps {
  candidates: Candidate[]
  loading: boolean
  pagination: Pagination
  onPageChange: (page: number) => void
  onDelete: (id: string) => void
  pageSizeOptions?: { value: number; label: string }[]
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  /** When true, render only table + pagination (no card wrapper). Use when parent provides the card and toolbar. */
  noCard?: boolean
}

const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  loading,
  pagination,
  onPageChange,
  onDelete,
  pageSizeOptions,
  pageSize,
  onPageSizeChange,
  noCard = false,
}) => {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const cardClass = noCard ? '' : 'glass rounded-xl border border-secondary-200 dark:border-secondary-700'
  const wrapperClass = noCard ? 'overflow-hidden' : 'glass rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden'

  if (loading) {
    return (
      <div className={noCard ? 'py-12' : cardClass + ' p-8'}>
        <div className="flex items-center justify-center">
          <Loader size="lg" />
        </div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className={noCard ? 'py-12 px-4' : cardClass + ' p-8'}>
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No candidates found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Get started by importing candidates from a PDF file or adding them manually.
          </p>
          <button
            onClick={() => navigate('/candidates/new')}
            className="btn btn-primary"
          >
            Add First Candidate
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
          <thead className="bg-secondary-50 dark:bg-secondary-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Roll No.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Candidate Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Parents
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Subject Codes
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-700">
            {candidates.map((candidate) => (
              <tr
                key={candidate._id}
                className="hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {candidate.rollNumber}
                  </div>
                  {candidate.flc && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      FLC: {candidate.flc}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {candidate.name}
                  </div>
                  {candidate.dateOfBirth && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      DoB: {formatDate(candidate.dateOfBirth)}
                    </div>
                  )}
                  {candidate.sex && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Sex: {candidate.sex}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {candidate.class ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${candidate.class === '12th'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                      {candidate.class}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {candidate.motherName && (
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      M: {candidate.motherName}
                    </div>
                  )}
                  {candidate.fatherName && (
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      F: {candidate.fatherName}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {candidate.category && (
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Cat:</span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">{candidate.category}</span>
                      </div>
                    )}
                    {candidate.pwd && (
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">PwD:</span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">{candidate.pwd}</span>
                      </div>
                    )}
                    {candidate.consession && (
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Cons:</span>{' '}
                        <span className="text-gray-700 dark:text-gray-300">{candidate.consession}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {candidate.schoolName && (
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                      🏫 {candidate.schoolCode && <span className="font-bold text-primary-600 dark:text-primary-400">{candidate.schoolCode}</span>} {candidate.schoolName}
                    </div>
                  )}
                  {candidate.subjectCodes && candidate.subjectCodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {candidate.subjectCodes.map((item, index) => {
                        const code = typeof item === 'string' ? item : item.code;
                        const medium = typeof item === 'object' && item.medium ? item.medium : '';
                        const isHindi = medium === '2';
                        const isEnglish = medium === '1';
                        const mediumLabel = isHindi ? 'Hindi' : isEnglish ? 'English' : '';

                        return (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isHindi
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}
                            title={mediumLabel ? `Medium: ${mediumLabel}` : ''}
                          >
                            {code}
                            {mediumLabel && <span className="ml-1 text-[10px]">({mediumLabel[0]})</span>}
                          </span>
                        );
                      })}
                    </div>
                  ) : candidate.subjects && candidate.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {candidate.subjects.map((subject) => (
                        <span
                          key={subject._id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {subject.code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      No subjects
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/candidates/${candidate._id}`)}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/candidates/${candidate._id}/edit`)}
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(candidate._id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white dark:bg-secondary-900 px-4 py-3 border-t border-secondary-200 dark:border-secondary-700 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-secondary-700 dark:text-secondary-300">
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
            {pageSizeOptions && pageSize && onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Per page</span>
                <Dropdown
                  options={pageSizeOptions}
                  value={pageSize}
                  onChange={(value) => {
                    const newSize = Number(Array.isArray(value) ? value[0] : value)
                    onPageSizeChange(newSize)
                  }}
                  size="sm"
                  clearable={false}
                  searchable={false}
                  placeholder=""
                  className="w-20"
                />
              </div>
            )}
          </div>
          {pagination.pages > 1 && (
            <>
              <div className="flex justify-between sm:hidden">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-secondary-300 dark:border-secondary-600 text-sm font-medium rounded-md text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-secondary-300 dark:border-secondary-600 text-sm font-medium rounded-md text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm font-medium text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.page
                        ? 'z-10 bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm font-medium text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CandidateTable