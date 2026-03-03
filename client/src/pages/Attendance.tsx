import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Tabs } from '../components/common/Tabs'
import type { TabConfig } from '../components/common/Tabs'
import { useCandidates } from '../hooks/useCandidates'
import { useCentreDatesheetEntries } from '../hooks/useSeatingPlan'
import api, { uploadFile } from '../services/api'

type ClassTab = 'classX' | 'classXII'

interface ExamColumn {
  date: string
  subjectCode: string
  key: string // unique key: date|subjectCode
}

interface DateGroup {
  date: string
  columns: ExamColumn[]
}

const Attendance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ClassTab>('classX')
  // Tracks absent candidates: absentees[candidateId][colKey] = true means ABSENT
  const [absentees, setAbsentees] = useState<Record<string, Record<string, boolean>>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadedAbsentees, setLoadedAbsentees] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch candidates for both classes (Candidate model stores '10th'/'12th')
  const { data: classXData, isLoading: loadingX } = useCandidates({ class: '10th', limit: 1000 })
  const { data: classXIIData, isLoading: loadingXII } = useCandidates({ class: '12th', limit: 1000 })

  // Fetch centre datesheet entries
  const { data: datesheetEntries = [], isLoading: loadingDatesheet } = useCentreDatesheetEntries()

  const classXCandidates = classXData?.data ?? []
  const classXIICandidates = classXIIData?.data ?? []

  // Build columns: one per (date, subjectCode) pair, grouped by date for header spanning
  const classXDateGroups = useMemo(() => buildDateGroups(datesheetEntries, '10'), [datesheetEntries])
  const classXIIDateGroups = useMemo(() => buildDateGroups(datesheetEntries, '12'), [datesheetEntries])

  // Flat list of all columns for iteration
  const classXColumns = useMemo(() => classXDateGroups.flatMap(g => g.columns), [classXDateGroups])
  const classXIIColumns = useMemo(() => classXIIDateGroups.flatMap(g => g.columns), [classXIIDateGroups])

  // Current tab data
  const candidates = activeTab === 'classX' ? classXCandidates : classXIICandidates
  const dateGroups = activeTab === 'classX' ? classXDateGroups : classXIIDateGroups
  const columns = activeTab === 'classX' ? classXColumns : classXIIColumns
  const isLoading = activeTab === 'classX' ? loadingX : loadingXII

  // Load absentees from API on mount
  useEffect(() => {
    const loadAbsentees = async () => {
      try {
        const res = await api.get('/attendance/absentees')
        const records: { candidateId: string; examDate: string; subjectCode: string }[] = res.data?.data ?? []
        const map: Record<string, Record<string, boolean>> = {}
        records.forEach(r => {
          const key = `${r.examDate}|${r.subjectCode}`
          if (!map[r.candidateId]) map[r.candidateId] = {}
          map[r.candidateId][key] = true
        })
        setAbsentees(map)
        setLoadedAbsentees(true)
      } catch {
        // Silently fail — user can still mark attendance
        setLoadedAbsentees(true)
      }
    }
    loadAbsentees()
  }, [])

  // Filter by search
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates
    const q = searchQuery.toLowerCase()
    return candidates.filter(c =>
      c.rollNumber?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q)
    )
  }, [candidates, searchQuery])

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('en-US', { month: 'short' })
    return `${day} ${month}`
  }

  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', { weekday: 'short' })
  }

  // Toggle absent status
  const toggleAbsent = (candidateId: string, colKey: string) => {
    setAbsentees(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [colKey]: !prev[candidateId]?.[colKey],
      },
    }))
  }

  // Save absentees to API
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Collect ALL candidate+column pairs into a flat array
      const allCandidates = [...classXCandidates, ...classXIICandidates]

      const payload: { candidateId: string; examDate: string; subjectCode: string; class: string; isAbsent: boolean }[] = []

      allCandidates.forEach(candidate => {
        const candidateClass = candidate.class === '10th' ? 'X' : 'XII'
        const relevantColumns = candidateClass === 'X' ? classXColumns : classXIIColumns

        relevantColumns.forEach(col => {
          // Check if candidate has this subject
          const hasSubject = candidate.subjectCodes?.some((item: any) => {
            const code = typeof item === 'string' ? item : item.code
            return code === col.subjectCode
          }) ?? false

          if (!hasSubject) return

          const isAbsent = absentees[candidate._id]?.[col.key] ?? false
          payload.push({
            candidateId: candidate._id,
            examDate: col.date,
            subjectCode: col.subjectCode,
            class: candidateClass,
            isAbsent,
          })
        })
      })

      await api.post('/attendance/absentees', { absentees: payload })
      toast.success('Attendance saved successfully')
    } catch {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }, [absentees, classXCandidates, classXIICandidates, classXColumns, classXIIColumns])

  // Upload attendance sheet
  const handleUpload = useCallback(async (file: File) => {
    const classValue = activeTab === 'classX' ? 'X' : 'XII'
    setUploading(true)
    try {
      const response = await uploadFile('/attendance/upload', file, { class: classValue })
      toast.success(response.data?.message || `Attendance sheet uploaded for Class ${classValue}`)
    } catch {
      toast.error('Failed to upload attendance sheet')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [activeTab])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  // Tab configuration
  const tabs: TabConfig<ClassTab>[] = [
    {
      id: 'classX',
      label: 'Class X',
      badge: classXCandidates.length || undefined,
      color: 'blue',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'classXII',
      label: 'Class XII',
      badge: classXIICandidates.length || undefined,
      color: 'emerald',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ]

  // Count present per column (candidates with subject minus absent)
  const getPresentCount = (col: ExamColumn) => {
    const candidatesWithSubject = filteredCandidates.filter(c =>
      c.subjectCodes?.some((item: any) => {
        const code = typeof item === 'string' ? item : item.code
        return code === col.subjectCode
      })
    )
    const absentCount = candidatesWithSubject.filter(c => absentees[c._id]?.[col.key]).length
    return { present: candidatesWithSubject.length - absentCount, total: candidatesWithSubject.length }
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Tabs + Actions + Search */}
        <div className="px-6 pt-4 flex items-center justify-between gap-4">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pill"
            size="md"
            ariaLabel="Class selection"
          />

          {/* Action buttons + search */}
          <div className="flex items-center gap-2">
            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={onFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Upload attendance sheet for ${activeTab === 'classX' ? 'Class X' : 'Class XII'}`}
            >
              {uploading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              Upload
            </button>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save attendance"
            >
              {saving ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Save
            </button>

            {/* Search — shrunk to ~40% of original */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-28"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          {(isLoading || loadingDatesheet || !loadedAbsentees) ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading data...</span>
              </div>
            </div>
          ) : filteredCandidates.length === 0 || columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                {filteredCandidates.length === 0 ? 'No candidates found' : 'No exam dates found'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredCandidates.length === 0
                  ? `No candidates available for ${activeTab === 'classX' ? 'Class X' : 'Class XII'}. Import candidates first.`
                  : `No datesheet entries found for ${activeTab === 'classX' ? 'Class X' : 'Class XII'}. Import the datesheet first.`}
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    {/* Date header row - spans across subject columns for same date */}
                    <tr>
                      <th rowSpan={2} className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[48px]">
                        #
                      </th>
                      <th rowSpan={2} className="sticky left-[48px] z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[140px]">
                        Roll No.
                      </th>
                      <th rowSpan={2} className="sticky left-[188px] z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[180px]">
                        Name
                      </th>
                      {dateGroups.map(group => (
                        <th
                          key={group.date}
                          colSpan={group.columns.length}
                          className={`px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[90px] ${group.columns.length > 1 ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-gray-900 dark:text-white font-bold text-sm normal-case">{formatDate(group.date)}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDay(group.date)}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                    {/* Subject code row - one cell per subject */}
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      {columns.map((col, idx) => {
                        // Add left border if this is the first column of a date group with multiple subjects
                        const isFirstInGroup = idx === 0 || columns[idx - 1].date !== col.date
                        const groupCols = dateGroups.find(g => g.date === col.date)?.columns ?? []
                        const needsBorder = isFirstInGroup && groupCols.length > 1
                        return (
                          <th
                            key={col.key}
                            className={`bg-gray-100 dark:bg-gray-900/70 px-3 py-2 text-center text-[11px] font-medium text-primary-600 dark:text-primary-400 tracking-wide min-w-[90px] ${needsBorder ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
                          >
                            {col.subjectCode}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                    {filteredCandidates.map((candidate, index) => (
                      <tr
                        key={candidate._id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-700/50 font-mono">
                          {index + 1}
                        </td>
                        <td className="sticky left-[48px] z-10 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700/50 font-mono">
                          {candidate.rollNumber}
                        </td>
                        <td className="sticky left-[188px] z-10 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700/50 truncate max-w-[180px]">
                          {candidate.name}
                        </td>
                        {columns.map((col, idx) => {
                          const isAbsent = absentees[candidate._id]?.[col.key] ?? false
                          const isFirstInGroup = idx === 0 || columns[idx - 1].date !== col.date
                          const groupCols = dateGroups.find(g => g.date === col.date)?.columns ?? []
                          const needsBorder = isFirstInGroup && groupCols.length > 1
                          // Check if candidate has this subject code
                          const hasSubject = candidate.subjectCodes?.some((item: any) => {
                            const code = typeof item === 'string' ? item : item.code
                            return code === col.subjectCode
                          }) ?? false
                          return (
                            <td
                              key={col.key}
                              className={`px-3 py-3 text-center ${needsBorder ? 'border-l border-gray-100 dark:border-gray-700/50' : ''}`}
                            >
                              {hasSubject ? (
                                <button
                                  onClick={() => toggleAbsent(candidate._id, col.key)}
                                  className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                                    isAbsent
                                      ? 'bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/25'
                                      : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-gray-400 dark:hover:border-gray-500'
                                  }`}
                                  title={isAbsent ? 'Mark present' : 'Mark absent'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              ) : (
                                <div
                                  className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                                  title="Candidate does not have this subject"
                                />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer summary row */}
                  <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <td colSpan={3} className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                        Present
                      </td>
                      {columns.map((col, idx) => {
                        const { present, total } = getPresentCount(col)
                        const isFirstInGroup = idx === 0 || columns[idx - 1].date !== col.date
                        const groupCols = dateGroups.find(g => g.date === col.date)?.columns ?? []
                        const needsBorder = isFirstInGroup && groupCols.length > 1
                        return (
                          <td key={col.key} className={`px-3 py-3 text-center text-sm ${needsBorder ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}>
                            <span className={`font-semibold ${present > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {present}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">/{total}</span>
                          </td>
                        )
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Build date groups with individual subject columns, sorted by date then subject code */
function buildDateGroups(
  entries: { examDate: string; subjectCode: string; class: string }[],
  classFilter: string
): DateGroup[] {
  const map = new Map<string, Set<string>>()

  entries
    .filter(e => e.class === classFilter)
    .forEach(e => {
      if (!map.has(e.examDate)) map.set(e.examDate, new Set())
      map.get(e.examDate)!.add(e.subjectCode)
    })

  const sortedDates = [...map.keys()].sort()

  return sortedDates.map(date => {
    const codes = [...map.get(date)!].sort()
    return {
      date,
      columns: codes.map(code => ({
        date,
        subjectCode: code,
        key: `${date}|${code}`,
      })),
    }
  })
}

export default Attendance
