import React, { useEffect, useMemo, useState } from 'react'
import {
  useTimetable,
  type TimetableClass,
  type TimetableTeacher,
  type TeacherSubjectAllocation,
} from '@/contexts/TimetableContext'
import teacherService, { type Teacher } from '@/services/teacherService'

interface StaffTeacherRow {
  id: string
  name: string
  shortName: string
  staffSubjects: string[]
}

const normalize = (value: string) => value.trim().toLowerCase()

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ')

const uniqueByNormalized = (values: string[]) => {
  const seen = new Set<string>()
  const output: string[] = []

  values.forEach((value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const key = normalize(trimmed)
    if (seen.has(key)) return
    seen.add(key)
    output.push(trimmed)
  })

  return output
}

const extractTeacherSubjects = (teacher: Teacher): string[] => {
  const rawList = Array.isArray(teacher.subjects) ? teacher.subjects : []
  const values = rawList
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') return entry.name || entry.code || ''
      return ''
    })
    .filter(Boolean)

  return uniqueByNormalized(values)
}

const cloneAllocations = (allocations: TeacherSubjectAllocation[]) =>
  allocations.map((allocation) => ({
    ...allocation,
    assignments: allocation.assignments.map((assignment) => ({
      ...assignment,
      subjects: [...assignment.subjects],
    })),
  }))

const removeSubjectFromTeacherAllocations = (
  allocations: TeacherSubjectAllocation[],
  teacherId: string,
  subjectName: string
) => {
  const key = normalize(subjectName)
  const next = cloneAllocations(allocations)
  const teacherIndex = next.findIndex((allocation) => allocation.teacherId === teacherId)
  if (teacherIndex < 0) return allocations

  const allocation = next[teacherIndex]
  allocation.assignments = allocation.assignments
    .map((assignment) => ({
      ...assignment,
      subjects: assignment.subjects.filter((subject) => normalize(subject) !== key),
    }))
    .filter((assignment) => assignment.subjects.length > 0)

  if (allocation.assignments.length === 0) {
    next.splice(teacherIndex, 1)
  } else {
    next[teacherIndex] = allocation
  }

  return next
}

const Departments: React.FC = () => {
  const {
    classes,
    subjects,
    teachers,
    setTeachers,
    periodAllocation,
    teacherSubjectAllocations,
    setTeacherSubjectAllocations,
  } = useTimetable()

  const [staffTeachers, setStaffTeachers] = useState<StaffTeacherRow[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchText, setSearchText] = useState('')

  const subjectNames = useMemo(
    () => uniqueByNormalized(subjects.map((subject) => subject.name)).sort((a, b) => a.localeCompare(b)),
    [subjects]
  )

  const subjectAliasMap = useMemo(() => {
    const map = new Map<string, string>()
    subjectNames.forEach((name) => map.set(normalize(name), name))
    return map
  }, [subjectNames])

  useEffect(() => {
    let mounted = true

    const loadStaff = async () => {
      setLoadingStaff(true)
      setErrorMessage('')

      try {
        const allRows: StaffTeacherRow[] = []
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

          result.items.forEach((teacher) => {
            const id = String(teacher._id || teacher.id || '').trim()
            if (!id) return
            allRows.push({
              id,
              name: String(teacher.name || '').trim() || 'Unnamed',
              shortName: String(teacher.subjectCode || '').trim(),
              staffSubjects: extractTeacherSubjects(teacher),
            })
          })

          totalPages = Math.max(result.totalPages || 1, 1)
          page += 1
        } while (page <= totalPages)

        setStaffTeachers(allRows)
      } catch {
        if (!mounted) return
        setErrorMessage('Failed to load staff teachers.')
      } finally {
        if (mounted) {
          setLoadingStaff(false)
        }
      }
    }

    loadStaff()
    return () => {
      mounted = false
    }
  }, [])

  const teachersById = useMemo(() => {
    const map = new Map<string, TimetableTeacher>()
    teachers.forEach((teacher) => map.set(String(teacher.id), teacher))
    return map
  }, [teachers])

  const matrixTeachers = useMemo<TimetableTeacher[]>(() => {
    return staffTeachers.map((staffRow) => {
      const existing = teachersById.get(staffRow.id)
      const preferred = existing?.subjects?.length ? existing.subjects : staffRow.staffSubjects
      const resolvedSubjects = uniqueByNormalized(
        preferred
          .map((subject) => subjectAliasMap.get(normalize(subject)) || '')
          .filter(Boolean)
      )

      return {
        id: staffRow.id,
        name: staffRow.name,
        shortName: staffRow.shortName,
        subjects: resolvedSubjects,
      }
    })
  }, [staffTeachers, teachersById, subjectAliasMap])

  useEffect(() => {
    if (loadingStaff) return
    if (subjectNames.length === 0) return

    const changed =
      matrixTeachers.length !== teachers.length ||
      matrixTeachers.some((row) => {
        const current = teachersById.get(row.id)
        if (!current) return true
        if (current.name !== row.name || current.shortName !== row.shortName) return true
        const currentSubjects = uniqueByNormalized(current.subjects || []).map(normalize).sort()
        const nextSubjects = uniqueByNormalized(row.subjects || []).map(normalize).sort()
        return currentSubjects.join('|') !== nextSubjects.join('|')
      })

    if (changed) {
      setTeachers(matrixTeachers)
    }
  }, [loadingStaff, subjectNames, matrixTeachers, teachers.length, teachersById, setTeachers])

  const searchableTeachers = useMemo(() => {
    const needle = searchText.trim().toLowerCase()
    if (!needle) return matrixTeachers
    return matrixTeachers.filter((teacher) => {
      const haystack = `${teacher.name} ${teacher.shortName}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [matrixTeachers, searchText])

  const allocationByTeacher = useMemo(() => {
    const map = new Map<string, TeacherSubjectAllocation>()
    teacherSubjectAllocations.forEach((allocation) => map.set(allocation.teacherId, allocation))
    return map
  }, [teacherSubjectAllocations])

  const classesBySubject = useMemo(() => {
    const map = new Map<string, TimetableClass[]>()
    subjectNames.forEach((subjectName) => {
      map.set(
        subjectName,
        classes.filter((item) => item.subjects.some((subject) => normalize(subject) === normalize(subjectName)))
      )
    })
    return map
  }, [classes, subjectNames])

  const getClassPeriodCount = (classId: string, subjectName: string) => {
    const counts = periodAllocation[classId] || {}
    for (const key of Object.keys(counts)) {
      if (normalize(key) === normalize(subjectName)) {
        return Number(counts[key]) || 0
      }
    }
    return 0
  }

  const getTeacherSubjectAssignments = (teacherId: string, subjectName: string) => {
    const allocation = allocationByTeacher.get(teacherId)
    if (!allocation) return new Set<string>()

    const assignedClassIds = new Set<string>()
    allocation.assignments.forEach((assignment) => {
      if (assignment.subjects.some((subject) => normalize(subject) === normalize(subjectName))) {
        assignedClassIds.add(assignment.classId)
      }
    })
    return assignedClassIds
  }

  const getTeacherWorkload = (teacherId: string, subjectName: string) => {
    const classIds = getTeacherSubjectAssignments(teacherId, subjectName)
    let load = 0
    classIds.forEach((classId) => {
      load += getClassPeriodCount(classId, subjectName)
    })
    return load
  }

  const handleToggleMatrix = (teacherId: string, subjectName: string) => {
    const key = normalize(subjectName)
    const nextTeachers = teachers.map((teacher) => {
      if (teacher.id !== teacherId) return teacher
      const hasSubject = teacher.subjects.some((subject) => normalize(subject) === key)
      const nextSubjects = hasSubject
        ? teacher.subjects.filter((subject) => normalize(subject) !== key)
        : [...teacher.subjects, subjectName]
      return {
        ...teacher,
        subjects: uniqueByNormalized(nextSubjects),
      }
    })

    setTeachers(nextTeachers)

    const after = nextTeachers.find((teacher) => teacher.id === teacherId)
    const stillHasSubject = after?.subjects.some((subject) => normalize(subject) === key)

    if (!stillHasSubject) {
      setTeacherSubjectAllocations(
        removeSubjectFromTeacherAllocations(teacherSubjectAllocations, teacherId, subjectName)
      )
    }
  }

  const handleToggleDepartmentClass = (
    teacher: TimetableTeacher,
    subjectName: string,
    classRow: TimetableClass
  ) => {
    const key = normalize(subjectName)
    const next = cloneAllocations(teacherSubjectAllocations)
    let allocationIndex = next.findIndex((allocation) => allocation.teacherId === teacher.id)

    if (allocationIndex < 0) {
      next.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        assignments: [],
      })
      allocationIndex = next.length - 1
    }

    const allocation = next[allocationIndex]
    allocation.teacherName = teacher.name
    let assignmentIndex = allocation.assignments.findIndex((assignment) => assignment.classId === classRow.id)

    if (assignmentIndex < 0) {
      allocation.assignments.push({
        classId: classRow.id,
        className: classRow.className,
        section: classRow.section,
        subjects: [],
      })
      assignmentIndex = allocation.assignments.length - 1
    }

    const assignment = allocation.assignments[assignmentIndex]
    const alreadyAssigned = assignment.subjects.some((subject) => normalize(subject) === key)

    if (alreadyAssigned) {
      assignment.subjects = assignment.subjects.filter((subject) => normalize(subject) !== key)
    } else {
      assignment.subjects = uniqueByNormalized([...assignment.subjects, subjectName])
    }

    allocation.assignments = allocation.assignments.filter((item) => item.subjects.length > 0)
    if (allocation.assignments.length === 0) {
      next.splice(allocationIndex, 1)
    } else {
      next[allocationIndex] = allocation
    }

    setTeacherSubjectAllocations(next)
  }

  const matrixLinkCount = useMemo(
    () => matrixTeachers.reduce((acc, teacher) => acc + teacher.subjects.length, 0),
    [matrixTeachers]
  )

  const departmentCards = useMemo(() => {
    return subjectNames.map((subjectName) => {
      const key = normalize(subjectName)
      const members = matrixTeachers.filter((teacher) =>
        teacher.subjects.some((subject) => normalize(subject) === key)
      )
      return {
        subjectName,
        members,
        classRows: classesBySubject.get(subjectName) || [],
      }
    })
  }, [subjectNames, matrixTeachers, classesBySubject])

  return (
    <div className="p-4 md:p-6 max-w-[1700px] mx-auto space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-secondary-200 bg-white px-4 py-3">
          <div className="text-xs text-secondary-500">Teachers</div>
          <div className="text-xl font-semibold text-secondary-900">{matrixTeachers.length}</div>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white px-4 py-3">
          <div className="text-xs text-secondary-500">Subject Links</div>
          <div className="text-xl font-semibold text-secondary-900">{matrixLinkCount}</div>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white px-4 py-3">
          <div className="text-xs text-secondary-500">Departments</div>
          <div className="text-xl font-semibold text-secondary-900">
            {departmentCards.filter((card) => card.members.length > 0).length}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-secondary-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 bg-secondary-50">
          <h3 className="text-base font-semibold text-secondary-900">Teacher Subject Matrix</h3>
          <p className="text-xs text-secondary-500 mt-1">
            Staff teachers in rows and timetable subjects in columns. Select subjects to build departments.
          </p>
        </div>

        <div className="px-5 py-3 border-b border-secondary-200 bg-white">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search teacher..."
            className="w-full md:w-[320px] px-3 py-2 rounded-lg border border-secondary-300 text-sm"
          />
        </div>

        {errorMessage && (
          <div className="px-5 py-3 text-sm text-error-700 bg-error-50 border-b border-error-100">
            {errorMessage}
          </div>
        )}

        {loadingStaff ? (
          <div className="px-5 py-8 text-sm text-secondary-500">Loading teachers...</div>
        ) : subjectNames.length === 0 ? (
          <div className="px-5 py-8 text-sm text-secondary-500">
            Add timetable subjects first in Time Table &gt; Subjects.
          </div>
        ) : searchableTeachers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-secondary-500">No matching teachers found.</div>
        ) : (
          <div className="max-h-[430px] overflow-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-secondary-50 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold border-b border-secondary-200 sticky top-0 left-0 bg-secondary-50 dark:bg-secondary-900 z-30">
                    Teacher
                  </th>
                  {subjectNames.map((subjectName) => (
                    <th
                      key={subjectName}
                      className="px-3 py-2 text-center font-semibold border-b border-secondary-200 sticky top-0 bg-secondary-50 z-20"
                    >
                      {subjectName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {searchableTeachers.map((teacher) => (
                  <tr key={teacher.id} className="odd:bg-white even:bg-secondary-50/40 dark:odd:bg-secondary-900 dark:even:bg-secondary-800/60">
                    <td className="px-3 py-2 border-b border-secondary-100 sticky left-0 z-20 bg-white dark:bg-secondary-900">
                      <div className="font-medium text-secondary-900">{toTitleCase(teacher.name)}</div>
                      <div className="text-xs text-secondary-500">{teacher.shortName || 'Functionary'}</div>
                    </td>
                    {subjectNames.map((subjectName) => {
                      const checked = teacher.subjects.some(
                        (subject) => normalize(subject) === normalize(subjectName)
                      )
                      return (
                        <td key={`${teacher.id}-${subjectName}`} className="px-3 py-2 border-b border-secondary-100 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleMatrix(teacher.id, subjectName)}
                            className="h-4 w-4 accent-primary-600"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        {departmentCards.map((card) => (
          <div key={card.subjectName} className="rounded-2xl border border-secondary-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-secondary-200 bg-primary-50/40 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-secondary-900">
                  Department - {card.subjectName}
                </h3>
                <p className="text-xs text-secondary-500 mt-1">
                  {card.members.length} teacher{card.members.length === 1 ? '' : 's'} | {card.classRows.length} class-section
                  {card.classRows.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {card.members.length === 0 ? (
              <div className="px-5 py-6 text-sm text-secondary-500">
                No teachers selected for this subject in the matrix above.
              </div>
            ) : card.classRows.length === 0 ? (
              <div className="px-5 py-6 text-sm text-secondary-500">
                No class-section currently teaches this subject.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-secondary-50 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold border-b border-secondary-200 sticky left-0 bg-secondary-50 dark:bg-secondary-900 z-20">
                        Teacher
                      </th>
                      {card.classRows.map((row) => (
                        <th key={row.id} className="px-3 py-2 text-center font-semibold border-b border-secondary-200">
                          <div>{row.className}-{row.section}</div>
                          <div className="text-[10px] font-normal text-secondary-500">
                            {getClassPeriodCount(row.id, card.subjectName)} periods
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center font-semibold border-b border-secondary-200">Workload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.members.map((teacher) => {
                      const assignedClassIds = getTeacherSubjectAssignments(teacher.id, card.subjectName)
                      const workload = getTeacherWorkload(teacher.id, card.subjectName)

                      return (
                        <tr key={`${card.subjectName}-${teacher.id}`} className="odd:bg-white even:bg-secondary-50/30 dark:odd:bg-secondary-900 dark:even:bg-secondary-800/60">
                          <td className="px-3 py-2 border-b border-secondary-100 sticky left-0 z-10 bg-white dark:bg-secondary-900">
                            <div className="font-medium text-secondary-900">{toTitleCase(teacher.name)}</div>
                            <div className="text-xs text-secondary-500">{assignedClassIds.size} classes assigned</div>
                          </td>
                          {card.classRows.map((classRow) => (
                            <td key={`${teacher.id}-${classRow.id}`} className="px-3 py-2 border-b border-secondary-100 text-center">
                              <input
                                type="checkbox"
                                checked={assignedClassIds.has(classRow.id)}
                                onChange={() => handleToggleDepartmentClass(teacher, card.subjectName, classRow)}
                                className="h-4 w-4 accent-emerald-600"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 border-b border-secondary-100 text-center font-semibold text-emerald-700">
                            {workload}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

export default Departments

