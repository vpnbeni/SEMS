import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Tabs } from '@/components/common/Tabs'
import exmclExamService, { type ExmclExamDefinition } from '@/services/exmclExamService'
import exmclResultService from '@/services/exmclResultService'
import subjectService from '@/services/subjectService'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useTimetable } from '@/contexts/TimetableContext'
import { STUDENT_CLASS_OPTIONS } from '@/constants/studentClasses'

type ResultTab = 'exam'

type StudentRow = {
  _id: string
  rollNumber: string
  classRollNo?: number | null
  name: string
  class: string
  section: string
  subjects?: Array<{ _id?: string; name?: string } | string>
}

type ClassSectionEntry = {
  _id?: { class?: string; section?: string }
}

type SubjectColumn = {
  id: string
  name: string
}

const tabConfig = [{ id: 'exam' as const, label: 'Exam', color: 'indigo' as const }]

const sortClassNames = (left: string, right: string) =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })

const subjectKey = (name: string) => String(name || '').trim().toLowerCase().replace(/\s+/g, '-')

const extractStudentList = (payload: any): StudentRow[] => {
  if (Array.isArray(payload?.data?.students)) return payload.data.students
  if (Array.isArray(payload?.students)) return payload.students
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const extractSubjectList = (payload: any): Array<{ _id?: string; name?: string; class?: string }> => {
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const ExmclResult: React.FC = () => {
  const { matrixClasses, matrixSections, matrixSelection, classes: timetableClasses } = useTimetable()
  const [activeTab, setActiveTab] = useState<ResultTab>('exam')
  const [loading, setLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [exams, setExams] = useState<ExmclExamDefinition[]>([])
  const [classSectionEntries, setClassSectionEntries] = useState<ClassSectionEntry[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classSubjects, setClassSubjects] = useState<SubjectColumn[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [marksByStudent, setMarksByStudent] = useState<Record<string, Record<string, string>>>({})
  const [deletedSubjectIds, setDeletedSubjectIds] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [examList, statsRes] = await Promise.all([
          exmclExamService.getAll(),
          api.get('/students/stats'),
        ])
        if (cancelled) return

        const byClassSection = Array.isArray(statsRes?.data?.data?.byClassSection)
          ? statsRes.data.data.byClassSection
          : []

        setExams(examList)
        setClassSectionEntries(byClassSection)
        if (examList.length > 0) setSelectedExamId(examList[0]._id)
      } catch (error: any) {
        if (cancelled) return
        const message = String(error?.response?.data?.message || error?.message || 'Failed to load result setup data.')
        setLoadError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const timetableClassOptions = useMemo(
    () =>
      (matrixClasses || [])
        .map((item) => String(item.name || '').trim())
        .filter(Boolean),
    [matrixClasses]
  )

  const classOptions = useMemo(() => {
    const fromStudents = classSectionEntries
      .map((entry) => String(entry?._id?.class || '').trim())
      .filter(Boolean)
    return Array.from(new Set([...STUDENT_CLASS_OPTIONS, ...fromStudents, ...timetableClassOptions])).sort(sortClassNames)
  }, [classSectionEntries, timetableClassOptions])

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return []

    const fromStudents = classSectionEntries
      .filter((entry) => String(entry?._id?.class || '').trim().toLowerCase() === selectedClass.trim().toLowerCase())
      .map((entry) => String(entry?._id?.section || '').trim())
      .filter(Boolean)

    const classRow = (matrixClasses || []).find(
      (item) => String(item.name || '').trim().toLowerCase() === selectedClass.trim().toLowerCase()
    )
    const fromTimetable = classRow
      ? (matrixSections || [])
          .filter((section) => Boolean(matrixSelection?.[classRow.id]?.[section.id]))
          .map((section) => String(section.name || '').trim())
          .filter(Boolean)
      : []

    return Array.from(new Set([...fromStudents, ...fromTimetable])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [classSectionEntries, matrixClasses, matrixSections, matrixSelection, selectedClass])

  const filteredStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const rollA = Number(a.classRollNo) || 0
      const rollB = Number(b.classRollNo) || 0
      if (rollA !== rollB) return rollA - rollB
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    })
  }, [students])

  const allSubjects = useMemo(() => {
    const byKey = new Map<string, SubjectColumn>()

    const addSubject = (name: string, id?: string) => {
      const trimmed = String(name || '').trim()
      if (!trimmed) return
      const key = subjectKey(trimmed)
      if (!key || byKey.has(key)) return
      byKey.set(key, { id: key, name: trimmed })
      if (id && id !== key && !byKey.has(id)) {
        byKey.set(key, { id: key, name: trimmed })
      }
    }

    classSubjects.forEach((subject) => addSubject(subject.name, subject.id))

    if (selectedClass) {
      const classKey = selectedClass.trim().toLowerCase()
      ;(timetableClasses || []).forEach((row) => {
        if (String(row.className || '').trim().toLowerCase() !== classKey) return
        ;(row.subjects || []).forEach((subjectName) => addSubject(String(subjectName)))
      })
    }

    students.forEach((student) => {
      ;(student.subjects || []).forEach((subject) => {
        if (typeof subject === 'string') addSubject(subject)
        else addSubject(String(subject?.name || ''), subject?._id)
      })
    })

    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [classSubjects, selectedClass, students, timetableClasses])

  const filteredSubjects = useMemo(
    () => allSubjects.filter((subject) => !deletedSubjectIds.has(subject.id)),
    [allSubjects, deletedSubjectIds]
  )

  useEffect(() => {
    setSelectedSection('')
  }, [selectedClass])

  useEffect(() => {
    if (selectedSection && sectionOptions.length > 0 && !sectionOptions.includes(selectedSection)) {
      setSelectedSection('')
    }
  }, [selectedSection, sectionOptions])

  useEffect(() => {
    setDeletedSubjectIds(new Set())
  }, [selectedClass, selectedExamId])

  useEffect(() => {
    if (!selectedClass || !selectedSection) {
      setStudents([])
      setClassSubjects([])
      return
    }

    let cancelled = false
    setStudentsLoading(true)

    const loadSheet = async () => {
      try {
        const [studentRes, subjectRes] = await Promise.all([
          api.get('/students', {
            params: {
              page: 1,
              limit: 500,
              class: selectedClass,
              section: selectedSection,
              isActive: true,
              sort: 'classRollNo',
            },
          }),
          subjectService.getAll({ page: 1, limit: 500, class: selectedClass }).catch(() => null),
        ])
        if (cancelled) return

        setStudents(extractStudentList(studentRes?.data))
        setClassSubjects(
          extractSubjectList(subjectRes)
            .filter((subject) => String(subject.class || '').trim().toLowerCase() === selectedClass.trim().toLowerCase() || !subject.class)
            .map((subject) => ({
              id: subjectKey(String(subject.name || '')),
              name: String(subject.name || '').trim(),
            }))
            .filter((subject) => subject.name)
        )
      } catch (error: any) {
        if (cancelled) return
        setStudents([])
        setClassSubjects([])
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load students.'))
      } finally {
        if (!cancelled) setStudentsLoading(false)
      }
    }

    void loadSheet()
    return () => {
      cancelled = true
    }
  }, [selectedClass, selectedSection])

  useEffect(() => {
    if (!selectedExamId || !selectedClass || !selectedSection) {
      setMarksByStudent({})
      return
    }

    let cancelled = false
    exmclResultService
      .getResults(selectedExamId, selectedClass, selectedSection)
      .then((entries) => {
        if (cancelled) return
        const loaded: Record<string, Record<string, string>> = {}
        for (const entry of entries) {
          const sid = String(entry.studentId)
          loaded[sid] = {}
          for (const [subjectId, value] of Object.entries(entry.marks || {})) {
            loaded[sid][subjectId] = value !== null && value !== undefined ? String(value) : ''
          }
        }
        setMarksByStudent(loaded)
      })
      .catch(() => {
        if (!cancelled) setMarksByStudent({})
      })

    return () => {
      cancelled = true
    }
  }, [selectedExamId, selectedClass, selectedSection])

  const updateMark = (studentId: string, subjectId: string, value: string) => {
    if (value !== '' && !/^\d{0,3}(\.\d{0,2})?$/.test(value)) return
    setMarksByStudent((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: value,
      },
    }))
  }

  const deleteSubject = useCallback((subjectId: string) => {
    setDeletedSubjectIds((prev) => new Set([...prev, subjectId]))
  }, [])

  const handleSave = async () => {
    if (!selectedExamId || !selectedClass || !selectedSection) return
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const results = filteredStudents.map((student) => ({
        studentId: student._id,
        marks: Object.fromEntries(
          filteredSubjects
            .map((subject) => {
              const raw = marksByStudent[student._id]?.[subject.id] ?? ''
              const num = raw === '' ? null : Number(raw)
              return [subject.id, num] as [string, number | null]
            })
            .filter(([, value]) => value !== null)
        ) as Record<string, number>,
      }))

      await exmclResultService.saveResults({
        examId: selectedExamId,
        class: selectedClass,
        section: selectedSection,
        results,
      })

      toast.success('Results saved successfully.')
    } catch (error: any) {
      const message = String(error?.response?.data?.message || error?.message || 'Failed to save results.')
      toast.error(message)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const canSave = Boolean(selectedExamId && selectedClass && selectedSection && filteredStudents.length > 0)

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <Tabs<ResultTab>
            tabs={tabConfig}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pill"
            size="sm"
            ariaLabel="Result mode"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:mx-4">
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
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <select
              title="Select section"
              aria-label="Select section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              disabled={!selectedClass}
            >
              <option value="">{selectedClass ? 'Section' : 'Select class first'}</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Result Entry</h3>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
            >
              {saving ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                'Save Results'
              )}
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading result sheet...</div>
          ) : loadError ? (
            <div className="p-10 text-center text-sm text-red-600 dark:text-red-400">{loadError}</div>
          ) : !selectedExamId || !selectedClass || !selectedSection ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Select Exam, Class, and Section to load students and enter marks.
            </div>
          ) : studentsLoading ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading students...</div>
          ) : filteredSubjects.length === 0 && allSubjects.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No subjects found for the selected class. Assign subjects to students or add them in Subjects.
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              All subject columns have been removed. Change class or exam to reset.
            </div>
          ) : (
            <table className="min-w-[1100px] w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-40 bg-gray-50/95 backdrop-blur dark:bg-gray-900/95">
                <tr>
                  <th className="sticky left-0 z-50 w-[110px] min-w-[110px] bg-gray-50/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-900/95 dark:text-gray-400">
                    Adm. No.
                  </th>
                  <th className="sticky left-[110px] z-50 w-[80px] min-w-[80px] bg-gray-50/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-900/95 dark:text-gray-400">
                    Roll No
                  </th>
                  <th className="sticky left-[190px] z-50 w-[220px] min-w-[220px] bg-gray-50/95 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-900/95 dark:text-gray-400">
                    Student Name
                  </th>
                  {filteredSubjects.map((subject) => (
                    <th
                      key={subject.id}
                      className="group px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{subject.name}</span>
                        <button
                          onClick={() => deleteSubject(subject.id)}
                          title="Remove from result entry"
                          className="invisible group-hover:visible flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + filteredSubjects.length}
                      className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                    >
                      No students found for class {selectedClass}, section {selectedSection}. Add them in Student Management.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="sticky left-0 z-20 w-[110px] min-w-[110px] bg-white px-4 py-3 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white">
                        {student.rollNumber}
                      </td>
                      <td className="sticky left-[110px] z-20 w-[80px] min-w-[80px] bg-white px-4 py-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-white">
                        {student.classRollNo || '—'}
                      </td>
                      <td className="sticky left-[190px] z-20 w-[220px] min-w-[220px] bg-white px-4 py-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-white">
                        {student.name}
                      </td>
                      {filteredSubjects.map((subject) => (
                        <td key={`${student._id}-${subject.id}`} className="px-4 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            title={`Marks for ${student.name} in ${subject.name}`}
                            value={marksByStudent[student._id]?.[subject.id] ?? ''}
                            onChange={(e) => updateMark(student._id, subject.id, e.target.value)}
                            placeholder="0"
                            className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExmclResult
