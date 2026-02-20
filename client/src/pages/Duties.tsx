import React, { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useTeachers } from '../hooks/useTeachers'
import type { Teacher } from '../services/teacherService'
import { seatingPlanService, type Room } from '../services/seatingPlanService'
import centreDatesheetService from '../services/centreDatesheetService'
import dutiesService from '../services/dutiesService'

/* ────────── constants ────────── */

const DUTY_TABS = [
  { key: 'CS', label: 'CS', dutyType: 'Centre Superintendent' },
  { key: 'DCS', label: 'DCS', dutyType: 'Deputy Centre Superintendent' },
  { key: 'OBR', label: 'OBR', dutyType: 'Observer' },
  { key: 'ASI', label: 'ASI', dutyType: 'Invigilator' },
  { key: 'ASC', label: 'ASC', dutyType: 'ASI (CCTV)' },
  { key: 'ASFM', label: 'ASFM', dutyType: 'ASI (Frisking Male)' },
  { key: 'ASFF', label: 'ASFF', dutyType: 'ASI (Frisking Female)' },
  { key: 'CLR', label: 'CLR', dutyType: 'Clerk' },
  { key: 'CL4', label: 'CL4', dutyType: 'Class IV' },
] as const

/* ────────── helpers ────────── */

const normalizeDateKey = (value: string | Date) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-')
  if (!year || !month || !day) return dateKey
  return `${day}.${month}.${year.slice(-2)}`
}

const hasDutyType = (functionary: Teacher, dutyType: string) => {
  if (functionary?.dutyType === dutyType) return true
  if (!Array.isArray(functionary?.dutyHistory)) return false
  return functionary.dutyHistory.some((duty: string) => duty === dutyType)
}

const compareRoomNo = (a: Room, b: Room) => {
  const aNo = String(a?.roomNo || '')
  const bNo = String(b?.roomNo || '')
  return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' })
}

const getRoomAllocationOrderForDate = (room: Room, dateKey: string) => {
  if (!dateKey) return Number.MAX_SAFE_INTEGER
  const source = room?.allocationOrderByDate as unknown
  if (!source) return Number.MAX_SAFE_INTEGER
  const value =
    source instanceof Map
      ? source.get(dateKey)
      : (source as Record<string, number | undefined>)[dateKey]
  return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER
}

/**
 * Calculate maximum duties per date for the active tab.
 *
 * CS:   1 per day
 * DCS:  1 per day
 * OBR:  as per observer schedule (0 for now – needs separate schedule)
 * ASI:  2 × rooms used that day
 * ASC:  ⌈rooms / 10⌉ per day
 * ASFM: 1 per day
 * ASFF: 1 per day
 * CLR:  1 per day
 * CL4:  1 if candidates < 20
 *       2 if 20 ≤ candidates ≤ 100
 *       3 if 101 ≤ candidates ≤ 400
 *       4 if candidates > 400
 */
const computeMaxDuties = (
  tabKey: string,
  roomsForDate: number,
  candidatesForDate: number
): number => {
  switch (tabKey) {
    case 'CS':
    case 'DCS':
    case 'ASFM':
    case 'ASFF':
    case 'CLR':
      return 1

    case 'OBR':
      // Observer schedule-based – show 0 until schedule is configured
      return 0

    case 'ASI':
      // Twice the number of rooms used that day
      return roomsForDate * 2

    case 'ASC':
      // 1 per 10 rooms
      return roomsForDate > 0 ? Math.ceil(roomsForDate / 10) : 0

    case 'CL4':
      if (candidatesForDate <= 0) return 0
      if (candidatesForDate < 20) return 1
      if (candidatesForDate <= 100) return 2
      if (candidatesForDate <= 400) return 3
      return 4

    default:
      return 0
  }
}

