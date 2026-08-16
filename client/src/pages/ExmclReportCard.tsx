import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Eye } from 'lucide-react'
import exmclExamService, { type ExmclExamDefinition } from '@/services/exmclExamService'
import exmclReportCardService from '@/services/exmclReportCardService'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useTimetable } from '@/contexts/TimetableContext'
import { sortSectionNames } from '@/constants/studentClasses'

type StudentRow = {
  _id: string
  rollNumber: string
  name: string
  class: string
  section: string
}

const ExmclReportCard: React.FC = () => {
  const { matrixClasses, matrixSections, matrixSelection } = useTimetable()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exams, setExams] = useState<ExmclExamDefinition[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])

  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [previewingIds, setPreviewingIds] = useState<Set<string>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [examList, studentRes] = await Promise.all([
          exmclExamService.getAll(),
          api.get('/students', { params: { page: 1, limit: 100, isActive: true } }),
        ])
        if (cancelled) return
        const studentList = Array.isArray(studentRes?.data?.data?.students)
          ? studentRes.data.data.students
          : []
        setExams(examList)
        setStudents(studentList)
        if (examList.length > 0) setSelectedExamId(examList[0]._id)
      } catch (error: any) {
        if (cancelled) return
        const message = String(error?.response?.data?.message || error?.message || 'Failed to load data.')
        setLoadError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const classOptions = useMemo(
    () =>
      matrixClasses
        .map((item) => String(item.name || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [matrixClasses]
  )

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return []
    const classRow = matrixClasses.find(
      (item) => String(item.name || '').trim().toLowerCase() === selectedClass.trim().toLowerCase()
    )
    if (!classRow) return []
    return matrixSections
      .filter((section) => Boolean(matrixSelection[classRow.id]?.[section.id]))
      .map((section) => String(section.name || '').trim())
      .filter(Boolean)
      .sort((a, b) => sortSectionNames(a, b, selectedClass))
  }, [matrixClasses, matrixSections, matrixSelection, selectedClass])

  useEffect(() => { setSelectedSection('') }, [selectedClass])
  useEffect(() => {
    if (selectedClass && !classOptions.includes(selectedClass)) {
      setSelectedClass('')
      setSelectedSection('')
    }
  }, [selectedClass, classOptions])
  useEffect(() => {
    if (selectedSection && !sectionOptions.includes(selectedSection)) setSelectedSection('')
  }, [selectedSection, sectionOptions])

  const filteredStudents = useMemo(() => {
    const classKey = selectedClass.trim().toLowerCase()
    const sectionKey = selectedSection.trim().toLowerCase()
    return students
      .filter((s) => {
        if (!classKey || !sectionKey) return false
        return (
          String(s.class || '').trim().toLowerCase() === classKey &&
          String(s.section || '').trim().toLowerCase() === sectionKey
        )
      })
      .sort((a, b) =>
        String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true })
      )
  }, [students, selectedClass, selectedSection])

  // Reset selection when filters change
  useEffect(() => { setSelectedIds(new Set()) }, [selectedExamId, selectedClass, selectedSection])

  const allSelected = filteredStudents.length > 0 && selectedIds.size === filteredStudents.length
  const someSelected = selectedIds.size > 0

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(filteredStudents.map((s) => s._id)))
  }, [allSelected, filteredStudents])

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleDownloadSingle = useCallback(async (student: StudentRow) => {
    if (!selectedExamId) return
    setDownloadingIds((prev) => new Set([...prev, student._id]))
    try {
      await exmclReportCardService.downloadSingle(selectedExamId, student._id, student.name)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to generate report card.'))
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(student._id)
        return next
      })
    }
  }, [selectedExamId])

  const handlePreviewSingle = useCallback(async (student: StudentRow) => {
    if (!selectedExamId) return
    setPreviewingIds((prev) => new Set([...prev, student._id]))
    try {
      await exmclReportCardService.previewSingle(selectedExamId, student._id)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to preview report card.'))
    } finally {
      setPreviewingIds((prev) => {
        const next = new Set(prev)
        next.delete(student._id)
        return next
      })
    }
  }, [selectedExamId])

  const handleDownloadBulk = useCallback(async () => {
    if (!selectedExamId || !selectedClass || !selectedSection) return
    setBulkDownloading(true)
    try {
      await exmclReportCardService.downloadBulk(selectedExamId, selectedClass, selectedSection)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to generate bulk report cards.'))
    } finally {
      setBulkDownloading(false)
    }
  }, [selectedExamId, selectedClass, selectedSection])

  const canDownloadBulk = Boolean(selectedExamId && selectedClass && selectedSection && someSelected)
  const filtersComplete = Boolean(selectedExamId && selectedClass && selectedSection)

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Header / Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <select
              title="Select exam"
              aria-label="Select exam"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Exam</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.code} - {exam.name}
                </option>
              ))}
            </select>
            <select
              title="Select class"
              aria-label="Select class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="min-w-[130px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Class</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              title="Select section"
              aria-label="Select section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass}
              className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Section</option>
              {sectionOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Report Card</h3>
            <button
              onClick={handleDownloadBulk}
              disabled={!canDownloadBulk || bulkDownloading}
              title={!canDownloadBulk ? 'Select students to download' : `Download ${selectedIds.size} report card(s)`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
            >
              {bulkDownloading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download {someSelected ? `(${selectedIds.size})` : 'All'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : loadError ? (
            <div className="p-10 text-center text-sm text-red-600 dark:text-red-400">{loadError}</div>
          ) : !filtersComplete ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Select Exam, Class, and Section to load students.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No students found for this class-section.
            </div>
          ) : (
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur dark:bg-gray-900/95">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all students"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Adm. No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Section
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Report Card
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {filteredStudents.map((student) => {
                  const isChecked = selectedIds.has(student._id)
                  const isDownloading = downloadingIds.has(student._id)
                  const isPreviewing = previewingIds.has(student._id)
                  return (
                    <tr
                      key={student._id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isChecked ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${student.name}`}
                          checked={isChecked}
                          onChange={() => toggleOne(student._id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {student.rollNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {student.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {student.class}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {student.section}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handlePreviewSingle(student)}
                            disabled={isPreviewing || !selectedExamId}
                            title="Preview report card PDF"
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            {isPreviewing ? (
                              <>
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Previewing...
                              </>
                            ) : (
                              <>
                                <Eye size={12} />
                                Preview
                              </>
                            )}
                          </button>

                        <button
                          onClick={() => handleDownloadSingle(student)}
                          disabled={isDownloading || !selectedExamId}
                          title="Download report card PDF"
                          className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        >
                          {isDownloading ? (
                            <>
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              Generating…
                            </>
                          ) : (
                            <>
                              <Download size={12} />
                              Download
                            </>
                          )}
                        </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer count */}
        {filtersComplete && filteredStudents.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</span>
            {someSelected && (
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExmclReportCard
