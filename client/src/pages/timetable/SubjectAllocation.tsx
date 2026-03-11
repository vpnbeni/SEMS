import React, { useEffect, useMemo, useState } from 'react'
import {
  useTimetable,
  type TeacherSubjectAllocation,
  type TeacherSubjectClassAssignment,
} from '@/contexts/TimetableContext'
import teacherService, { type Teacher } from '@/services/teacherService'

interface FunctionaryOption {
  id: string
  name: string
  shortName: string
}

interface AssignmentDraftRow {
  rowId: string
  classId: string
  subjects: string[]
}

let rowSeq = 0
const genRowId = () => `alloc-row-${++rowSeq}-${Date.now()}`

const uniqSubjects = (subjects: string[]) => {
  const seen = new Set<string>()
  const deduped: string[] = []

  subjects.forEach((subject) => {
    const trimmed = subject.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    deduped.push(trimmed)
  })

  return deduped
}

const SubjectAllocation: React.FC = () => {
  const { classes, teacherSubjectAllocations, setTeacherSubjectAllocations } = useTimetable()
  const [functionaries, setFunctionaries] = useState<FunctionaryOption[]>([])
  const [loadingFunctionaries, setLoadingFunctionaries] = useState(true)
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [draftRows, setDraftRows] = useState<AssignmentDraftRow[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const classById = useMemo(() => {
    const map = new Map<string, (typeof classes)[number]>()
    classes.forEach((item) => map.set(item.id, item))
    return map
  }, [classes])

  const allocationByTeacher = useMemo(() => {
    const map = new Map<string, TeacherSubjectAllocation>()
    teacherSubjectAllocations.forEach((allocation) => map.set(allocation.teacherId, allocation))
    return map
  }, [teacherSubjectAllocations])

  const selectedTeacher = useMemo(
    () => functionaries.find((item) => item.id === selectedTeacherId) || null,
    [functionaries, selectedTeacherId]
  )

  useEffect(() => {
    let mounted = true

    const loadFunctionaries = async () => {
      setLoadingFunctionaries(true)
      setErrorMessage('')

      try {
        const allTeachers: Teacher[] = []
        let page = 1
        let totalPages = 1

        do {
          const result = await teacherService.getAll({
            page,
            limit: 100,
            isActive: true,
            sort: 'name',
          })
          if (!mounted) return

          allTeachers.push(...result.items)
          totalPages = Math.max(result.totalPages || 1, 1)
          page += 1
        } while (page <= totalPages)

        const mapped = allTeachers
          .map((teacher: Teacher) => {
            const id = String(teacher._id || teacher.id || '').trim()
            if (!id) return null

            return {
              id,
              name: String(teacher.name || '').trim() || 'Unnamed',
              shortName: String(teacher.subjectCode || '').trim(),
            } as FunctionaryOption
          })
          .filter(Boolean) as FunctionaryOption[]

        setFunctionaries(mapped)
      } catch {
        if (!mounted) return
        setErrorMessage('Failed to load exam functionaries.')
      } finally {
        if (mounted) {
          setLoadingFunctionaries(false)
        }
      }
    }

    loadFunctionaries()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (functionaries.length === 0) {
      setSelectedTeacherId('')
      return
    }

    const exists = functionaries.some((item) => item.id === selectedTeacherId)
    if (!selectedTeacherId || !exists) {
      setSelectedTeacherId(functionaries[0].id)
    }
  }, [functionaries, selectedTeacherId])

  useEffect(() => {
    if (!selectedTeacherId) {
      setDraftRows([])
      return
    }

    const existing = allocationByTeacher.get(selectedTeacherId)
    if (!existing) {
      setDraftRows([])
      return
    }

    setDraftRows(
      existing.assignments.map((assignment) => ({
        rowId: genRowId(),
        classId: assignment.classId,
        subjects: [...assignment.subjects],
      }))
    )
  }, [selectedTeacherId, allocationByTeacher])

  const assignmentCountByTeacher = useMemo(() => {
    const map = new Map<string, number>()
    teacherSubjectAllocations.forEach((allocation) => {
      map.set(allocation.teacherId, allocation.assignments.length)
    })
    return map
  }, [teacherSubjectAllocations])

  const addDraftRow = () => {
    setDraftRows((prev) => [...prev, { rowId: genRowId(), classId: '', subjects: [] }])
  }

  const removeDraftRow = (rowId: string) => {
    setDraftRows((prev) => prev.filter((row) => row.rowId !== rowId))
  }

  const updateDraftClass = (rowId: string, classId: string) => {
    setDraftRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row

        const classInfo = classById.get(classId)
        if (!classInfo) {
          return { ...row, classId, subjects: [] }
        }

        const allowed = new Set(classInfo.subjects.map((subject) => subject.toLowerCase()))
        const filteredSubjects = row.subjects.filter((subject) => allowed.has(subject.toLowerCase()))
        return { ...row, classId, subjects: filteredSubjects }
      })
    )
  }

  const toggleDraftSubject = (rowId: string, subject: string) => {
    setDraftRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row

        const exists = row.subjects.some((item) => item.toLowerCase() === subject.toLowerCase())
        if (exists) {
          return {
            ...row,
            subjects: row.subjects.filter((item) => item.toLowerCase() !== subject.toLowerCase()),
          }
        }

        return {
          ...row,
          subjects: [...row.subjects, subject],
        }
      })
    )
  }

  const buildNormalizedAssignments = (): TeacherSubjectClassAssignment[] => {
    const mergedByClass = new Map<string, TeacherSubjectClassAssignment>()

    draftRows.forEach((row) => {
      const classInfo = classById.get(row.classId)
      if (!classInfo) return

      const allowedSubjects = new Set(classInfo.subjects.map((subject) => subject.toLowerCase()))
      const normalizedSubjects = uniqSubjects(row.subjects).filter((subject) =>
        allowedSubjects.has(subject.toLowerCase())
      )
      if (normalizedSubjects.length === 0) return

      const existing = mergedByClass.get(classInfo.id)
      if (!existing) {
        mergedByClass.set(classInfo.id, {
          classId: classInfo.id,
          className: classInfo.className,
          section: classInfo.section,
          subjects: normalizedSubjects,
        })
        return
      }

      existing.subjects = uniqSubjects([...existing.subjects, ...normalizedSubjects])
    })

    return Array.from(mergedByClass.values())
  }

  const handleSave = () => {
    if (!selectedTeacher) return

    setSaving(true)
    const normalizedAssignments = buildNormalizedAssignments()
    const remainingAllocations = teacherSubjectAllocations.filter(
      (allocation) => allocation.teacherId !== selectedTeacher.id
    )

    const nextAllocations =
      normalizedAssignments.length > 0
        ? [
            ...remainingAllocations,
            {
              teacherId: selectedTeacher.id,
              teacherName: selectedTeacher.name,
              assignments: normalizedAssignments,
            },
          ]
        : remainingAllocations

    setTeacherSubjectAllocations(nextAllocations)
    setSaving(false)
  }

  const handleClearTeacher = () => {
    if (!selectedTeacher) return
    setDraftRows([])
    setTeacherSubjectAllocations(
      teacherSubjectAllocations.filter((allocation) => allocation.teacherId !== selectedTeacher.id)
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
        Assign timetable subjects by class and section to exam functionaries.
      </p>

      <div className="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/60">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Subject Allocation</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
            Teacher list is populated from Exam Functionaries. One teacher can have multiple classes and subjects.
          </p>
        </div>

        {errorMessage && (
          <div className="px-5 py-3 text-sm text-error-600 bg-error-50 dark:bg-error-900/20 dark:text-error-300 border-b border-error-100 dark:border-error-900/40">
            {errorMessage}
          </div>
        )}

        {loadingFunctionaries ? (
          <div className="px-5 py-8 text-sm text-secondary-500 dark:text-secondary-400">Loading teachers...</div>
        ) : functionaries.length === 0 ? (
          <div className="px-5 py-8 text-sm text-secondary-500 dark:text-secondary-400">
            No exam functionaries found. Add functionaries first.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-[420px]">
            <div className="border-r border-secondary-200 dark:border-secondary-700 p-3 space-y-2">
              {functionaries.map((teacher) => {
                const isActive = teacher.id === selectedTeacherId
                const assignmentCount = assignmentCountByTeacher.get(teacher.id) || 0
                return (
                  <button
                    key={teacher.id}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 transition ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700'
                        : 'bg-secondary-50 dark:bg-secondary-800/50 border border-transparent hover:border-secondary-200 dark:hover:border-secondary-600'
                    }`}
                  >
                    <div className="text-sm font-semibold text-secondary-900 dark:text-white">{teacher.name}</div>
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">
                      {assignmentCount} class assignment{assignmentCount === 1 ? '' : 's'}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="p-4 md:p-5">
              {selectedTeacher ? (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <div className="text-sm font-semibold text-secondary-900 dark:text-white">{selectedTeacher.name}</div>
                      <div className="text-xs text-secondary-500 dark:text-secondary-400">
                        Assign classes, sections and subjects
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={addDraftRow}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white"
                      >
                        Add Class
                      </button>
                      <button
                        onClick={handleClearTeacher}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border border-error-200 text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-300 dark:hover:bg-error-900/20"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {classes.length === 0 ? (
                    <div className="text-sm text-secondary-500 dark:text-secondary-400">
                      No class/section combinations available. Add classes in Time Table &gt; Classes first.
                    </div>
                  ) : draftRows.length === 0 ? (
                    <div className="text-sm text-secondary-500 dark:text-secondary-400">
                      No subject allocation for this teacher yet. Click <span className="font-semibold">Add Class</span>.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {draftRows.map((row) => {
                        const classInfo = classById.get(row.classId)
                        const classSubjects = classInfo?.subjects || []

                        return (
                          <div
                            key={row.rowId}
                            className="border border-secondary-200 dark:border-secondary-700 rounded-xl p-3"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_auto] gap-3 items-start">
                              <div>
                                <label className="block text-xs font-semibold text-secondary-600 dark:text-secondary-300 mb-1">
                                  Class - Section
                                </label>
                                <select
                                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm"
                                  value={row.classId}
                                  onChange={(e) => updateDraftClass(row.rowId, e.target.value)}
                                >
                                  <option value="">Select class</option>
                                  {classes.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.className} - {item.section}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-secondary-600 dark:text-secondary-300 mb-1">
                                  Subjects
                                </label>
                                {row.classId && classSubjects.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {classSubjects.map((subject) => {
                                      const checked = row.subjects.some(
                                        (item) => item.toLowerCase() === subject.toLowerCase()
                                      )
                                      return (
                                        <label
                                          key={subject}
                                          className={`px-2.5 py-1 rounded-full text-xs border cursor-pointer ${
                                            checked
                                              ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-300'
                                              : 'bg-secondary-50 border-secondary-200 text-secondary-700 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleDraftSubject(row.rowId, subject)}
                                            className="hidden"
                                          />
                                          {subject}
                                        </label>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-xs text-secondary-500 dark:text-secondary-400 pt-2">
                                    {row.classId ? 'Selected class has no subjects.' : 'Select class first.'}
                                  </div>
                                )}
                              </div>

                              <div className="pt-6">
                                <button
                                  onClick={() => removeDraftRow(row.rowId)}
                                  className="px-2.5 py-1.5 text-xs rounded-lg border border-error-200 text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-300 dark:hover:bg-error-900/20"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubjectAllocation
