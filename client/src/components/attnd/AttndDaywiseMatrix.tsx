import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DateSwitcher } from '@/components/attnd/DateSwitcher'
import { sortClassNames, sortSectionNames } from '@/constants/studentClasses'
import attndService, {
  type StudentClassOption,
  type StudentDirectoryItem,
} from '@/services/attndService'

type DayCategory = 'academic' | 'non-academic'
type ClassSectionColumn = { className: string; section: string; key: string }

const todayDateKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const isSundayDate = (dateKey: string) => new Date(`${dateKey}T00:00:00`).getDay() === 0

const defaultDayCategory = (dateKey: string): DayCategory => (isSundayDate(dateKey) ? 'non-academic' : 'academic')

const isNonAcademicCategory = (category?: string) => {
  const value = String(category || '').toLowerCase()
  return value === 'non-academic' || value === 'non-academic'
}

const classNameOf = (item: StudentDirectoryItem) => String((item as StudentDirectoryItem & { className?: string }).className || item.class || '')

const studentMatchesQuery = (item: StudentDirectoryItem, query: string) => {
  if (!query) return true
  const name = String(item.name || '').toLowerCase()
  const rollNo = String(item.rollNumber || '').toLowerCase()
  return name.includes(query) || rollNo.includes(query)
}

export const AttndDaywiseMatrix = () => {
  const [selectedDate, setSelectedDate] = useState(todayDateKey)
  const [classOptions, setClassOptions] = useState<StudentClassOption[]>([])
  const [studentRows, setStudentRows] = useState<StudentDirectoryItem[]>([])
  const [absenceMap, setAbsenceMap] = useState<Record<string, boolean>>({})
  const [holidayMap, setHolidayMap] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const columns = useMemo<ClassSectionColumn[]>(() => {
    const next = classOptions.flatMap((item) =>
      [...(item.sections || [])]
        .sort((left, right) => sortSectionNames(left, right, item.className))
        .map((section) => ({
          className: item.className,
          section,
          key: `${item.className}||${section}`,
        }))
    )
    return next.sort((left, right) => {
      const classDiff = sortClassNames(left.className, right.className)
      if (classDiff !== 0) return classDiff
      return sortSectionNames(left.section, right.section, left.className)
    })
  }, [classOptions])

  const studentsByColumn = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const grouped: Record<string, StudentDirectoryItem[]> = {}
    columns.forEach((column) => {
      grouped[column.key] = studentRows
        .filter((item) => classNameOf(item) === column.className && String(item.section || '') === column.section)
        .filter((item) => studentMatchesQuery(item, query))
        .sort((left, right) =>
          String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' })
        )
    })
    return grouped
  }, [columns, studentRows, searchQuery])

  const rowCount = useMemo(
    () => Math.max(0, ...columns.map((column) => studentsByColumn[column.key]?.length || 0)),
    [columns, studentsByColumn]
  )

  const isHoliday = (columnKey: string) =>
    Object.prototype.hasOwnProperty.call(holidayMap, columnKey)
      ? Boolean(holidayMap[columnKey])
      : defaultDayCategory(selectedDate) === 'non-academic'

  const workingColumns = columns.filter((column) => !isHoliday(column.key))
  const visibleStudents = workingColumns.flatMap((column) => studentsByColumn[column.key] || [])
  const absentCount = visibleStudents.filter((item) => Boolean(absenceMap[item._id])).length
  const presentCount = visibleStudents.length - absentCount

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const options = await attndService.getStudentFilters()
        setClassOptions([...options].sort((left, right) => sortClassNames(left.className, right.className)))
      } catch (error: any) {
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load class and section options.'))
      }
    }
    void loadFilters()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [students, attendance] = await Promise.all([
          attndService.getStudentDirectory(),
          attndService.getStudentAttendanceByDate(selectedDate),
        ])
        setStudentRows(students)
        const nextAbsence: Record<string, boolean> = {}
        attendance.records.forEach((item) => {
          const id = String(item.studentId || '')
          if (id && item.status === 'A') nextAbsence[id] = true
        })
        setAbsenceMap(nextAbsence)

        const nextHoliday: Record<string, boolean> = {}
        attendance.daySettings.forEach((item) => {
          const className = String(item.className || '')
          const section = String(item.section || '')
          if (!className || !section) return
          nextHoliday[`${className}||${section}`] = isNonAcademicCategory(item.category)
        })
        setHolidayMap(nextHoliday)
      } catch (error: any) {
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load daywise attendance.'))
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [selectedDate])

  const toggleAbsent = (studentId: string, columnKey: string) => {
    if (isHoliday(columnKey)) return
    setAbsenceMap((prev) => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  const toggleColumnHoliday = (columnKey: string) => {
    const currentlyHoliday = isHoliday(columnKey)
    setHolidayMap((prev) => ({ ...prev, [columnKey]: !currentlyHoliday }))
    if (currentlyHoliday) return
    const students = studentsByColumn[columnKey] || []
    setAbsenceMap((prev) => {
      const next = { ...prev }
      students.forEach((item) => {
        next[item._id] = false
      })
      return next
    })
  }

  const handleSave = async () => {
    if (columns.length === 0) {
      toast.error('No classes found to save attendance.')
      return
    }

    setSaving(true)
    try {
      await attndService.saveStudentAttendanceByDate(selectedDate, {
        absences: columns.flatMap((column) => {
          if (isHoliday(column.key)) return []
          return (studentsByColumn[column.key] || [])
            .filter((item) => Boolean(absenceMap[item._id]))
            .map((item) => ({
              studentId: item._id,
              className: column.className,
              section: column.section,
              attendanceDate: selectedDate,
            }))
        }),
        daySettings: columns.map((column) => ({
          attendanceDate: selectedDate,
          className: column.className,
          section: column.section,
          category: isHoliday(column.key) ? 'non-academic' : 'academic',
        })),
      })
      toast.success('Daywise attendance saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save daywise attendance.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <DateSwitcher value={selectedDate} onChange={setSelectedDate} />
            <p className="text-[11px] text-slate-500">All classes for this day</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name or adm. no"
              className="w-[168px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700">
              <span className="text-xs font-semibold uppercase text-slate-500">Working </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{workingColumns.length}</span>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm dark:border-emerald-900/50 dark:bg-emerald-900/20">
              <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">Present </span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">{presentCount}</span>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm dark:border-rose-900/50 dark:bg-rose-900/20">
              <span className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-300">Absent </span>
              <span className="font-semibold text-rose-800 dark:text-rose-200">{absentCount}</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || columns.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="max-h-[68vh] overflow-auto">
            <table className="w-max border-collapse">
              <thead className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="sticky left-0 z-20 w-[36px] min-w-[36px] bg-gray-50 px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">
                    #
                  </th>
                  {columns.map((column) => {
                    const holiday = isHoliday(column.key)
                    return (
                      <th
                        key={column.key}
                        className={`w-[88px] min-w-[88px] max-w-[88px] p-0 text-center ${
                          holiday ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-gray-50 dark:bg-gray-900'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleColumnHoliday(column.key)}
                          title={holiday ? 'Holiday. Click to mark academic.' : 'Academic. Click to mark holiday.'}
                          className="w-full px-1 py-1 leading-tight hover:bg-white/70"
                        >
                          <div className="truncate text-[11px] font-semibold text-gray-700 dark:text-gray-200">{column.className}</div>
                          <div className={`truncate text-[9px] font-semibold ${holiday ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {column.section}
                          </div>
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {loading ? (
                  <tr>
                    <td colSpan={1 + columns.length} className="px-3 py-8 text-center text-sm text-gray-500">
                      Loading students...
                    </td>
                  </tr>
                ) : columns.length === 0 || rowCount === 0 ? (
                  <tr>
                    <td colSpan={1 + Math.max(columns.length, 1)} className="px-3 py-8 text-center text-sm text-gray-500">
                      {columns.length === 0 ? 'No classes found.' : 'No students found for this day.'}
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: rowCount }, (_, index) => (
                    <tr key={`daywise-row-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="sticky left-0 z-[5] bg-white px-1 py-1 text-center text-xs text-gray-500 dark:bg-gray-800">
                        {index + 1}
                      </td>
                      {columns.map((column) => {
                        const student = studentsByColumn[column.key]?.[index]
                        const holiday = isHoliday(column.key)
                        return (
                          <td
                            key={`${column.key}-${index}`}
                            className={`w-[88px] min-w-[88px] max-w-[88px] p-0.5 text-center ${
                              holiday ? 'bg-rose-50/80 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            {student ? (
                              <label className="flex cursor-pointer flex-col items-center gap-0.5 px-0.5 py-0.5">
                                <span className="w-full truncate text-[9px] font-medium text-gray-700 dark:text-gray-200" title={student.name}>
                                  {student.name}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={!holiday && Boolean(absenceMap[student._id])}
                                  disabled={holiday}
                                  onChange={() => toggleAbsent(student._id, column.key)}
                                  title={holiday ? `${column.className} ${column.section} is a holiday` : `Mark ${student.name} absent`}
                                  className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-rose-600 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                                />
                              </label>
                            ) : (
                              <span className="block h-8" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          {loading
            ? 'Loading students...'
            : `${visibleStudents.length} student${visibleStudents.length === 1 ? '' : 's'} across ${workingColumns.length} working class-section${workingColumns.length === 1 ? '' : 's'}. Click a class header to mark that class holiday for this day.`}
        </p>
      </div>
    </div>
  )
}
