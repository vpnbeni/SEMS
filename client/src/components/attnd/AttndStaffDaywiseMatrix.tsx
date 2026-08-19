import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DateSwitcher } from '@/components/attnd/DateSwitcher'
import attndService, { type StaffDirectoryItem } from '@/services/attndService'
import { getStaffTypeId, STAFF_TYPE_OPTIONS, type StaffTypeId } from '@/utils/attndStaffTypes'

const todayDateKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const isSundayDate = (dateKey: string) => new Date(`${dateKey}T00:00:00`).getDay() === 0

export const AttndStaffDaywiseMatrix = () => {
  const [selectedDate, setSelectedDate] = useState(todayDateKey)
  const [staffRows, setStaffRows] = useState<StaffDirectoryItem[]>([])
  const [absenceMap, setAbsenceMap] = useState<Record<string, boolean>>({})
  const [holiday, setHoliday] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const columns = useMemo(() => {
    const present = new Set(staffRows.map((item) => getStaffTypeId(item)))
    return STAFF_TYPE_OPTIONS.filter((item) => present.has(item.id))
  }, [staffRows])

  const staffByType = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const grouped: Record<StaffTypeId, StaffDirectoryItem[]> = {
      teaching: [],
      'sports-coach': [],
      admin: [],
      'class-iv': [],
      drivers: [],
      conductors: [],
      security: [],
      other: [],
    }
    staffRows.forEach((item) => {
      if (query) {
        const name = String(item.name || '').toLowerCase()
        const employeeId = String(item.employeeId || '').toLowerCase()
        if (!name.includes(query) && !employeeId.includes(query)) return
      }
      grouped[getStaffTypeId(item)].push(item)
    })
    Object.values(grouped).forEach((rows) => {
      rows.sort((left, right) =>
        String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' })
      )
    })
    return grouped
  }, [staffRows, searchQuery])

  const rowCount = Math.max(0, ...columns.map((column) => staffByType[column.id]?.length || 0))
  const visibleStaff = columns.flatMap((column) => staffByType[column.id] || [])
  const absentCount = holiday ? 0 : visibleStaff.filter((item) => absenceMap[item._id]).length
  const presentCount = holiday ? 0 : visibleStaff.length - absentCount

  useEffect(() => {
    setHoliday(isSundayDate(selectedDate))
  }, [selectedDate])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [staff, attendance] = await Promise.all([
          attndService.getStaffDirectory(),
          attndService.getStaffAttendance({ date: selectedDate }),
        ])
        setStaffRows(staff)
        const nextAbsence: Record<string, boolean> = {}
        attendance.forEach((item) => {
          if (item.staffId && item.status === 'A') nextAbsence[item.staffId] = true
        })
        setAbsenceMap(nextAbsence)
      } catch (error: any) {
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load staff attendance.'))
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [selectedDate])

  const toggleAbsent = (staffId: string) => {
    if (holiday) return
    setAbsenceMap((prev) => ({ ...prev, [staffId]: !prev[staffId] }))
  }

  const handleSave = async () => {
    if (staffRows.length === 0) {
      toast.error('No staff records available to save.')
      return
    }
    setSaving(true)
    try {
      await attndService.saveStaffAttendance({
        date: selectedDate,
        staffIds: staffRows.map((item) => item._id),
        absences: holiday
          ? []
          : staffRows
              .filter((item) => absenceMap[item._id])
              .map((item) => ({ staffId: item._id, attendanceDate: selectedDate })),
      })
      toast.success('Staff attendance saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save staff attendance.'))
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
            <button
              type="button"
              onClick={() => setHoliday((prev) => !prev)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                holiday
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {holiday ? 'Holiday' : 'Working day'}
            </button>
            <p className="text-[11px] text-slate-500">All staff types for this day</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name or emp. ID"
              className="w-[168px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700">
              <span className="text-xs font-semibold uppercase text-slate-500">Working </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{holiday ? 0 : 1}</span>
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
              disabled={saving || loading || staffRows.length === 0}
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
                  <th className="sticky left-0 z-20 w-[36px] min-w-[36px] bg-gray-50 px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">#</th>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`w-[92px] min-w-[92px] max-w-[92px] p-1 text-center text-[11px] font-semibold ${
                        holiday ? 'bg-rose-50 text-rose-700' : 'bg-gray-50 text-emerald-700'
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {loading ? (
                  <tr>
                    <td colSpan={1 + columns.length} className="px-3 py-8 text-center text-sm text-gray-500">
                      Loading staff...
                    </td>
                  </tr>
                ) : columns.length === 0 || rowCount === 0 ? (
                  <tr>
                    <td colSpan={1 + Math.max(columns.length, 1)} className="px-3 py-8 text-center text-sm text-gray-500">
                      {columns.length === 0 ? 'No staff types found.' : 'No staff found for this day.'}
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: rowCount }, (_, index) => (
                    <tr key={`staff-daywise-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="sticky left-0 z-[5] bg-white px-1 py-1 text-center text-xs text-gray-500 dark:bg-gray-800">
                        {index + 1}
                      </td>
                      {columns.map((column) => {
                        const staff = staffByType[column.id]?.[index]
                        return (
                          <td
                            key={`${column.id}-${index}`}
                            className={`w-[92px] min-w-[92px] max-w-[92px] p-0.5 text-center ${holiday ? 'bg-rose-50/80' : ''}`}
                          >
                            {staff ? (
                              <label className="flex cursor-pointer flex-col items-center gap-0.5 px-0.5 py-0.5">
                                <span className="w-full truncate text-[9px] font-medium text-gray-700 dark:text-gray-200" title={staff.name}>
                                  {staff.name}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={!holiday && Boolean(absenceMap[staff._id])}
                                  disabled={holiday}
                                  onChange={() => toggleAbsent(staff._id)}
                                  title={holiday ? 'Holiday' : `Mark ${staff.name} absent`}
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
            ? 'Loading staff...'
            : `${visibleStaff.length} staff across ${columns.length} type${columns.length === 1 ? '' : 's'}. Click Working day / Holiday to change this date.`}
        </p>
      </div>
    </div>
  )
}
