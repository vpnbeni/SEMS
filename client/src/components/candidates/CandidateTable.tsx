import React from 'react'
import { useNavigate } from 'react-router-dom'
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
  photoUrl?: string
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

type SortableField = 'rollNumber' | 'name' | 'class'

interface CandidateTableProps {
  candidates: Candidate[]
  loading: boolean
  pagination: Pagination
  onPageChange: (page: number) => void
  pageSizeOptions?: { value: number; label: string }[]
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  sortField?: SortableField
  sortDirection?: 'asc' | 'desc'
  onSortChange?: (field: SortableField) => void
  /** When true, render only table + pagination (no card wrapper). Use when parent provides the card and toolbar. */
  noCard?: boolean
}

const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  loading,
  pagination,
  onPageChange,
  pageSizeOptions,
  pageSize,
  onPageSizeChange,
  sortField,
  sortDirection,
  onSortChange,
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

  const SortableHeader: React.FC<{ field: SortableField; children: React.ReactNode }> = ({ field, children }) => {
    const isActive = sortField === field
    return (
      <th
        className="px-4 py-2.5 text-left text-xs font-medium text-secondary-600 dark:text-secondary-400 cursor-pointer select-none hover:text-secondary-900 dark:hover:text-white transition-colors group"
        onClick={() => onSortChange?.(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <span className={`inline-flex flex-col text-[8px] leading-none ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-400 dark:text-secondary-600 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
            <span className={isActive && sortDirection === 'asc' ? 'text-primary-600 dark:text-primary-400' : ''}>▲</span>
            <span className={isActive && sortDirection === 'desc' ? 'text-primary-600 dark:text-primary-400' : ''}>▼</span>
          </span>
        </span>
      </th>
    )
  }

  const cardClass = noCard ? '' : 'bg-white dark:bg-secondary-900 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-sm'
  const wrapperClass = noCard ? 'overflow-hidden' : 'bg-white dark:bg-secondary-900 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-sm overflow-hidden'

  if (loading) {
    return (
      <div className={wrapperClass}>
        <div className="p-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Loading candidates...</span>
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
            onClick={() => navigate('/candidate-details/new')}
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
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-secondary-200 dark:border-secondary-700">
              <SortableHeader field="rollNumber">Roll no.</SortableHeader>
              <SortableHeader field="name">Candidate</SortableHeader>
              <SortableHeader field="class">Class</SortableHeader>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-secondary-600 dark:text-secondary-400">
                Parents
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-secondary-600 dark:text-secondary-400">
                Details
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-secondary-600 dark:text-secondary-400">
                Subject codes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
            {candidates.map((candidate) => (
              <tr
                key={candidate._id}
                onClick={() => navigate(`/candidate-details/${candidate._id}`)}
                className="hover:bg-secondary-50 dark:hover:bg-secondary-800/60 transition-colors cursor-pointer"
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="text-sm font-medium text-secondary-900 dark:text-white">
                    {candidate.rollNumber}
                  </div>
                  {candidate.flc && (
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">
                      FLC: {candidate.flc}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {candidate.photoUrl ? (
                      <img
                        src={candidate.photoUrl}
                        alt={candidate.name}
                        className="w-8 h-8 rounded-full object-cover border border-secondary-200 dark:border-secondary-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary-100 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-secondary-900 dark:text-white">
                        {candidate.name}
                      </div>
                      {(candidate.dateOfBirth || candidate.sex) && (
                        <div className="text-xs text-secondary-500 dark:text-secondary-400">
                          {candidate.dateOfBirth && <span>DoB: {formatDate(candidate.dateOfBirth)}</span>}
                          {candidate.dateOfBirth && candidate.sex && <span className="mx-1">·</span>}
                          {candidate.sex && <span>Sex: {candidate.sex}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {candidate.class ? (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${candidate.class === '12th'
                      ? 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/20'
                      : 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:ring-green-400/20'
                      }`}>
                      {candidate.class}
                    </span>
                  ) : (
                    <span className="text-xs text-secondary-500 dark:text-secondary-400">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-xs text-secondary-700 dark:text-secondary-300">
                    {candidate.motherName && <span>M: {candidate.motherName}</span>}
                    {candidate.motherName && candidate.fatherName && <span className="mx-1">·</span>}
                    {candidate.fatherName && <span>F: {candidate.fatherName}</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-xs text-secondary-700 dark:text-secondary-300 space-x-1.5">
                    {candidate.category && (
                      <span><span className="text-secondary-500 dark:text-secondary-400">Cat:</span> {candidate.category}</span>
                    )}
                    {candidate.pwd && (
                      <span><span className="text-secondary-500 dark:text-secondary-400">PwD:</span> {candidate.pwd}</span>
                    )}
                    {candidate.consession && (
                      <span><span className="text-secondary-500 dark:text-secondary-400">Cons:</span> {candidate.consession}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {candidate.schoolName && (
                    <div className="text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5 pb-1.5 border-b border-secondary-100 dark:border-secondary-800">
                      {candidate.schoolCode && <span className="font-semibold text-secondary-900 dark:text-white">{candidate.schoolCode}</span>} {candidate.schoolName}
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
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${isHindi
                              ? 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-400 dark:ring-orange-400/20'
                              : 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20'
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
                          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20"
                        >
                          {subject.code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">
                      No subjects
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white dark:bg-secondary-900 px-4 py-3 border-t border-secondary-200 dark:border-secondary-700 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-secondary-600 dark:text-secondary-400">
            <p>
              <span className="font-semibold text-secondary-900 dark:text-white tabular-nums">
                {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
              </span>
              {'–'}
              <span className="font-semibold text-secondary-900 dark:text-white tabular-nums">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>
              {' of '}
              <span className="font-semibold text-secondary-900 dark:text-white tabular-nums">{pagination.total}</span>
              {' results'}
            </p>
            {pageSizeOptions && pageSize && onPageSizeChange && (
              <>
                <span className="hidden sm:inline text-secondary-300 dark:text-secondary-600">&bull;</span>
                <div className="flex items-center gap-2">
                  <span>Per page</span>
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
              </>
            )}
          </div>
          {pagination.pages > 1 && (
            <div className="inline-flex items-center gap-1 rounded-full border border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/60 p-1 self-start sm:self-auto">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full text-secondary-500 dark:text-secondary-400 hover:bg-white dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
                title="Previous page"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="flex items-center gap-1.5 px-1.5 text-sm tabular-nums">
                <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 text-secondary-900 dark:text-white text-xs font-semibold shadow-sm">
                  {pagination.page}
                </span>
                <span className="text-secondary-400 dark:text-secondary-500">of {pagination.pages}</span>
              </span>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full text-secondary-500 dark:text-secondary-400 hover:bg-white dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
                title="Next page"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CandidateTable