/* ── Header label for the "maximum" row per tab ── */
const getMaxRowLabel = (tabKey: string): string => {
  switch (tabKey) {
    case 'CS': return 'Max CS per Day'
    case 'DCS': return 'Max DCS per Day'
    case 'OBR': return 'Max Observers'
    case 'ASI': return 'Max Invigilators'
    case 'ASC': return 'Max ASI (CCTV)'
    case 'ASFM': return 'Max ASI (Frisking; Male)'
    case 'ASFF': return 'Max ASI (Frisking; Female)'
    case 'CLR': return 'Max Clerks'
    case 'CL4': return 'Max Class IV'
    default: return 'Maximum Duties'
  }
}

/* ────────── component ────────── */

const Duties: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [examDates, setExamDates] = useState<string[]>([])
  const [requiredRoomsByDate, setRequiredRoomsByDate] = useState<Record<string, number>>({})
  const [candidatesByDate, setCandidatesByDate] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ASI')
  const [isSaving, setIsSaving] = useState(false)
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('manual')
  const [loadingAllocationMode, setLoadingAllocationMode] = useState(false)
  // Track checked duties: key = "funcId::dateKey", value = true/false
  const [checkedDuties, setCheckedDuties] = useState<Record<string, boolean>>({})
  const [selectedRoomDate, setSelectedRoomDate] = useState('')
  const [roomAssignmentsByDate, setRoomAssignmentsByDate] = useState<Record<string, Record<string, string>>>({})
  const [loadingRoomAssignments, setLoadingRoomAssignments] = useState(false)
  const [savingRoomAssignments, setSavingRoomAssignments] = useState(false)

  /* ── Fetch teachers ── */
  const { data: teachersData, isLoading: loadingTeachers } = useTeachers({
    limit: 100,
    sort: 'name',
  })

  const allFunctionaries = useMemo(() => {
    return teachersData?.items || []
  }, [teachersData])

  /* ── Filter by active tab + search ── */
  const activeDutyType = DUTY_TABS.find((t) => t.key === activeTab)?.dutyType || ''

  const filteredFunctionaries = useMemo(() => {
    let list = allFunctionaries.filter((f) => hasDutyType(f, activeDutyType))
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((f) => {
        const haystack = `${f.name} ${f.employeeId || ''}`.toLowerCase()
        return haystack.includes(term)
      })
    }
    return list
  }, [allFunctionaries, activeDutyType, search])

  const allocatedRoomsForSelectedDate = useMemo(() => {
    if (!selectedRoomDate) return []
    return [...rooms]
      .filter((room) => room?.isActive !== false)
      .filter((room) => Array.isArray(room?.allocatedExamDates) && room.allocatedExamDates.includes(selectedRoomDate))
      .sort((a, b) => {
        const orderDiff =
          getRoomAllocationOrderForDate(a, selectedRoomDate) - getRoomAllocationOrderForDate(b, selectedRoomDate)
        if (orderDiff !== 0) return orderDiff
        return compareRoomNo(a, b)
      })
  }, [rooms, selectedRoomDate])

  const functionaryById = useMemo(() => {
    const map: Record<string, Teacher> = {}
    for (const functionary of allFunctionaries) {
      if (functionary?._id) map[functionary._id] = functionary
    }
    return map
  }, [allFunctionaries])

  const invigilatorsForTab = useMemo(() => {
    const dutyType = DUTY_TABS.find((t) => t.key === 'ASI')?.dutyType || 'Invigilator'
    return allFunctionaries.filter((f) => hasDutyType(f, dutyType))
  }, [allFunctionaries])

  const selectedInvigilatorsForDate = useMemo(() => {
    if (!selectedRoomDate) return []
    return invigilatorsForTab.filter((func) => checkedDuties[`${func._id}::${selectedRoomDate}`])
  }, [invigilatorsForTab, checkedDuties, selectedRoomDate])

  const roomDropdownInvigilators = useMemo(() => {
    const source = allocationMode === 'manual' ? selectedInvigilatorsForDate : invigilatorsForTab
    return [...source].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  }, [allocationMode, selectedInvigilatorsForDate, invigilatorsForTab])

  /* ── Count per tab ── */
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tab of DUTY_TABS) {
      counts[tab.key] = allFunctionaries.filter((f) => f.dutyType === tab.dutyType).length
    }
    return counts
  }, [allFunctionaries])

  /* ── Count checked duties per date ── */
  const checkedCountByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of Object.keys(checkedDuties)) {
      if (!checkedDuties[key]) continue
      const dateKey = key.split('::')[1]
      if (dateKey) counts[dateKey] = (counts[dateKey] || 0) + 1
    }
    return counts
  }, [checkedDuties])

  /* ── Count checked duties per functionary ── */
  const checkedCountByFunctionary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of Object.keys(checkedDuties)) {
      if (!checkedDuties[key]) continue
      const functionaryId = key.split('::')[0]
      if (functionaryId) counts[functionaryId] = (counts[functionaryId] || 0) + 1
    }
    return counts
  }, [checkedDuties])

  const toggleDuty = (funcId: string, dateKey: string) => {
    const key = `${funcId}::${dateKey}`
    setCheckedDuties((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  /* ── Fetch rooms + exam dates + candidate counts ── */
  useEffect(() => {
    const fetchSupportData = async () => {
      try {
        const [roomsRes, datesheetRes] = await Promise.all([
          seatingPlanService.getRooms(),
          centreDatesheetService.getEntries(),
        ])

        setRooms(roomsRes || [])

        const entries = Array.isArray(datesheetRes?.data) ? datesheetRes.data : []
        const nextRequired: Record<string, number> = {}
        const nextCandidates: Record<string, number> = {}
        const uniqueDates = Array.from(
          new Set(
            entries
              .map((entry) => {
                const dateKey = normalizeDateKey(entry.examDate)
                if (dateKey) {
                  nextRequired[dateKey] = (nextRequired[dateKey] || 0) + Number(entry.roomsNeeded || 0)
                  nextCandidates[dateKey] = (nextCandidates[dateKey] || 0) + Number(entry.candidateCount || 0)
                }
                return dateKey
              })
              .filter(Boolean) as string[]
          )
        ).sort()

        setExamDates(uniqueDates)
        setRequiredRoomsByDate(nextRequired)
        setCandidatesByDate(nextCandidates)
      } catch (error: any) {
        console.error('Failed to load support data:', error)
        toast.error('Failed to load exam dates or rooms')
      }
    }

    fetchSupportData()
  }, [])

  useEffect(() => {
    const fetchAllocationMode = async () => {
      try {
        setLoadingAllocationMode(true)
        const mode = await dutiesService.getDutyAllocationMode()
        setAllocationMode(mode)
      } catch (error) {
        console.error('Failed to fetch duty allocation mode:', error)
        setAllocationMode('manual')
      } finally {
        setLoadingAllocationMode(false)
      }
    }

    fetchAllocationMode()
  }, [])

  /* ── Load saved selections when tab changes ── */
  const loadSelections = useCallback(async () => {
    try {
      const saved = await dutiesService.getDutySelections(activeDutyType)
      setCheckedDuties(saved)
    } catch (err) {
      console.error('Failed to load duty selections:', err)
    }
  }, [activeDutyType])

  useEffect(() => {
    if (activeDutyType) loadSelections()
  }, [activeDutyType, loadSelections])

  useEffect(() => {
    if (activeTab !== 'ASI') return
    if (examDates.length === 0) {
      setSelectedRoomDate('')
      return
    }
    setSelectedRoomDate((prev) => (prev && examDates.includes(prev) ? prev : examDates[0]))
  }, [activeTab, examDates])

  useEffect(() => {
    const loadRoomAssignmentsForDate = async () => {
      if (activeTab !== 'ASI' || !selectedRoomDate) return
      try {
        setLoadingRoomAssignments(true)
        const response = await dutiesService.getDailyDuties(selectedRoomDate)
        const nextAssignments: Record<string, string> = {}
        for (const duty of response?.duties || []) {
          const roomId = String(duty?.room?._id || '')
          const functionaryId = String(duty?.functionary?._id || '')
          if (roomId && functionaryId) nextAssignments[roomId] = functionaryId
        }
        setRoomAssignmentsByDate((prev) => ({
          ...prev,
          [selectedRoomDate]: nextAssignments,
        }))
      } catch (error) {
        console.error('Failed to load room assignments:', error)
      } finally {
        setLoadingRoomAssignments(false)
      }
    }

    loadRoomAssignmentsForDate()
  }, [activeTab, selectedRoomDate])

  /* ── Save handler ── */
  const handleSaveFunctionaries = async () => {
    setIsSaving(true)
    try {
      await dutiesService.saveDutySelections(activeDutyType, checkedDuties)
      toast.success(`Selections saved for ${activeDutyType}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save selections')
    } finally {
      setIsSaving(false)
    }
  }

  const handleModeChange = async (mode: 'auto' | 'manual') => {
    if (mode === allocationMode) return
    try {
      setLoadingAllocationMode(true)
      const savedMode = await dutiesService.updateDutyAllocationMode(mode)
      setAllocationMode(savedMode)
      toast.success(`Duty allocation mode updated to ${savedMode === 'auto' ? 'Auto' : 'Manual'}`)
    } catch (error) {
      console.error('Failed to update duty allocation mode:', error)
      toast.error('Failed to update duty allocation mode')
    } finally {
      setLoadingAllocationMode(false)
    }
  }

  const handleRoomAssignmentChange = (roomId: string, functionaryId: string) => {
    if (!selectedRoomDate) return
    setRoomAssignmentsByDate((prev) => ({
      ...prev,
      [selectedRoomDate]: {
        ...(prev[selectedRoomDate] || {}),
        [roomId]: functionaryId,
      },
    }))
  }

  const selectedRoomDateIndex = useMemo(() => {
    if (!selectedRoomDate) return -1
    return examDates.indexOf(selectedRoomDate)
  }, [examDates, selectedRoomDate])

  const canGoToPreviousRoomDate = selectedRoomDateIndex > 0
  const canGoToNextRoomDate = selectedRoomDateIndex >= 0 && selectedRoomDateIndex < examDates.length - 1

  const goToPreviousRoomDate = () => {
    if (!canGoToPreviousRoomDate) return
    setSelectedRoomDate(examDates[selectedRoomDateIndex - 1])
  }

  const goToNextRoomDate = () => {
    if (!canGoToNextRoomDate) return
    setSelectedRoomDate(examDates[selectedRoomDateIndex + 1])
  }

  const handleSaveRoomAssignments = async () => {
    if (!selectedRoomDate) {
      toast.error('Select exam date first')
      return
    }
    if (allocatedRoomsForSelectedDate.length === 0) {
      toast.error('No allocated rooms found for selected date')
      return
    }

    const assignmentsForDate = roomAssignmentsByDate[selectedRoomDate] || {}
    const orderedFunctionaryIds = allocatedRoomsForSelectedDate.map((room) => String(assignmentsForDate[room._id] || '').trim())

    if (orderedFunctionaryIds.some((value) => !value)) {
      toast.error('Assign an invigilator for each room')
      return
    }

    const uniqueFunctionaryIds = new Set(orderedFunctionaryIds)
    if (uniqueFunctionaryIds.size !== orderedFunctionaryIds.length) {
      toast.error('One invigilator cannot be assigned to multiple rooms on same date')
      return
    }

    setSavingRoomAssignments(true)
    try {
      const response = await dutiesService.assignDailyDuties({
        examDate: selectedRoomDate,
        functionaryIds: orderedFunctionaryIds,
      })

      const nextAssignments: Record<string, string> = {}
      for (const duty of response?.duties || []) {
        const roomId = String(duty?.room?._id || '')
        const functionaryId = String(duty?.functionary?._id || '')
        if (roomId && functionaryId) nextAssignments[roomId] = functionaryId
      }
      setRoomAssignmentsByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: nextAssignments,
      }))

      toast.success(`Room assignments saved for ${formatDateLabel(selectedRoomDate)}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save room assignments')
    } finally {
      setSavingRoomAssignments(false)
    }
  }

  /* ────────── render ────────── */

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Duty Assignment by Date</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select functionaries date-wise and save.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search functionaries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white w-56"
              />
            </div>
            <button
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={filteredFunctionaries.length === 0 || examDates.length === 0 || isSaving}
              onClick={handleSaveFunctionaries}
            >
              {isSaving ? 'Saving...' : 'Save Functionaries'}
            </button>
          </div>
        </div>

        {/* Duty Type Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-0 -mb-px overflow-x-auto" aria-label="Duty type tabs">
            {DUTY_TABS.map((tab) => {
              const isActive = activeTab === tab.key
              const isAsiTab = tab.key === 'ASI'
              const count = tabCounts[tab.key] || 0
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setSearch('')
                  }}
                  className={`
                    relative px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                    ${isAsiTab ? 'bg-blue-50/60 dark:bg-blue-900/20 rounded-t-md' : ''}
                    ${isActive
                      ? `${isAsiTab
                        ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300 shadow-[inset_0_-2px_0_0_rgba(37,99,235,1)]'
                        : 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      }`
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  title={tab.dutyType}
                >
                  {isAsiTab ? (
                    <span className="inline-flex flex-col items-center leading-tight">
                      <span className="mb-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-600 text-white shadow-sm">
                        Invigilators
                      </span>
                      <span className="inline-flex items-center">
                        {tab.label}
                        {count > 0 && (
                          <span
                            className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none
                              ${isActive
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }
                            `}
                          >
                            {count}
                          </span>
                        )}
                      </span>
                    </span>
                  ) : (
                    <>
                      {tab.label}
                      {count > 0 && (
                        <span
                          className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none
                            ${isActive
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }
                          `}
                        >
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Table */}
        {loadingTeachers ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading functionaries...
          </div>
        ) : (
          <div className="overflow-x-auto duties-table-scroll max-h-[370px]">
            <table className="min-w-full border-collapse border-2 border-gray-400 dark:border-gray-500">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider">
                    Sr No
                  </th>
                  <th className="border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider">
                    Functionary Name
                  </th>
                  <th className="border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider">
                    OASIS ID
                  </th>
                  {examDates.map((dateKey) => (
                    <th
                      key={dateKey}
                      className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap"
                    >
                      {formatDateLabel(dateKey)}
                    </th>
                  ))}
                </tr>
                {/* Dynamic Maximum Duties row */}
                <tr>
                  <th
                    colSpan={3}
                    className="border border-gray-400 dark:border-gray-500 px-4 py-2 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-100 uppercase tracking-wide"
                  >
                    {getMaxRowLabel(activeTab)}
                  </th>
                  {examDates.map((dateKey) => {
                    const roomsForDate = Number(requiredRoomsByDate[dateKey] || 0)
                    const candidatesForDate = Number(candidatesByDate[dateKey] || 0)
                    const maxDuties = computeMaxDuties(activeTab, roomsForDate, candidatesForDate)
                    const checked = checkedCountByDate[dateKey] || 0
                    return (
                      <th
                        key={`max-${dateKey}`}
                        className="border border-gray-400 dark:border-gray-500 px-4 py-2 text-center text-[11px] font-semibold whitespace-nowrap"
                      >
                        <span className={checked >= maxDuties && maxDuties > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-100'}>
                          {checked}/{maxDuties}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {filteredFunctionaries.map((func, index) => (
                  <tr key={func._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div className="inline-flex items-center gap-2">
                        <span>{func.name}</span>
                        <span
                          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          title={`Assigned on ${checkedCountByFunctionary[func._id] || 0} date(s)`}
                        >
                          {checkedCountByFunctionary[func._id] || 0}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {func.employeeId || '-'}
                    </td>
                    {examDates.map((dateKey) => {
                      const key = `${func._id}::${dateKey}`
                      const isChecked = !!checkedDuties[key]
                      const roomsForDate = Number(requiredRoomsByDate[dateKey] || 0)
                      const candidatesForDate = Number(candidatesByDate[dateKey] || 0)
                      const maxDuties = computeMaxDuties(activeTab, roomsForDate, candidatesForDate)
                      const dateCheckedCount = checkedCountByDate[dateKey] || 0
                      const maxReached = dateCheckedCount >= maxDuties && maxDuties > 0
                      const isDisabled = maxReached && !isChecked
                      return (
                        <td key={key} className="border border-gray-400 dark:border-gray-500 px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => toggleDuty(func._id, dateKey)}
                            className={`rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isDisabled && maxReached && !isChecked ? `Maximum ${maxDuties} reached for ${formatDateLabel(dateKey)}` : `${func.name} - ${formatDateLabel(dateKey)}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {filteredFunctionaries.length === 0 && (
                  <tr>
                    <td
                      colSpan={3 + examDates.length}
                      className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {allFunctionaries.length === 0
                        ? 'No exam functionaries found.'
                        : `No functionaries assigned as "${activeDutyType}". Assign duty types on the Exam Functionaries page.`
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ASI' && (
          <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Room-wise Invigilator Assignment</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Assign selected invigilators to specific rooms for the chosen date (Auto/Manual applies here).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleModeChange('auto')}
                    disabled={loadingAllocationMode}
                    className={`px-3 py-1.5 text-xs font-semibold ${allocationMode === 'auto'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('manual')}
                    disabled={loadingAllocationMode}
                    className={`px-3 py-1.5 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 ${allocationMode === 'manual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    Manual
                  </button>
                </div>
                <div className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={goToPreviousRoomDate}
                    disabled={!canGoToPreviousRoomDate}
                    className="px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous exam date"
                  >
                    &larr;
                  </button>
                  <div className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-l border-r border-gray-300 dark:border-gray-600 min-w-[90px] text-center">
                    {selectedRoomDate ? formatDateLabel(selectedRoomDate) : '-'}
                  </div>
                  <button
                    type="button"
                    onClick={goToNextRoomDate}
                    disabled={!canGoToNextRoomDate}
                    className="px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next exam date"
                  >
                    &rarr;
                  </button>
                </div>
                <button
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSaveRoomAssignments}
                  disabled={!selectedRoomDate || savingRoomAssignments || loadingRoomAssignments}
                >
                  {savingRoomAssignments ? 'Saving Rooms...' : 'Save Room Assignments'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[320px] duties-table-scroll">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      Room
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      Invigilator
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      OASIS ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {allocatedRoomsForSelectedDate.map((room) => {
                    const selectedFunctionaryId = roomAssignmentsByDate[selectedRoomDate]?.[room._id] || ''
                    const selectedFunctionary = functionaryById[selectedFunctionaryId]
                    const options = [...roomDropdownInvigilators]
                    if (selectedFunctionaryId && selectedFunctionary && !options.some((func) => func._id === selectedFunctionaryId)) {
                      options.push(selectedFunctionary)
                    }

                    return (
                      <tr key={room._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {room.roomNo}{room.roomName ? ` - ${room.roomName}` : ''}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                          <select
                            value={selectedFunctionaryId}
                            onChange={(e) => handleRoomAssignmentChange(room._id, e.target.value)}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white px-2 py-1.5"
                            disabled={loadingRoomAssignments}
                            title={`Assign invigilator for room ${room.roomNo}`}
                          >
                            <option value="">Select invigilator</option>
                            {options.map((func) => (
                              <option key={func._id} value={func._id}>
                                {func.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {selectedFunctionary?.employeeId || '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {allocatedRoomsForSelectedDate.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No rooms are allotted for this date.
                      </td>
                    </tr>
                  )}
                  {allocatedRoomsForSelectedDate.length > 0 && allocationMode === 'manual' && roomDropdownInvigilators.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-xs text-amber-700 dark:text-amber-300">
                        No invigilators selected for this date. Select invigilators in the upper table first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Duties
