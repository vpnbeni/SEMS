import React, { useState } from 'react'
import { TodaysExamsResponse, TodaysExam } from '@/services/dashboardService'

interface TodaysExamsProps {
  data: TodaysExamsResponse | undefined
  isLoading: boolean
  isError: boolean
}

// Map answer sheet type to display text
const getAnswerSheetDisplay = (type: string): string => {
  const mapping: Record<string, string> = {
    '32_pages': '32 Pages (Plain)',
    '20_pages': '20 Pages',
    '40_graph': '40 Pages (Graph)',
    'drawing_sheets': 'Drawing Sheets'
  }
  return mapping[type] || type
}

// Get class color scheme
const getClassColors = (classValue: string) => {
  const normalized = String(classValue).replace(/th$/i, '')
  if (normalized === '10') {
    return {
      badge: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
      border: 'border-l-primary-500',
      icon: 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
    }
  }
  // Class 12 - green/success
  return {
    badge: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
    border: 'border-l-success-500',
    icon: 'bg-success-100 dark:bg-success-900 text-success-600 dark:text-success-400'
  }
}

const ExamCard: React.FC<{ exam: TodaysExam }> = ({ exam }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const colors = getClassColors(exam.class)

  return (
    <div className={`card border-l-4 ${colors.border} hover:shadow-elegant transition-all duration-300`}>
      <div className="card-content">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.badge}`}>
                Class {String(exam.class).replace(/th$/i, '')}
              </span>
              <span className="text-xs text-secondary-500 dark:text-secondary-400">
                {exam.subjectCode}
              </span>
            </div>
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
              {exam.subjectName}
            </h3>
          </div>
          <div className={`p-2 rounded-lg ${colors.icon}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        {/* Time and Duration */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-secondary-600 dark:text-secondary-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{exam.timeSlot?.start || '10:30'} - {exam.timeSlot?.end || '13:30'}</span>
          </div>
          <div className="text-secondary-500 dark:text-secondary-400">
            {exam.duration ? `${exam.duration} min` : ''}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{exam.candidateCount}</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Candidates</p>
          </div>
          <div className="text-center p-2 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{exam.roomsUsed}</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Rooms</p>
          </div>
          <div className="text-center p-2 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
            <p className="text-xs font-medium text-secondary-900 dark:text-white leading-tight">
              {getAnswerSheetDisplay(exam.answerSheetType)}
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Answer Sheet</p>
          </div>
        </div>

        {/* Room Details Toggle */}
        {exam.rooms && exam.rooms.length > 0 && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-2 text-sm text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 rounded-lg transition-colors"
            >
              <span>Room Details</span>
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1">
                {exam.rooms.map((room, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        Room {room.roomNo}
                      </span>
                      {room.roomName && (
                        <span className="text-secondary-500 dark:text-secondary-400">
                          ({room.roomName})
                        </span>
                      )}
                    </div>
                    <span className="text-secondary-600 dark:text-secondary-400">
                      {room.candidates} candidates
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const TodaysExams: React.FC<TodaysExamsProps> = ({ data, isLoading, isError }) => {
  if (isLoading) {
    return (
      <div className="card mb-8">
        <div className="card-header">
          <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-secondary-100 dark:bg-secondary-800 rounded w-32 mt-2 animate-pulse"></div>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="card-content">
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-20 mb-2"></div>
                  <div className="h-5 bg-secondary-200 dark:bg-secondary-700 rounded w-full mb-3"></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-12 bg-secondary-100 dark:bg-secondary-800 rounded"></div>
                    <div className="h-12 bg-secondary-100 dark:bg-secondary-800 rounded"></div>
                    <div className="h-12 bg-secondary-100 dark:bg-secondary-800 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card mb-8 border-l-4 border-l-danger-500">
        <div className="card-content">
          <div className="flex items-center gap-3 text-danger-600 dark:text-danger-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Failed to load today's exams. Please try again.</span>
          </div>
        </div>
      </div>
    )
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Today's Exams
          </h2>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            {data?.examDate ? formatDisplayDate(data.examDate) : ''}
          </p>
        </div>
        {data && data.totalExams > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{data.totalExams}</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Total Exams</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{data.totalCandidates}</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Total Candidates</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {!data || data.exams.length === 0 ? (
        <div className="card">
          <div className="card-content">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
                No Exams Scheduled for Today
              </h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                There are no examinations scheduled for {data?.dayName || 'today'}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.exams.map((exam) => (
            <ExamCard key={exam._id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TodaysExams
