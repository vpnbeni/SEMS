import React, { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useTeachers } from '../hooks/useTeachers'
import type { Teacher } from '../services/teacherService'
import { seatingPlanService, type Room, type SeatingPlanTemplateSettings } from '../services/seatingPlanService'
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

const normalizeSubjectCode = (value: string | undefined | null) => {
  return String(value || '').trim().toUpperCase()
}

const normalizeSchoolCode = (value: string | undefined | null) => {
  return String(value || '').trim().toUpperCase()
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

const DEFAULT_DUTY_LIST_COLUMN_WIDTHS = {
  srNo: 50,
  roomNo: 70,
  roomName: 120,
  floor: 70,
  inv1School: 90,
  inv1Teacher: 130,
  inv1TeacherId: 100,
  inv1Signature: 130,
  inv2School: 90,
  inv2Teacher: 130,
  inv2TeacherId: 100,
  inv2Signature: 130,
}

const DUTY_LIST_COLUMN_CONTROLS: Array<{
  key: keyof typeof DEFAULT_DUTY_LIST_COLUMN_WIDTHS
  label: string
  min: number
  max: number
}> = [
  { key: 'srNo', label: 'Sr No', min: 40, max: 220 },
  { key: 'roomNo', label: 'Room No', min: 50, max: 220 },
  { key: 'roomName', label: 'Room Name', min: 80, max: 300 },
  { key: 'floor', label: 'Floor', min: 50, max: 220 },
  { key: 'inv1School', label: 'Inv 1 School', min: 70, max: 260 },
  { key: 'inv1Teacher', label: 'Inv 1 Teacher', min: 80, max: 300 },
  { key: 'inv1TeacherId', label: 'Inv 1 OASIS ID', min: 80, max: 260 },
  { key: 'inv1Signature', label: 'Inv 1 Signature', min: 90, max: 320 },
  { key: 'inv2School', label: 'Inv 2 School', min: 70, max: 260 },
  { key: 'inv2Teacher', label: 'Inv 2 Teacher', min: 80, max: 300 },
  { key: 'inv2TeacherId', label: 'Inv 2 OASIS ID', min: 80, max: 260 },
  { key: 'inv2Signature', label: 'Inv 2 Signature', min: 90, max: 320 },
]

/* ────────── component ────────── */

const Duties: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [examDates, setExamDates] = useState<string[]>([])
  const [requiredRoomsByDate, setRequiredRoomsByDate] = useState<Record<string, number>>({})
  const [candidatesByDate, setCandidatesByDate] = useState<Record<string, number>>({})
  const [examSubjectCodesByDate, setExamSubjectCodesByDate] = useState<Record<string, string[]>>({})
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ASI')
  const [isSaving, setIsSaving] = useState(false)
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('manual')
  const [loadingAllocationMode, setLoadingAllocationMode] = useState(false)
  // Track checked duties: key = "funcId::dateKey", value = true/false
  const [checkedDuties, setCheckedDuties] = useState<Record<string, boolean>>({})
  const [selectedRoomDate, setSelectedRoomDate] = useState('')
  const [roomAssignmentsByDate, setRoomAssignmentsByDate] = useState<Record<string, Record<string, string>>>({})
  const [roomCandidateSchoolCodesByDate, setRoomCandidateSchoolCodesByDate] = useState<
    Record<string, Record<string, string[]>>
  >({})
  const [loadingRoomAssignments, setLoadingRoomAssignments] = useState(false)
  const [savingRoomAssignments, setSavingRoomAssignments] = useState(false)
  const [functionaryDutyListFormat, setFunctionaryDutyListFormat] = useState<{
    pageSize: string
    orientation: 'landscape' | 'portrait'
  }>({
    pageSize: 'A4',
    orientation: 'landscape',
  })
  const [dutyListColumnWidths, setDutyListColumnWidths] = useState(DEFAULT_DUTY_LIST_COLUMN_WIDTHS)
  const [templateSettingsSnapshot, setTemplateSettingsSnapshot] = useState<SeatingPlanTemplateSettings | null>(null)
  const [dutyListLayoutReady, setDutyListLayoutReady] = useState(false)

  const dutyListControlByKey = useMemo(() => {
    const map = new Map<string, { min: number; max: number }>()
    DUTY_LIST_COLUMN_CONTROLS.forEach((control) => {
      map.set(control.key, { min: control.min, max: control.max })
    })
    return map
  }, [])
  const dutyListColumnKeys = useMemo(
    () => DUTY_LIST_COLUMN_CONTROLS.map((control) => control.key),
    []
  )
  const dutyListPreviewTotalWidth = useMemo(
    () => dutyListColumnKeys.reduce((sum, key) => sum + dutyListColumnWidths[key], 0),
    [dutyListColumnKeys, dutyListColumnWidths]
  )

  const dutyListPreviewColumnPercentages = useMemo(() => {
    const total = dutyListPreviewTotalWidth || 1
    return dutyListColumnKeys.reduce((acc, key) => {
      acc[key] = Number(((dutyListColumnWidths[key] / total) * 100).toFixed(4))
      return acc
    }, {} as Record<keyof typeof DEFAULT_DUTY_LIST_COLUMN_WIDTHS, number>)
  }, [dutyListColumnKeys, dutyListColumnWidths, dutyListPreviewTotalWidth])

  const getSchoolInitials = useCallback((functionary?: Teacher) => {
    const schoolName = String(functionary?.schoolName || '').trim()
    if (schoolName) {
      const initials = schoolName
        .split(/\s+/)
        .map((part) => part.slice(0, 1))
        .join('')
        .toUpperCase()
      return initials.slice(0, 6)
    }
    return normalizeSchoolCode(functionary?.schoolCode)
  }, [])

  const startDutyListColumnResize = (boundaryIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()

    const leftKey = dutyListColumnKeys[boundaryIndex]
    const rightKey = dutyListColumnKeys[boundaryIndex + 1]
    if (!leftKey || !rightKey) return

    const leftConfig = dutyListControlByKey.get(leftKey)
    const rightConfig = dutyListControlByKey.get(rightKey)
    if (!leftConfig || !rightConfig) return

    const initialX = event.clientX
    const initialLeft = dutyListColumnWidths[leftKey]
    const initialRight = dutyListColumnWidths[rightKey]

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - initialX

      const minDeltaByLeft = -(initialLeft - leftConfig.min)
      const maxDeltaByRight = initialRight - rightConfig.min
      const maxDeltaByLeftMax = leftConfig.max - initialLeft
      const minDeltaByRightMax = initialRight - rightConfig.max

      const minDelta = Math.max(minDeltaByLeft, minDeltaByRightMax)
      const maxDelta = Math.min(maxDeltaByRight, maxDeltaByLeftMax)
      const boundedDelta = Math.max(minDelta, Math.min(maxDelta, delta))

      setDutyListColumnWidths((prev) => ({
        ...prev,
        [leftKey]: Math.round(initialLeft + boundedDelta),
        [rightKey]: Math.round(initialRight - boundedDelta),
      }))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

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
  const canEnableAutoModeForDate = useMemo(
    () => Boolean(selectedRoomDate) && selectedInvigilatorsForDate.length > 0,
    [selectedRoomDate, selectedInvigilatorsForDate]
  )

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

  const getFunctionarySubjectCodes = useCallback((functionary?: Teacher) => {
    if (!functionary) return []
    const codes = new Set<string>()

    if (functionary.subjectCode) {
      String(functionary.subjectCode)
        .split(',')
        .map((part) => normalizeSubjectCode(part))
        .filter(Boolean)
        .forEach((code) => codes.add(code))
    }

    if (Array.isArray(functionary.subjects)) {
      functionary.subjects.forEach((subject) => {
        if (typeof subject === 'object' && subject && 'code' in subject) {
          const subjectCode = normalizeSubjectCode(String(subject.code || ''))
          if (subjectCode) codes.add(subjectCode)
        }
      })
    }

    return Array.from(codes)
  }, [])

  const getInvigilatorConflict = useCallback((functionaryId: string, dateKey: string) => {
    const examCodes = (examSubjectCodesByDate[dateKey] || []).map((code) => normalizeSubjectCode(code))
    if (examCodes.length === 0) return null
    const functionary = functionaryById[functionaryId]
    const teacherCodes = getFunctionarySubjectCodes(functionary)
    if (teacherCodes.length === 0) return null

    const examCodeSet = new Set(examCodes)
    const conflictingCodes = teacherCodes.filter((code) => examCodeSet.has(code))
    if (conflictingCodes.length === 0) return null

    return {
      functionaryName: functionary?.name || 'Selected functionary',
      conflictingCodes,
    }
  }, [examSubjectCodesByDate, functionaryById, getFunctionarySubjectCodes])

  const getRoomSchoolConflict = useCallback((roomId: string, functionaryId: string, dateKey: string) => {
    const functionary = functionaryById[functionaryId]
    const invigilatorSchoolCode = normalizeSchoolCode(functionary?.schoolCode)
    if (!invigilatorSchoolCode) return null

    const candidateSchoolCodes = (roomCandidateSchoolCodesByDate[dateKey]?.[roomId] || [])
      .map((code) => normalizeSchoolCode(code))
      .filter(Boolean)
    if (candidateSchoolCodes.length === 0) return null

    if (!candidateSchoolCodes.includes(invigilatorSchoolCode)) return null

    return {
      functionaryName: functionary?.name || 'Selected functionary',
      schoolCode: invigilatorSchoolCode,
    }
  }, [functionaryById, roomCandidateSchoolCodesByDate])

  const isInvigilatorAllowedForRoom = useCallback((roomId: string, functionaryId: string, dateKey: string) => {
    if (!functionaryId || !dateKey) return true
    if (getInvigilatorConflict(functionaryId, dateKey)) return false
    if (getRoomSchoolConflict(roomId, functionaryId, dateKey)) return false
    return true
  }, [getInvigilatorConflict, getRoomSchoolConflict])

  const toggleDuty = (funcId: string, dateKey: string) => {
    const key = `${funcId}::${dateKey}`
    const isSelecting = !checkedDuties[key]
    if (activeTab === 'ASI' && isSelecting) {
      const conflict = getInvigilatorConflict(funcId, dateKey)
      if (conflict) {
        const message = `Subject teacher cannot be on invigilation duty. ${conflict.functionaryName} matches exam subject code(s): ${conflict.conflictingCodes.join(', ')} on ${formatDateLabel(dateKey)}.`
        window.alert(message)
        toast.error('Subject teacher cannot be on invigilation duty')
        return
      }
    }
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
        const nextExamSubjectCodesByDate: Record<string, Set<string>> = {}
        const uniqueDates = Array.from(
          new Set(
            entries
              .map((entry) => {
                const dateKey = normalizeDateKey(entry.examDate)
                if (dateKey) {
                  nextRequired[dateKey] = (nextRequired[dateKey] || 0) + Number(entry.roomsNeeded || 0)
                  nextCandidates[dateKey] = (nextCandidates[dateKey] || 0) + Number(entry.candidateCount || 0)
                  if (!nextExamSubjectCodesByDate[dateKey]) {
                    nextExamSubjectCodesByDate[dateKey] = new Set<string>()
                  }
                  const subjectCode = normalizeSubjectCode(entry.subjectCode)
                  if (subjectCode) nextExamSubjectCodesByDate[dateKey].add(subjectCode)
                }
                return dateKey
              })
              .filter(Boolean) as string[]
          )
        ).sort()

        setExamDates(uniqueDates)
        setRequiredRoomsByDate(nextRequired)
        setCandidatesByDate(nextCandidates)
        setExamSubjectCodesByDate(
          Object.fromEntries(
            Object.entries(nextExamSubjectCodesByDate).map(([dateKey, codes]) => [dateKey, Array.from(codes)])
          )
        )
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

  useEffect(() => {
    const fetchFunctionaryDutyListFormat = async () => {
      try {
        const settings = await seatingPlanService.getTemplateSettings()
        setTemplateSettingsSnapshot(settings)
        const pageSize = String(settings?.functionaryDutyList?.pageSize || 'A4').toUpperCase()
        const orientation = String(settings?.functionaryDutyList?.orientation || 'landscape').toLowerCase() === 'portrait'
          ? 'portrait'
          : 'landscape'
        setFunctionaryDutyListFormat({
          pageSize: pageSize || 'A4',
          orientation,
        })
        setDutyListColumnWidths({
          ...DEFAULT_DUTY_LIST_COLUMN_WIDTHS,
          ...(settings?.functionaryDutyList?.columnWidths || {}),
        })
        setDutyListLayoutReady(true)
      } catch (error) {
        console.error('Failed to load functionary duty list format:', error)
      }
    }

    fetchFunctionaryDutyListFormat()
  }, [])

  useEffect(() => {
    if (!dutyListLayoutReady || !templateSettingsSnapshot) return
    const timer = window.setTimeout(async () => {
      try {
        await seatingPlanService.updateTemplateSettings({
          ...templateSettingsSnapshot,
          functionaryDutyList: {
            ...(templateSettingsSnapshot.functionaryDutyList || { pageSize: 'A4', orientation: 'landscape' }),
            pageSize: 'A4',
            orientation: functionaryDutyListFormat.orientation,
            columnWidths: dutyListColumnWidths,
          },
        })
      } catch (error) {
        console.error('Failed to save duty list column widths:', error)
      }
    }, 500)

    return () => window.clearTimeout(timer)
  }, [dutyListColumnWidths, functionaryDutyListFormat.orientation, dutyListLayoutReady, templateSettingsSnapshot])

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
        setRoomCandidateSchoolCodesByDate((prev) => ({
          ...prev,
          [selectedRoomDate]: response?.roomCandidateSchoolCodes || {},
        }))
      } catch (error) {
        console.error('Failed to load room assignments:', error)
      } finally {
        setLoadingRoomAssignments(false)
      }
    }

    loadRoomAssignmentsForDate()
  }, [activeTab, selectedRoomDate])

  useEffect(() => {
    if (activeTab !== 'ASI' || !selectedRoomDate) return
    const assignmentsForDate = roomAssignmentsByDate[selectedRoomDate] || {}
    let changed = false
    const nextAssignments = { ...assignmentsForDate }

    for (const room of allocatedRoomsForSelectedDate) {
      const roomId = String(room?._id || '')
      const assignedFunctionaryId = String(assignmentsForDate[roomId] || '').trim()
      if (!roomId || !assignedFunctionaryId) continue
      if (!isInvigilatorAllowedForRoom(roomId, assignedFunctionaryId, selectedRoomDate)) {
        delete nextAssignments[roomId]
        changed = true
      }
    }

    if (changed) {
      setRoomAssignmentsByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: nextAssignments,
      }))
    }
  }, [activeTab, selectedRoomDate, roomAssignmentsByDate, allocatedRoomsForSelectedDate, isInvigilatorAllowedForRoom])

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
    if (mode === 'auto' && activeTab === 'ASI') {
      if (!selectedRoomDate) {
        toast.error('Select exam date first')
        return
      }
      if (!canEnableAutoModeForDate) {
        const message = `Select invigilators to assign automatically for ${formatDateLabel(selectedRoomDate)}.`
        window.alert(message)
        toast.error('Select invigilators to assign automatically')
        return
      }
    }
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

  const handleRoomAssignmentChange = useCallback((roomId: string, functionaryId: string) => {
    if (!selectedRoomDate) return
    if (functionaryId) {
      const conflict = getInvigilatorConflict(functionaryId, selectedRoomDate)
      if (conflict) {
        const message = `Subject teacher cannot be on invigilation duty. ${conflict.functionaryName} matches exam subject code(s): ${conflict.conflictingCodes.join(', ')} on ${formatDateLabel(selectedRoomDate)}.`
        window.alert(message)
        toast.error('Subject teacher cannot be on invigilation duty')
        return
      }
      const roomSchoolConflict = getRoomSchoolConflict(roomId, functionaryId, selectedRoomDate)
      if (roomSchoolConflict) {
        const message = `Invigilator cannot be of the candidate school. ${roomSchoolConflict.functionaryName} has school code ${roomSchoolConflict.schoolCode}, which matches candidate school code for this room on ${formatDateLabel(selectedRoomDate)}.`
        window.alert(message)
        toast.error('Invigilator cannot be of the candidate school')
        return
      }
    }
    setRoomAssignmentsByDate((prev) => ({
      ...prev,
      [selectedRoomDate]: {
        ...(prev[selectedRoomDate] || {}),
        [roomId]: functionaryId,
      },
    }))
  }, [selectedRoomDate, getInvigilatorConflict, getRoomSchoolConflict])

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

    for (let index = 0; index < allocatedRoomsForSelectedDate.length; index += 1) {
      const room = allocatedRoomsForSelectedDate[index]
      const functionaryId = orderedFunctionaryIds[index]
      const roomSchoolConflict = getRoomSchoolConflict(room._id, functionaryId, selectedRoomDate)
      if (roomSchoolConflict) {
        const roomLabel = `${room.roomNo}${room.roomName ? ` - ${room.roomName}` : ''}`
        const message = `Invigilator cannot be of the candidate school. ${roomSchoolConflict.functionaryName} (${roomSchoolConflict.schoolCode}) conflicts with room ${roomLabel} on ${formatDateLabel(selectedRoomDate)}.`
        window.alert(message)
        toast.error('Invigilator cannot be of the candidate school')
        return
      }
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
      setRoomCandidateSchoolCodesByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: response?.roomCandidateSchoolCodes || prev[selectedRoomDate] || {},
      }))

      toast.success(`Room assignments saved for ${formatDateLabel(selectedRoomDate)}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save room assignments')
    } finally {
      setSavingRoomAssignments(false)
    }
  }

  const handleDownloadRoomAssignments = async () => {
    if (!selectedRoomDate) {
      toast.error('Select exam date first')
      return
    }
    try {
      const blob = await dutiesService.downloadFunctionaryDutyRecord(selectedRoomDate)
      seatingPlanService.downloadPDF(blob, `exam-functionary-duty-record-${selectedRoomDate}.pdf`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to download duty record')
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
                    disabled={loadingAllocationMode || !canEnableAutoModeForDate}
                    className={`px-3 py-1.5 text-xs font-semibold ${allocationMode === 'auto'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    title={!canEnableAutoModeForDate ? 'Select invigilators for this date to enable auto mode' : 'Switch to auto mode'}
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
                  {savingRoomAssignments ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadRoomAssignments}
                  disabled={!selectedRoomDate || loadingRoomAssignments}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download Exam Functionary Duty Record"
                  aria-label="Download Exam Functionary Duty Record"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
                  </svg>
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
                    const options = [...roomDropdownInvigilators].filter((func) =>
                      isInvigilatorAllowedForRoom(room._id, func._id, selectedRoomDate)
                    )
                    if (
                      selectedFunctionaryId &&
                      selectedFunctionary &&
                      isInvigilatorAllowedForRoom(room._id, selectedFunctionaryId, selectedRoomDate) &&
                      !options.some((func) => func._id === selectedFunctionaryId)
                    ) {
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

            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Functionary Duty List Preview</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Stored format metadata for print/export.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    Page Size: {functionaryDutyListFormat.pageSize}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    Orientation: {functionaryDutyListFormat.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1180px] rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="text-[11px] font-medium text-gray-700 dark:text-gray-200 mb-2">
                    A4 / {functionaryDutyListFormat.orientation === 'landscape' ? 'Landscape' : 'Portrait'} preview
                  </div>
                  <div className="rounded border border-gray-600 dark:border-gray-400 bg-white dark:bg-gray-900 p-3 overflow-hidden text-[11px]">
                    <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      <span>Centre No:&nbsp; ________</span>
                      <span>Centre Name:&nbsp; ______________________________</span>
                      <span>Date:&nbsp; __.__.__</span>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-gray-800 dark:text-gray-100 mb-2">
                      Exam Functionaries Duties Record (2025-26)
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[11px] font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      <div>Centre Superintendent: _______________________</div>
                      <div className="text-right">Deputy Centre Superintendent: _______________________</div>
                    </div>

                    <div className="relative inline-block align-top">
                    <table className="w-full table-fixed border-collapse border border-gray-600 dark:border-gray-400 text-[10px]">
                      <colgroup>
                        <col width={`${dutyListPreviewColumnPercentages.srNo}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.roomNo}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.roomName}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.floor}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv1School}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv1Teacher}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv1TeacherId}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv1Signature}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv2School}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv2Teacher}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv2TeacherId}%`} />
                        <col width={`${dutyListPreviewColumnPercentages.inv2Signature}%`} />
                      </colgroup>
                      <thead>
                        <tr className="text-[10px] font-semibold text-gray-800 dark:text-gray-100">
                          <th rowSpan={2} className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            Sr No
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(0, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th rowSpan={2} className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            Room No
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(1, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th rowSpan={2} className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            Room Name
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(2, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th rowSpan={2} className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            Floor
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(3, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th colSpan={4} className="border border-gray-600 dark:border-gray-400 px-1 py-1">Invigilator 1</th>
                          <th colSpan={4} className="border border-gray-600 dark:border-gray-400 px-1 py-1">Invigilator 2</th>
                        </tr>
                        <tr className="text-[10px] font-semibold text-gray-800 dark:text-gray-100">
                          <th className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            School
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(4, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            Invigilator Name
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(5, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            OASIS ID
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(6, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            Signature
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(7, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            School
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(8, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            Invigilator Name
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(9, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th className="relative border border-gray-600 dark:border-gray-400 px-1 py-1">
                            OASIS ID
                            <div
                              className="absolute top-0 right-0 h-full w-3 cursor-col-resize z-30 bg-blue-500/10 hover:bg-blue-500/25"
                              onMouseDown={(event) => startDutyListColumnResize(10, event)}
                              title="Drag to resize column"
                            />
                          </th>
                          <th className="border border-gray-600 dark:border-gray-400 px-1 py-1">Signature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(allocatedRoomsForSelectedDate.length > 0 ? allocatedRoomsForSelectedDate : Array.from({ length: 10 }).map((_, i) => ({
                          _id: `preview-${i}`,
                          roomNo: `${i + 1}`,
                          roomName: '',
                          floor: '',
                        } as Room))).slice(0, 14).map((room, idx) => {
                          const assignedFunctionaryId = String(roomAssignmentsByDate[selectedRoomDate]?.[room._id] || '')
                          const invigilator = functionaryById[assignedFunctionaryId]
                          return (
                          <tr key={room._id || `row-${idx}`}>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1 text-center">{idx + 1}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1 text-center">{room.roomNo || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{room.roomName || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{room.floor || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{getSchoolInitials(invigilator)}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{invigilator?.name || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{invigilator?.employeeId || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1" />
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{getSchoolInitials(invigilator)}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{invigilator?.name || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{invigilator?.employeeId || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1" />
                          </tr>
                        )})}
                      </tbody>
                    </table>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-4 text-[10px] text-gray-800 dark:text-gray-100">
                      <div>
                        <div className="font-semibold mb-2">Frisking Duty</div>
                        <div>1 ___________________________</div>
                        <div className="mt-2">2 ___________________________</div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2">CCTV Invigilation</div>
                        <div>1 ___________________________</div>
                        <div className="mt-2">2 ___________________________</div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2">Class IV Duty</div>
                        <div className="flex gap-4">
                          <span>1 ___________________</span>
                          <span>2 ___________________</span>
                        </div>
                        <div className="mt-2">3 ___________________</div>
                      </div>
                    </div>

                    <div className="mt-5 text-right text-[11px] font-semibold text-gray-800 dark:text-gray-100">
                      Centre Superintendent
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Duties
