import React, { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { MonthSwitcher } from '@/components/attnd/MonthSwitcher'
import { AttndStaffDaywiseMatrix } from '@/components/attnd/AttndStaffDaywiseMatrix'
import { useAttndMatrixMode } from '@/contexts/AttndMatrixModeContext'
import attndService, { type StaffDirectoryItem } from '@/services/attndService'
import {
  designationOf,
  getStaffTypeId,
  STAFF_TYPE_OPTIONS,
  type StaffTypeId,
} from '@/utils/attndStaffTypes'

type AbsenceMap = Record<string, Record<string, boolean>>
type DayCategory = 'academic' | 'non-academic'
type DayCategoryMap = Record<string, DayCategory>

const selectClassName =
  'min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

const currentMonthKey = () => new Date().toISOString().slice(0, 7)
const isSundayDate = (dateKey: string) => new Date(`${dateKey}T00:00:00`).getDay() === 0
const defaultDayCategory = (dateKey: string): DayCategory => (isSundayDate(dateKey) ? 'non-academic' : 'academic')

const getDaysInMonth = (month: string) => {
  const [yearValue, monthValue] = month.split('-').map(Number)
  if (!yearValue || !monthValue) return []
  const count = new Date(yearValue, monthValue, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    const dateKey = `${month}-${day}`
    const weekday = new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    return { dayLabel: String(index + 1), dateKey, weekday }
  })
}

