import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import attndService, {
  type StudentClassOption,
  type StudentDirectoryItem,
} from '@/services/attndService'

type StudentAbsenceMap = Record<string, Record<string, boolean>>

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)
const getDaysInMonth = (month: string) => {
  const [yearValue, monthValue] = month.split('-').map(Number)
  if (!yearValue || !monthValue) return []
  const count = new Date(yearValue, monthValue, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    const dateKey = `${month}-${day}`
    const weekday = new Date(dateKey).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    return { dayLabel: String(index + 1), dateKey, weekday }
  })
}

const AttndStudentAttendance: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [classOptions, setClassOptions] = useState<StudentClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [studentRows, setStudentRows] = useState<StudentDirectoryItem[]>([])
  const [absenceMap, setAbsenceMap] = useState<StudentAbsenceMap>({})

  const sectionOptions = useMemo(() => {
    const row = classOptions.find((item) => item.className === selectedClass)
    return row?.sections || []
  }, [classOptions, selectedClass])

  const loadFilters = async () => {
    try {
      const options = await attndService.getStudentFilters()
      setClassOptions(options)
      if (!selectedClass && options.length > 0) {
        setSelectedClass(options[0].className)
        setSelectedSection(options[0].sections[0] || '')
      }
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load class and section options.'))
    }
  }

  useEffect(() => {
    void loadFilters()
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    if (sectionOptions.length === 0) {
      setSelectedSection('')
      return
    }
    if (!sectionOptions.includes(selectedSection)) {
      setSelectedSection(sectionOptions[0])
    }
  }, [selectedClass, sectionOptions, selectedSection])

  const loadData = async () => {
    if (!selectedClass || !selectedSection) {
      setStudentRows([])
      setAbsenceMap({})
      return
    }

    setLoading(true)
    try {
      const [students, attendance] = await Promise.all([
        attndService.getStudentDirectory(selectedClass, selectedSection),
        attndService.getStudentAttendance(selectedMonth, selectedClass, selectedSection),
      ])

      setStudentRows(students)
      const nextAbsenceMap: StudentAbsenceMap = {}
      attendance.forEach((item) => {
        if (!item.studentId || !item.attendanceDate) return
        if (!nextAbsenceMap[item.studentId]) nextAbsenceMap[item.studentId] = {}
        nextAbsenceMap[item.studentId][item.attendanceDate] = true
      })
      setAbsenceMap(nextAbsenceMap)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load student attendance data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [selectedMonth, selectedClass, selectedSection])

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return studentRows
    return studentRows.filter((item) => {
      const name = String(item.name || '').toLowerCase()
      const rollNo = String(item.rollNumber || '').toLowerCase()
      return name.includes(query) || rollNo.includes(query)
    })
  }, [studentRows, searchQuery])

  const days = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth])
  const absentCount = useMemo(
    () =>
      filteredStudents.reduce((sum, student) => {
        const absentDays = days.reduce(
          (dayCount, day) => dayCount + (absenceMap[student._id]?.[day.dateKey] ? 1 : 0),
          0
        )
        return sum + absentDays
      }, 0),
    [filteredStudents, days, absenceMap]
  )
  const presentCount = filteredStudents.length * days.length - absentCount

  const toggleAbsent = (studentId: string, attendanceDate: string) => {
    setAbsenceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [attendanceDate]: !prev[studentId]?.[attendanceDate],
      },
    }))
  }

  const handleSave = async () => {
    if (!selectedClass || !selectedSection) {
      toast.error('Please select class and section.')
      return
    }
    if (studentRows.length === 0) {
      toast.error('No students available for selected class and section.')
      return
    }

    setSaving(true)
    try {
      await attndService.saveStudentAttendance(
        selectedMonth,
        selectedClass,
        selectedSection,
        studentRows.flatMap((student) =>
          days
            .filter((day) => Boolean(absenceMap[student._id]?.[day.dateKey]))
            .map((day) => ({
              studentId: student._id,
              attendanceDate: day.dateKey,
            }))
        )
      )
      toast.success('Student attendance saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save student attendance.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student Attendance</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Mark class-wise, section-wise daily attendance.</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Date</label>
              <input
                type="month"
                title="Attendance month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Class</label>
              <select
                title="Select class"
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select class</option>
                {classOptions.map((item) => (
                  <option key={item.className} value={item.className}>
                    {item.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Section</label>
              <select
                title="Select section"
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={!selectedClass}
              >
                <option value="">Select section</option>
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Adm. no or name"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-900/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Present</p>
              <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{presentCount}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm dark:border-rose-900/50 dark:bg-rose-900/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Absent</p>
              <p className="text-lg font-semibold text-rose-800 dark:text-rose-200">{absentCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="max-h-[68vh] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="sticky left-0 z-20 min-w-[52px] bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">#</th>
                  <th className="sticky left-[52px] z-20 min-w-[120px] bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">Adm. No.</th>
                  <th className="sticky left-[172px] z-20 min-w-[220px] bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">Student Name</th>
                  {days.map((day) => (
                    <th key={day.dateKey} className="min-w-[64px] bg-gray-50 px-2 py-2 text-center text-[11px] font-semibold text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{day.dayLabel}</div>
                      <div>{day.weekday}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {loading ? (
                  <tr>
                    <td colSpan={3 + days.length} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading student records...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={3 + days.length} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No students found for the selected class and section.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((item, index) => {
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="sticky left-0 z-[5] bg-white px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">{index + 1}</td>
                        <td className="sticky left-[52px] z-[5] bg-white px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{item.rollNumber || '-'}</td>
                        <td className="sticky left-[172px] z-[5] bg-white px-3 py-2 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white">{item.name || '-'}</td>
                        {days.map((day) => (
                          <td key={`${item._id}-${day.dateKey}`} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(absenceMap[item._id]?.[day.dateKey])}
                              onChange={() => toggleAbsent(item._id, day.dateKey)}
                              title={`Mark absent on ${day.dateKey}`}
                              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttndStudentAttendance
