import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import attndService, { type StaffDirectoryItem } from '@/services/attndService'

type StaffAbsenceMap = Record<string, Record<string, boolean>>

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

const AttndStaffAttendance: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [staffRows, setStaffRows] = useState<StaffDirectoryItem[]>([])
  const [absenceMap, setAbsenceMap] = useState<StaffAbsenceMap>({})

  const loadData = async () => {
    setLoading(true)
    try {
      const [staff, attendance] = await Promise.all([
        attndService.getStaffDirectory(),
        attndService.getStaffAttendance(selectedMonth),
      ])

      setStaffRows(staff)
      const nextAbsenceMap: StaffAbsenceMap = {}
      attendance.forEach((item) => {
        if (!item.staffId || !item.attendanceDate) return
        if (!nextAbsenceMap[item.staffId]) nextAbsenceMap[item.staffId] = {}
        nextAbsenceMap[item.staffId][item.attendanceDate] = true
      })
      setAbsenceMap(nextAbsenceMap)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load staff attendance data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [selectedMonth])

  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return staffRows
    return staffRows.filter((item) => {
      const name = String(item.name || '').toLowerCase()
      const employeeId = String(item.employeeId || '').toLowerCase()
      return name.includes(query) || employeeId.includes(query)
    })
  }, [staffRows, searchQuery])

  const days = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth])
  const absentCount = useMemo(
    () =>
      filteredStaff.reduce((sum, staff) => {
        const absentDays = days.reduce(
          (dayCount, day) => dayCount + (absenceMap[staff._id]?.[day.dateKey] ? 1 : 0),
          0
        )
        return sum + absentDays
      }, 0),
    [filteredStaff, days, absenceMap]
  )
  const presentCount = filteredStaff.length * days.length - absentCount

  const toggleAbsent = (staffId: string, attendanceDate: string) => {
    setAbsenceMap((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [attendanceDate]: !prev[staffId]?.[attendanceDate],
      },
    }))
  }

  const handleSave = async () => {
    if (staffRows.length === 0) {
      toast.error('No staff records available to save.')
      return
    }

    setSaving(true)
    try {
      await attndService.saveStaffAttendance(
        selectedMonth,
        staffRows.flatMap((item) =>
          days
            .filter((day) => Boolean(absenceMap[item._id]?.[day.dateKey]))
            .map((day) => ({
              staffId: item._id,
              attendanceDate: day.dateKey,
            }))
        )
      )
      toast.success('Staff attendance saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save staff attendance.'))
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Staff Attendance</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Mark daily attendance and save in one click.</p>
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Month</label>
              <input
                type="month"
                title="Attendance month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name or employee ID"
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
                  <th className="sticky left-[52px] z-20 min-w-[220px] bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">Name</th>
                  <th className="sticky left-[272px] z-20 min-w-[120px] bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">Employee ID</th>
                  <th className="sticky left-[392px] z-20 min-w-[150px] bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">Designation</th>
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
                    <td colSpan={4 + days.length} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading staff records...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={4 + days.length} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No staff records found.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((item, index) => {
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="sticky left-0 z-[5] bg-white px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">{index + 1}</td>
                        <td className="sticky left-[52px] z-[5] bg-white px-3 py-2 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white">{item.name || '-'}</td>
                        <td className="sticky left-[272px] z-[5] bg-white px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{item.employeeId || '-'}</td>
                        <td className="sticky left-[392px] z-[5] bg-white px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{item.designation || '-'}</td>
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

export default AttndStaffAttendance