const AttndStaffAttendance: React.FC = () => {
  const { mode } = useAttndMatrixMode()
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey())
  const [allStaff, setAllStaff] = useState<StaffDirectoryItem[]>([])
  const [selectedType, setSelectedType] = useState<StaffTypeId | ''>('')
  const [selectedDesignation, setSelectedDesignation] = useState('All')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [absenceMap, setAbsenceMap] = useState<AbsenceMap>({})
  const [dayCategoryMap, setDayCategoryMap] = useState<DayCategoryMap>({})
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const todayColRef = useRef<HTMLTableCellElement>(null)
  const todayKey = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [])

  const typeOptions = useMemo(() => {
    const present = new Set(allStaff.map((item) => getStaffTypeId(item)))
    return STAFF_TYPE_OPTIONS.filter((item) => present.has(item.id))
  }, [allStaff])

  const designationOptions = useMemo(() => {
    if (!selectedType) return []
    const values = Array.from(
      new Set(
        allStaff.filter((item) => getStaffTypeId(item) === selectedType).map((item) => designationOf(item))
      )
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
    return ['All', ...values]
  }, [allStaff, selectedType])

  const staffRows = useMemo(() => {
    if (!selectedType) return []
    return allStaff.filter((item) => {
      if (getStaffTypeId(item) !== selectedType) return false
      if (selectedDesignation && selectedDesignation !== 'All' && designationOf(item) !== selectedDesignation) {
        return false
      }
      return true
    })
  }, [allStaff, selectedType, selectedDesignation])

  const days = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth])

  useEffect(() => {
    if (!selectedType && typeOptions.length > 0) {
      setSelectedType(typeOptions[0].id)
    }
    if (selectedType && !typeOptions.some((item) => item.id === selectedType)) {
      setSelectedType(typeOptions[0]?.id || '')
    }
  }, [typeOptions, selectedType])

  useEffect(() => {
    if (!designationOptions.includes(selectedDesignation)) {
      setSelectedDesignation(designationOptions[0] || 'All')
    }
  }, [designationOptions, selectedDesignation])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [staff, attendance] = await Promise.all([
          attndService.getStaffDirectory(),
          attndService.getStaffAttendance({ month: selectedMonth }),
        ])
        setAllStaff(staff)
        const nextAbsence: AbsenceMap = {}
        attendance.forEach((item) => {
          const id = String(item.staffId || '')
          if (!id || !item.attendanceDate || item.status !== 'A') return
          if (!nextAbsence[id]) nextAbsence[id] = {}
          nextAbsence[id][item.attendanceDate] = true
        })
        setAbsenceMap(nextAbsence)
        const nextDays: DayCategoryMap = {}
        getDaysInMonth(selectedMonth).forEach((day) => {
          nextDays[day.dateKey] = defaultDayCategory(day.dateKey)
        })
        setDayCategoryMap(nextDays)
      } catch (error: any) {
        toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load staff attendance data.'))
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [selectedMonth])

  useEffect(() => {
    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return
        const column = todayColRef.current
        const scroller = tableScrollRef.current
        if (!column || !scroller) return
        const scrollerRect = scroller.getBoundingClientRect()
        const columnRect = column.getBoundingClientRect()
        const nextLeft = scroller.scrollLeft + (columnRect.left - scrollerRect.left) - 320
        scroller.scrollTo({ left: Math.max(0, nextLeft), behavior: 'smooth' })
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [selectedMonth, days.length, loading, selectedType])

  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const rows = query
      ? staffRows.filter((item) => {
          const name = String(item.name || '').toLowerCase()
          const employeeId = String(item.employeeId || '').toLowerCase()
          return name.includes(query) || employeeId.includes(query)
        })
      : staffRows
    return [...rows].sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' })
    )
  }, [staffRows, searchQuery])

  const isHoliday = (dateKey: string) =>
    (dayCategoryMap[dateKey] || defaultDayCategory(dateKey)) === 'non-academic'
  const workingDays = useMemo(() => days.filter((day) => !isHoliday(day.dateKey)), [days, dayCategoryMap])

  const absentCount = useMemo(
    () =>
      filteredStaff.reduce((sum, staff) => {
        const absentDays = workingDays.reduce(
          (dayCount, day) => dayCount + (absenceMap[staff._id]?.[day.dateKey] ? 1 : 0),
          0
        )
        return sum + absentDays
      }, 0),
    [filteredStaff, workingDays, absenceMap]
  )
  const presentCount = filteredStaff.length * workingDays.length - absentCount

  const toggleAbsent = (staffId: string, dateKey: string) => {
    if (isHoliday(dateKey)) return
    setAbsenceMap((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [dateKey]: !prev[staffId]?.[dateKey],
      },
    }))
  }

  const toggleDayCategory = (dateKey: string) => {
    const currentlyHoliday = isHoliday(dateKey)
    setDayCategoryMap((prev) => ({
      ...prev,
      [dateKey]: currentlyHoliday ? 'academic' : 'non-academic',
    }))
    setAbsenceMap((prev) => {
      if (currentlyHoliday) return prev
      const next = { ...prev }
      Object.keys(next).forEach((staffId) => {
        if (next[staffId]?.[dateKey]) next[staffId] = { ...next[staffId], [dateKey]: false }
      })
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedType) {
      toast.error('Select a staff type.')
      return
    }
    if (staffRows.length === 0) {
      toast.error('No staff found for the selected type.')
      return
    }
    setSaving(true)
    try {
      await attndService.saveStaffAttendance({
        month: selectedMonth,
        staffIds: staffRows.map((item) => item._id),
        absences: staffRows.flatMap((staff) =>
          workingDays
            .filter((day) => Boolean(absenceMap[staff._id]?.[day.dateKey]))
            .map((day) => ({
              staffId: staff._id,
              attendanceDate: day.dateKey,
            }))
        ),
      })
      toast.success('Staff attendance saved.')
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save staff attendance.'))
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'daywise') {
    return <AttndStaffDaywiseMatrix />
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              title="Staff type"
              aria-label="Staff type"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as StaffTypeId | '')}
              className={selectClassName}
            >
              <option value="">Staff type</option>
              {typeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              title="Designation"
              aria-label="Designation"
              value={selectedDesignation}
              onChange={(event) => setSelectedDesignation(event.target.value)}
              disabled={!selectedType}
              className={selectClassName}
            >
              <option value="All">{selectedType ? 'All designations' : 'Select type first'}</option>
              {designationOptions
                .filter((item) => item !== 'All')
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
            <MonthSwitcher value={selectedMonth} onChange={setSelectedMonth} />
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
              <span className="font-semibold text-slate-800 dark:text-slate-100">{workingDays.length}</span>
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
          <div ref={tableScrollRef} className="max-h-[68vh] overflow-auto">
            <table className="w-max border-collapse">
              <thead className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="sticky left-0 z-20 w-[44px] min-w-[44px] bg-gray-50 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">#</th>
                  <th className="sticky left-[44px] z-20 w-[96px] min-w-[96px] bg-gray-50 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">Emp. ID</th>
                  <th className="sticky left-[140px] z-20 w-[180px] min-w-[180px] bg-gray-50 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">Staff Name</th>
                  {days.map((day) => {
                    const holiday = isHoliday(day.dateKey)
                    const isToday = day.dateKey === todayKey
                    return (
                      <th
                        key={day.dateKey}
                        ref={isToday ? todayColRef : undefined}
                        className={`w-9 min-w-9 max-w-9 p-0 text-center ${
                          holiday ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-gray-50 dark:bg-gray-900'
                        } ${isToday ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleDayCategory(day.dateKey)}
                          title={holiday ? 'Holiday. Click to mark working.' : 'Working day. Click to mark holiday.'}
                          className={`w-full px-0 py-1 leading-tight hover:bg-white/70 ${isToday ? 'ring-1 ring-inset ring-indigo-400' : ''}`}
                        >
                          <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{day.dayLabel}</div>
                          <div className={`text-[8px] font-semibold ${holiday ? 'text-rose-700' : 'text-emerald-700'}`}>{day.weekday}</div>
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {loading ? (
                  <tr>
                    <td colSpan={3 + days.length} className="px-3 py-8 text-center text-sm text-gray-500">Loading staff...</td>
                  </tr>
                ) : !selectedType ? (
                  <tr>
                    <td colSpan={3 + days.length} className="px-3 py-8 text-center text-sm text-gray-500">
                      Select a staff type to list staff.
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={3 + days.length} className="px-3 py-8 text-center text-sm text-gray-500">
                      No staff found for the selected type.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((item, index) => (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="sticky left-0 z-[5] bg-white px-2 py-1.5 text-sm text-gray-500 dark:bg-gray-800">{index + 1}</td>
                      <td className="sticky left-[44px] z-[5] bg-white px-2 py-1.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{item.employeeId || '-'}</td>
                      <td className="sticky left-[140px] z-[5] bg-white px-2 py-1.5 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white">{item.name || '-'}</td>
                      {days.map((day) => {
                        const holiday = isHoliday(day.dateKey)
                        const isToday = day.dateKey === todayKey
                        return (
                          <td
                            key={`${item._id}-${day.dateKey}`}
                            className={`w-9 min-w-9 max-w-9 p-0 text-center ${
                              holiday ? 'bg-rose-50/80 dark:bg-rose-950/20' : ''
                            } ${isToday ? 'bg-indigo-50/70 dark:bg-indigo-950/20' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={!holiday && Boolean(absenceMap[item._id]?.[day.dateKey])}
                              disabled={holiday}
                              onChange={() => toggleAbsent(item._id, day.dateKey)}
                              title={holiday ? `${day.dateKey} is a holiday` : `Mark absent on ${day.dateKey}`}
                              className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-rose-600 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                            />
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
          {!selectedType
            ? 'Select a staff type to load staff.'
            : loading
              ? 'Loading staff...'
              : `${filteredStaff.length} staff · ${workingDays.length} working day${workingDays.length === 1 ? '' : 's'}. Click a date header to mark it working or holiday.`}
        </p>
      </div>
    </div>
  )
}

export default AttndStaffAttendance
