import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import candidateService from '../services/candidateService'
import Loader from '../components/common/Loader'

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
  subjects?: Array<{
    _id: string
    name: string
    code: string
    class?: string
    credits?: number
    examDate?: string | null
    answerSheetType?: string
    serialNumber?: string
    roomNo?: string | null
    invigilator1?: { name: string; oasisId?: string } | null
    invigilator2?: { name: string; oasisId?: string } | null
  }>
  subjectCodes?: Array<{ code: string; medium?: string }> | string[]
  importedFrom?: {
    fileName: string
    uploadDate: string
    cloudinaryUrl: string
  }
  createdAt: string
  updatedAt: string
  createdBy?: { name: string; email: string }
  updatedBy?: { name: string; email: string }
}

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjectSerials, setSubjectSerials] = useState<Record<string, string>>({})
  const [serialsLoading, setSerialsLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchCandidate()
    }
  }, [id])

  useEffect(() => {
    if (!id || !candidate?.subjects?.length) return
    let cancelled = false
    setSerialsLoading(true)
    candidateService
      .getCandidateSubjectSerials(id)
      .then((serials) => {
        if (cancelled) return
        const map: Record<string, string> = {}
        serials.forEach((s) => {
          if (s.serialNumber) map[s.subjectId] = s.serialNumber
        })
        setSubjectSerials(map)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSerialsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, candidate?._id])

  const fetchCandidate = async () => {
    try {
      setLoading(true)
      setSubjectSerials({})
      const response = await candidateService.getCandidate(id!)
      setCandidate(response.data.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch candidate details')
      navigate('/candidates')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      graduated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[status as keyof typeof statusConfig]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatExamDate = (dateString?: string | null) => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'TBD'
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const sortedSubjects = useMemo(() => {
    if (!candidate?.subjects || candidate.subjects.length === 0) return []

    return [...candidate.subjects].sort((a, b) => {
      const aTime = a.examDate ? new Date(a.examDate).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.examDate ? new Date(b.examDate).getTime() : Number.POSITIVE_INFINITY
      if (aTime !== bTime) return aTime - bTime
      return String(a.code || '').localeCompare(String(b.code || ''))
    })
  }, [candidate?.subjects])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader size="lg" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Candidate Not Found
          </h1>
          <button
            onClick={() => navigate('/candidates')}
            className="btn btn-primary"
          >
            Back to Candidates
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center space-x-4">
      <button
      type="button"
      onClick={() => navigate('/candidates')}
      className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
      aria-label="Back to candidates list"
      title="Back to candidates list"
      >
      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      </button>
      <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {candidate.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Roll Number: {candidate.rollNumber}
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => navigate(`/candidates/${candidate._id}/edit`)}
            className="btn btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Candidate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900 dark:text-white">{candidate.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Roll Number
                </label>
                <p className="text-gray-900 dark:text-white font-mono">{candidate.rollNumber}</p>
              </div>
              {candidate.flc && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    FLC
                  </label>
                  <p className="text-gray-900 dark:text-white">{candidate.flc}</p>
                </div>
              )}
              {candidate.sex && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Sex
                  </label>
                  <p className="text-gray-900 dark:text-white">{candidate.sex}</p>
                </div>
              )}
              {candidate.dateOfBirth && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Date of Birth
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(candidate.dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {candidate.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Category
                  </label>
                  <p className="text-gray-900 dark:text-white">{candidate.category}</p>
                </div>
              )}
              {candidate.pwd && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    PwD
                  </label>
                  <p className="text-gray-900 dark:text-white">{candidate.pwd}</p>
                </div>
              )}
              {candidate.consession && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Consession
                  </label>
                  <p className="text-gray-900 dark:text-white">{candidate.consession}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                <div>{getStatusBadge(candidate.status)}</div>
              </div>
            </div>
          </div>

          {/* Family Information */}
          {(candidate.motherName || candidate.fatherName) && (
            <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Family Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.motherName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Mother's Name
                    </label>
                    <p className="text-gray-900 dark:text-white">{candidate.motherName}</p>
                  </div>
                )}
                {candidate.fatherName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Father's Name
                    </label>
                    <p className="text-gray-900 dark:text-white">{candidate.fatherName}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {(candidate.email || candidate.phone) && (
            <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {candidate.email ? (
                      <a href={`mailto:${candidate.email}`} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                        {candidate.email}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Phone
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {candidate.phone ? (
                      <a href={`tel:${candidate.phone}`} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                        {candidate.phone}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* School Information */}
          {(candidate.schoolCode || candidate.schoolName || candidate.class) && (
            <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                School Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.schoolCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      School Code
                    </label>
                    <p className="text-gray-900 dark:text-white font-mono font-semibold text-primary-600 dark:text-primary-400">
                      {candidate.schoolCode}
                    </p>
                  </div>
                )}
                {candidate.schoolName && (
                  <div className={candidate.schoolCode ? 'md:col-span-1' : 'md:col-span-2'}>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      School Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      🏫 {candidate.schoolName}
                    </p>
                  </div>
                )}
                {candidate.class && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Class
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      candidate.class === '12th' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {candidate.class}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subject Codes */}
          {candidate.subjectCodes && candidate.subjectCodes.length > 0 && (
            <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Subject Codes
              </h2>
              <div className="flex flex-wrap gap-2">
                {candidate.subjectCodes.map((item, index) => {
                  const code = typeof item === 'string' ? item : item.code;
                  const medium = typeof item === 'object' && item.medium ? item.medium : '';
                  const isHindi = medium === '2';
                  const isEnglish = medium === '1';
                  const mediumLabel = isHindi ? 'Hindi' : isEnglish ? 'English' : '';
                  
                  return (
                    <div 
                      key={index} 
                      className={`px-4 py-2 rounded-lg ${
                        isHindi 
                          ? 'bg-orange-50 dark:bg-orange-900/30'
                          : 'bg-blue-50 dark:bg-blue-900/30'
                      }`}
                    >
                      <span className={`text-sm font-medium ${
                        isHindi
                          ? 'text-orange-900 dark:text-orange-200'
                          : 'text-blue-900 dark:text-blue-200'
                      }`}>
                        {code}
                      </span>
                      {mediumLabel && (
                        <span className={`ml-2 text-xs ${
                          isHindi
                            ? 'text-orange-700 dark:text-orange-300'
                            : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          ({mediumLabel})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enrolled Subjects (sorted by exam date) */}
          {candidate.subjects && candidate.subjects.length > 0 && (
            <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Enrolled Subjects
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                  <thead className="bg-secondary-50 dark:bg-secondary-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Exam Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Answer Sheet Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Serial No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Room No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Invigilator 1
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Invigilator 2
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-secondary-900 divide-y divide-secondary-200 dark:divide-secondary-700">
                    {sortedSubjects.map((subject) => (
                      <tr key={subject._id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{subject.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Code: {subject.code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {formatExamDate(subject.examDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {subject.answerSheetType ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {subjectSerials[subject._id]
                            ? subjectSerials[subject._id]
                            : serialsLoading
                              ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-secondary-400" />
                              : (subject.serialNumber ?? '—')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {subject.roomNo ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {subject.invigilator1 ? (
                            <div>
                              <div>{subject.invigilator1.name}</div>
                              {subject.invigilator1.oasisId && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">OASIS: {subject.invigilator1.oasisId}</div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {subject.invigilator2 ? (
                            <div>
                              <div>{subject.invigilator2.name}</div>
                              {subject.invigilator2.oasisId && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">OASIS: {subject.invigilator2.oasisId}</div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Import Information */}
          {candidate.importedFrom && (
            <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Import Information
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Source File
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">
                    📄 {candidate.importedFrom.fileName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Import Date
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">
                    {formatDate(candidate.importedFrom.uploadDate)}
                  </p>
                </div>
                <div>
                  <a
                    href={candidate.importedFrom.cloudinaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Original PDF
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="glass p-6 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Record Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Created
                </label>
                <p className="text-gray-900 dark:text-white text-sm">
                  {formatDate(candidate.createdAt)}
                </p>
                {candidate.createdBy && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    by {candidate.createdBy.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Last Updated
                </label>
                <p className="text-gray-900 dark:text-white text-sm">
                  {formatDate(candidate.updatedAt)}
                </p>
                {candidate.updatedBy && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    by {candidate.updatedBy.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CandidateDetail
