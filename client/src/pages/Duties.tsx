import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Document, Page, pdfjs } from 'react-pdf'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useTeachers } from '../hooks/useTeachers'
import type { Teacher } from '../services/teacherService'
import { seatingPlanService, type Room, type SeatingPlanTemplateSettings } from '../services/seatingPlanService'
import centreDatesheetService from '../services/centreDatesheetService'
import dutiesService from '../services/dutiesService'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

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
  const dutiesTableRef = useRef<HTMLDivElement | null>(null)
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
  const [roomAssignmentsByDateSecond, setRoomAssignmentsByDateSecond] = useState<Record<string, Record<string, string>>>({})
  const [roomCandidateSchoolCodesByDate, setRoomCandidateSchoolCodesByDate] = useState<
    Record<string, Record<string, string[]>>
  >({})
  const [roomSubjectCodesByDate, setRoomSubjectCodesByDate] = useState<
    Record<string, Record<string, string[]>>
  >({})
  const [roomRollNumbersByDate, setRoomRollNumbersByDate] = useState<
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
  const [dutyPdfPreviewUrl, setDutyPdfPreviewUrl] = useState<string | null>(null)
  const [showDutyPdfPreview, setShowDutyPdfPreview] = useState(false)
  const [loadingDutyPdfPreview, setLoadingDutyPdfPreview] = useState(false)
  const [dutyPdfPageCount, setDutyPdfPageCount] = useState(0)
  const [dutyPdfRenderError, setDutyPdfRenderError] = useState<string | null>(null)
  const [invigilatorDutySort, setInvigilatorDutySort] = useState<'none' | 'asc' | 'desc'>('none')

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

  useEffect(() => {
    return () => {
      if (dutyPdfPreviewUrl) URL.revokeObjectURL(dutyPdfPreviewUrl)
    }
  }, [dutyPdfPreviewUrl])

  const closeDutyPdfPreview = useCallback(() => {
    setShowDutyPdfPreview(false)
    setDutyPdfPageCount(0)
    setDutyPdfRenderError(null)
    setDutyPdfPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return null
    })
  }, [])

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
    return [...(teachersData?.items || [])].sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
    )
  }, [teachersData])

  /* ── Filter by active tab + search ── */
  const activeDutyType = DUTY_TABS.find((t) => t.key === activeTab)?.dutyType || ''

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

  const selectedInvigilatorCountForRoomDate = useMemo(() => {
    if (!selectedRoomDate) return 0
    let count = 0
    const suffix = `::${selectedRoomDate}`
    for (const [key, value] of Object.entries(checkedDuties)) {
      if (value && key.endsWith(suffix)) count += 1
    }
    return count
  }, [selectedRoomDate, checkedDuties])

  const canEnableAutoModeForDate = useMemo(
    () => Boolean(selectedRoomDate) && selectedInvigilatorCountForRoomDate >= allocatedRoomsForSelectedDate.length * 2,
    [selectedRoomDate, selectedInvigilatorCountForRoomDate, allocatedRoomsForSelectedDate.length]
  )

  const isFunctionaryAssignedElsewhere = useCallback(
    (dateKey: string, functionaryId: string, currentRoomId: string, slot: 'first' | 'second') => {
      const normalizedFunctionaryId = String(functionaryId || '').trim()
      const normalizedCurrentRoomId = String(currentRoomId || '').trim()
      if (!dateKey || !normalizedFunctionaryId || !normalizedCurrentRoomId) return false

      const firstMap = roomAssignmentsByDate[dateKey] || {}
      const secondMap = roomAssignmentsByDateSecond[dateKey] || {}

      for (const [roomIdRaw, assignedIdRaw] of Object.entries(firstMap)) {
        const roomId = String(roomIdRaw || '').trim()
        const assignedId = String(assignedIdRaw || '').trim()
        if (!roomId || !assignedId) continue
        const isSameSlot = slot === 'first' && roomId === normalizedCurrentRoomId
        if (isSameSlot) continue
        if (assignedId === normalizedFunctionaryId) return true
      }

      for (const [roomIdRaw, assignedIdRaw] of Object.entries(secondMap)) {
        const roomId = String(roomIdRaw || '').trim()
        const assignedId = String(assignedIdRaw || '').trim()
        if (!roomId || !assignedId) continue
        const isSameSlot = slot === 'second' && roomId === normalizedCurrentRoomId
        if (isSameSlot) continue
        if (assignedId === normalizedFunctionaryId) return true
      }

      return false
    },
    [roomAssignmentsByDate, roomAssignmentsByDateSecond]
  )

  const getRemainingInvigilatorIdsForSlot = useCallback(
    (dateKey: string, roomId: string, slot: 'first' | 'second') => {
      const selectedIds = new Set(
        selectedInvigilatorsForDate
          .map((func) => String(func?._id || '').trim())
          .filter(Boolean)
      )
      if (!dateKey || !roomId) return selectedIds

      const firstMap = roomAssignmentsByDate[dateKey] || {}
      const secondMap = roomAssignmentsByDateSecond[dateKey] || {}
      const normalizedRoomId = String(roomId || '').trim()

      for (const [mappedRoomIdRaw, assignedIdRaw] of Object.entries(firstMap)) {
        const mappedRoomId = String(mappedRoomIdRaw || '').trim()
        const assignedId = String(assignedIdRaw || '').trim()
        if (!assignedId) continue
        const keepCurrentSlot = slot === 'first' && mappedRoomId === normalizedRoomId
        if (!keepCurrentSlot) selectedIds.delete(assignedId)
      }
      for (const [mappedRoomIdRaw, assignedIdRaw] of Object.entries(secondMap)) {
        const mappedRoomId = String(mappedRoomIdRaw || '').trim()
        const assignedId = String(assignedIdRaw || '').trim()
        if (!assignedId) continue
        const keepCurrentSlot = slot === 'second' && mappedRoomId === normalizedRoomId
        if (!keepCurrentSlot) selectedIds.delete(assignedId)
      }

      return selectedIds
    },
    [selectedInvigilatorsForDate, roomAssignmentsByDate, roomAssignmentsByDateSecond]
  )

  /* ── Count per tab ── */
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tab of DUTY_TABS) {
      counts[tab.key] = allFunctionaries.filter((f) => f.dutyType === tab.dutyType).length
    }
    return counts
  }, [allFunctionaries])

  /* ── Count checked duties per date (only for active functionaries in this tab) ── */
  const activeFunctionaryIdSet = useMemo(() => {
    const set = new Set<string>()
    allFunctionaries.filter((f) => hasDutyType(f, activeDutyType)).forEach((f) => set.add(String(f._id)))
    return set
  }, [allFunctionaries, activeDutyType])

  const checkedCountByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of Object.keys(checkedDuties)) {
      if (!checkedDuties[key]) continue
      const [funcId, dateKey] = key.split('::')
      // Only count slots for functionaries that currently exist in this tab
      if (!funcId || !dateKey || !activeFunctionaryIdSet.has(funcId)) continue
      counts[dateKey] = (counts[dateKey] || 0) + 1
    }
    return counts
  }, [checkedDuties, activeFunctionaryIdSet])

  /* ── Count checked duties per functionary (only for active functionaries in this tab) ── */
  const checkedCountByFunctionary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of Object.keys(checkedDuties)) {
      if (!checkedDuties[key]) continue
      const functionaryId = key.split('::')[0]
      if (!functionaryId || !activeFunctionaryIdSet.has(functionaryId)) continue
      counts[functionaryId] = (counts[functionaryId] || 0) + 1
    }
    return counts
  }, [checkedDuties, activeFunctionaryIdSet])

  const filteredFunctionaries = useMemo(() => {
    let list = allFunctionaries.filter((f) => hasDutyType(f, activeDutyType))
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((f) => {
        const haystack = `${f.name} ${f.employeeId || ''}`.toLowerCase()
        return haystack.includes(term)
      })
    }
    if (invigilatorDutySort !== 'none') {
      list = [...list].sort((a, b) => {
        const aCount = checkedCountByFunctionary[a._id] || 0
        const bCount = checkedCountByFunctionary[b._id] || 0
        if (aCount === bCount) {
          return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
            sensitivity: 'base',
          })
        }
        return invigilatorDutySort === 'asc' ? aCount - bCount : bCount - aCount
      })
    }
    return list
  }, [allFunctionaries, activeDutyType, search, activeTab, invigilatorDutySort, checkedCountByFunctionary])

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

  const getRoomSubjectConflict = useCallback((roomId: string, functionaryId: string, dateKey: string) => {
    const roomCodes = (roomSubjectCodesByDate[dateKey]?.[roomId] || []).map((code) => normalizeSubjectCode(code))
    if (roomCodes.length === 0) return null
    const functionary = functionaryById[functionaryId]
    const teacherCodes = getFunctionarySubjectCodes(functionary)
    if (teacherCodes.length === 0) return null

    const roomCodeSet = new Set(roomCodes)
    const conflictingCodes = teacherCodes.filter((code) => roomCodeSet.has(code))
    if (conflictingCodes.length === 0) return null

    return {
      functionaryName: functionary?.name || 'Selected functionary',
      conflictingCodes,
    }
  }, [roomSubjectCodesByDate, functionaryById, getFunctionarySubjectCodes])

  const getDateSubjectConflict = useCallback((functionaryId: string, dateKey: string) => {
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

  const getCandidateOverlapConflict = useCallback((roomId: string, functionaryId: string, dateKey: string) => {
    const functionary = functionaryById[functionaryId]
    if (!functionary?.supervisionHistory?.length) return null

    const supervisedRollNos = new Set<string>()
    for (const entry of functionary.supervisionHistory) {
      if (entry.examDate === dateKey) continue
      for (const r of (entry.rollNumbers || [])) {
        supervisedRollNos.add(String(r).trim().toUpperCase())
      }
    }
    if (supervisedRollNos.size === 0) return null

    const roomRollNos = roomRollNumbersByDate[dateKey]?.[roomId]
    if (!roomRollNos?.length) return null

    for (const rollNo of roomRollNos) {
      if (supervisedRollNos.has(String(rollNo).trim().toUpperCase())) {
        return {
          functionaryName: functionary?.name || 'Selected functionary',
          overlappingRollNo: rollNo,
        }
      }
    }
    return null
  }, [functionaryById, roomRollNumbersByDate])

  const isInvigilatorAllowedForRoom = useCallback((roomId: string, functionaryId: string, dateKey: string) => {
    if (!functionaryId || !dateKey) return true
    if (getRoomSubjectConflict(roomId, functionaryId, dateKey)) return false
    if (getRoomSchoolConflict(roomId, functionaryId, dateKey)) return false
    if (getCandidateOverlapConflict(roomId, functionaryId, dateKey)) return false
    return true
  }, [getRoomSubjectConflict, getRoomSchoolConflict, getCandidateOverlapConflict])

  const toggleDuty = (funcId: string, dateKey: string) => {
    const key = `${funcId}::${dateKey}`
    const isSelecting = !checkedDuties[key]
    if (isSelecting) {
      // Enforce max-per-date limit
      const roomsForDate = Number(requiredRoomsByDate[dateKey] || 0)
      const candidatesForDate = Number(candidatesByDate[dateKey] || 0)
      const maxDuties = computeMaxDuties(activeTab, roomsForDate, candidatesForDate)
      const currentCount = checkedCountByDate[dateKey] || 0
      if (maxDuties > 0 && currentCount >= maxDuties) {
        toast.error(`Maximum ${maxDuties} functionar${maxDuties === 1 ? 'y' : 'ies'} already assigned for ${formatDateLabel(dateKey)}.`)
        return
      }
      if (activeTab === 'ASI') {
        const conflict = getDateSubjectConflict(funcId, dateKey)
        if (conflict) {
          toast(
            `${conflict.functionaryName} matches subject ${conflict.conflictingCodes.join(', ')}. Assign only in rooms other than this subject.`,
            {
              icon: 'i',
            }
          )
        }
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

        const rawEntries = Array.isArray(datesheetRes?.data) ? datesheetRes.data : []
        // Only include dates that have at least one exam with candidates
        const entries = rawEntries.filter(
          (entry: { candidateCount?: number }) => Number(entry?.candidateCount ?? 0) > 0
        )
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
        if (mode === 'auto') {
          // Keep manual as default landing mode for Duties page.
          await dutiesService.updateDutyAllocationMode('manual')
          setAllocationMode('manual')
        } else {
          setAllocationMode('manual')
        }
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

  /* ── Auto-scroll duties table to today's date column (or nearest future exam date) ── */
  useEffect(() => {
    if (loadingTeachers || examDates.length === 0) return
    // Use setTimeout to let the table DOM render fully after tab switch / data load
    const timer = setTimeout(() => {
      const wrap = dutiesTableRef.current
      if (!wrap) return
      const todayKey = new Date().toISOString().slice(0, 10)
      // Find today or the nearest future exam date
      const targetDate = examDates.includes(todayKey)
        ? todayKey
        : examDates.find((d) => d >= todayKey) || examDates[examDates.length - 1]
      if (!targetDate) return
      const th = wrap.querySelector<HTMLElement>(`[data-date="${targetDate}"]`)
      if (!th) return
      // Measure the actual sticky columns width from the first date column's offsetLeft
      const firstDateTh = wrap.querySelector<HTMLElement>(`[data-date="${examDates[0]}"]`)
      const stickyWidth = firstDateTh ? firstDateTh.offsetLeft : 0
      wrap.scrollLeft = th.offsetLeft - stickyWidth
    }, 150)
    return () => clearTimeout(timer)
  }, [examDates, activeTab, loadingTeachers])

  /* Auto-select room date: today if it's an exam date, else next exam date */
  const getDefaultRoomDate = useCallback((dates: string[]): string => {
    if (dates.length === 0) return ''
    const today = normalizeDateKey(new Date())
    if (dates.includes(today)) return today
    const next = dates.find((d) => d >= today)
    return next || dates[dates.length - 1]
  }, [])

  useEffect(() => {
    if (activeTab !== 'ASI') return
    if (examDates.length === 0) {
      setSelectedRoomDate('')
      return
    }
    setSelectedRoomDate((prev) => (prev && examDates.includes(prev) ? prev : getDefaultRoomDate(examDates)))
  }, [activeTab, examDates, getDefaultRoomDate])

  useEffect(() => {
    const loadRoomAssignmentsForDate = async () => {
      if (activeTab !== 'ASI' || !selectedRoomDate) return
      try {
        setLoadingRoomAssignments(true)
        const response = await dutiesService.getDailyDuties(selectedRoomDate)
        const nextAssignments: Record<string, string> = {}
        const nextAssignmentsSecond: Record<string, string> = {}
        for (const duty of response?.duties || []) {
          const roomId = String(duty?.room?._id || '')
          const functionaryId = String(duty?.functionary?._id || '')
          const functionary2Id = String(duty?.functionary2?._id || '')
          if (roomId && functionaryId) nextAssignments[roomId] = functionaryId
          if (roomId && functionary2Id) nextAssignmentsSecond[roomId] = functionary2Id
        }
        setRoomAssignmentsByDate((prev) => ({
          ...prev,
          [selectedRoomDate]: nextAssignments,
        }))
        setRoomAssignmentsByDateSecond((prev) => ({
          ...prev,
          [selectedRoomDate]: nextAssignmentsSecond,
        }))
        setRoomCandidateSchoolCodesByDate((prev) => ({
          ...prev,
          [selectedRoomDate]: response?.roomCandidateSchoolCodes || {},
        }))
        setRoomSubjectCodesByDate((prev) => ({
          ...prev,
          [selectedRoomDate]: response?.roomSubjectCodes || {},
        }))
        setRoomRollNumbersByDate((prev) => ({
          ...prev,
          [selectedRoomDate]: response?.roomRollNumbers || {},
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
    const secondAssignmentsForDate = roomAssignmentsByDateSecond[selectedRoomDate] || {}
    let changed = false
    const nextAssignments = { ...assignmentsForDate }
    const nextSecondAssignments = { ...secondAssignmentsForDate }

    for (const room of allocatedRoomsForSelectedDate) {
      const roomId = String(room?._id || '')
      const assignedFunctionaryId = String(assignmentsForDate[roomId] || '').trim()
      const assignedFunctionary2Id = String(secondAssignmentsForDate[roomId] || '').trim()
      if (!roomId) continue
      if (assignedFunctionaryId && !isInvigilatorAllowedForRoom(roomId, assignedFunctionaryId, selectedRoomDate)) {
        delete nextAssignments[roomId]
        changed = true
      }
      if (assignedFunctionary2Id && !isInvigilatorAllowedForRoom(roomId, assignedFunctionary2Id, selectedRoomDate)) {
        delete nextSecondAssignments[roomId]
        changed = true
      }
      if (assignedFunctionaryId && assignedFunctionary2Id && assignedFunctionaryId === assignedFunctionary2Id) {
        delete nextSecondAssignments[roomId]
        changed = true
      }
    }

    if (changed) {
      setRoomAssignmentsByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: nextAssignments,
      }))
      setRoomAssignmentsByDateSecond((prev) => ({
        ...prev,
        [selectedRoomDate]: nextSecondAssignments,
      }))
    }
  }, [
    activeTab,
    selectedRoomDate,
    roomAssignmentsByDate,
    roomAssignmentsByDateSecond,
    allocatedRoomsForSelectedDate,
    isInvigilatorAllowedForRoom,
  ])

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

  const runAutoAssignmentForSelectedDate = useCallback(async (showSuccessToast = true) => {
    if (!selectedRoomDate) return false
    if (allocatedRoomsForSelectedDate.length === 0) return false

    const orderedFunctionaryIds = selectedInvigilatorsForDate
      .map((func) => String(func._id || '').trim())
      .filter(Boolean)

    const requiredForAuto = allocatedRoomsForSelectedDate.length * 2
    if (orderedFunctionaryIds.length < requiredForAuto) {
      toast.error(`Select at least ${requiredForAuto} invigilators for auto assignment`)
      return false
    }

    try {
      setSavingRoomAssignments(true)
      const response = await dutiesService.assignDailyDuties({
        examDate: selectedRoomDate,
        functionaryIds: orderedFunctionaryIds,
      })

      const nextAssignments: Record<string, string> = {}
      const nextAssignmentsSecond: Record<string, string> = {}
      for (const duty of response?.duties || []) {
        const roomId = String(duty?.room?._id || '')
        const functionaryId = String(duty?.functionary?._id || '')
        const functionary2Id = String(duty?.functionary2?._id || '')
        if (roomId && functionaryId) nextAssignments[roomId] = functionaryId
        if (roomId && functionary2Id) nextAssignmentsSecond[roomId] = functionary2Id
      }
      setRoomAssignmentsByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: nextAssignments,
      }))
      setRoomAssignmentsByDateSecond((prev) => ({
        ...prev,
        [selectedRoomDate]: nextAssignmentsSecond,
      }))
      setRoomCandidateSchoolCodesByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: response?.roomCandidateSchoolCodes || prev[selectedRoomDate] || {},
      }))
      setRoomSubjectCodesByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: response?.roomSubjectCodes || prev[selectedRoomDate] || {},
      }))
      setRoomRollNumbersByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: response?.roomRollNumbers || prev[selectedRoomDate] || {},
      }))

      if (showSuccessToast) {
        toast.success(`Auto-assigned invigilators for ${formatDateLabel(selectedRoomDate)}`)
      }
      return true
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to auto-assign invigilators')
      return false
    } finally {
      setSavingRoomAssignments(false)
    }
  }, [selectedRoomDate, allocatedRoomsForSelectedDate, selectedInvigilatorsForDate])

  const handleModeChange = async (mode: 'auto' | 'manual') => {
    if (mode === allocationMode) return
    if (mode === 'auto' && activeTab === 'ASI') {
      if (!selectedRoomDate) {
        toast.error('Select exam date first')
        return
      }
      if (selectedInvigilatorCountForRoomDate === 0) {
        toast.error('No functionaries selected for the date.')
        return
      }
      if (!canEnableAutoModeForDate) {
        toast.error(`Select invigilators to assign automatically for ${formatDateLabel(selectedRoomDate)}`)
        return
      }
    }
    try {
      setLoadingAllocationMode(true)
      const savedMode = await dutiesService.updateDutyAllocationMode(mode)
      setAllocationMode(savedMode)
      if (savedMode === 'auto' && activeTab === 'ASI') {
        await runAutoAssignmentForSelectedDate(true)
      }
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
      const conflict = getRoomSubjectConflict(roomId, functionaryId, selectedRoomDate)
      if (conflict) {
        toast.error(
          `Subject teacher cannot be on invigilation duty in this room. ${conflict.functionaryName} matches ${conflict.conflictingCodes.join(', ')}`
        )
        return
      }
      const roomSchoolConflict = getRoomSchoolConflict(roomId, functionaryId, selectedRoomDate)
      if (roomSchoolConflict) {
        toast.error(
          `Invigilator cannot be of candidate school. ${roomSchoolConflict.functionaryName} (school code: ${roomSchoolConflict.schoolCode}) matches candidates in this room. Check candidate data if incorrect.`
        )
        return
      }
      const candidateOverlap = getCandidateOverlapConflict(roomId, functionaryId, selectedRoomDate)
      if (candidateOverlap) {
        toast.error(
          `Candidate overlap: ${candidateOverlap.functionaryName} already supervised candidate ${candidateOverlap.overlappingRollNo} on a previous date.`
        )
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
  }, [selectedRoomDate, getRoomSubjectConflict, getRoomSchoolConflict, getCandidateOverlapConflict])

  const handleRoomAssignmentSecondChange = useCallback((roomId: string, functionaryId: string) => {
    if (!selectedRoomDate) return
    const assignedFirst = String(roomAssignmentsByDate[selectedRoomDate]?.[roomId] || '').trim()
    if (functionaryId && assignedFirst && functionaryId === assignedFirst) {
      toast.error('Invigilator 1 and Invigilator 2 cannot be same for a room')
      return
    }
    if (functionaryId) {
      const conflict = getRoomSubjectConflict(roomId, functionaryId, selectedRoomDate)
      if (conflict) {
        toast.error(
          `Subject teacher cannot be on invigilation duty in this room. ${conflict.functionaryName} matches ${conflict.conflictingCodes.join(', ')}`
        )
        return
      }
      const roomSchoolConflict = getRoomSchoolConflict(roomId, functionaryId, selectedRoomDate)
      if (roomSchoolConflict) {
        toast.error(
          `Invigilator cannot be of candidate school. ${roomSchoolConflict.functionaryName} (school code: ${roomSchoolConflict.schoolCode}) matches candidates in this room. Check candidate data if incorrect.`
        )
        return
      }
      const candidateOverlap = getCandidateOverlapConflict(roomId, functionaryId, selectedRoomDate)
      if (candidateOverlap) {
        toast.error(
          `Candidate overlap: ${candidateOverlap.functionaryName} already supervised candidate ${candidateOverlap.overlappingRollNo} on a previous date.`
        )
        return
      }
    }
    setRoomAssignmentsByDateSecond((prev) => ({
      ...prev,
      [selectedRoomDate]: {
        ...(prev[selectedRoomDate] || {}),
        [roomId]: functionaryId,
      },
    }))
  }, [selectedRoomDate, roomAssignmentsByDate, getRoomSubjectConflict, getRoomSchoolConflict, getCandidateOverlapConflict])

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

    let orderedFunctionaryIds: string[] = []
    let orderedSecondFunctionaryIds: string[] = []
    if (allocationMode === 'auto') {
      await runAutoAssignmentForSelectedDate(true)
      return
    } else {
      const assignmentsForDate = roomAssignmentsByDate[selectedRoomDate] || {}
      const secondAssignmentsForDate = roomAssignmentsByDateSecond[selectedRoomDate] || {}
      orderedFunctionaryIds = allocatedRoomsForSelectedDate.map((room) => String(assignmentsForDate[room._id] || '').trim())
      orderedSecondFunctionaryIds = allocatedRoomsForSelectedDate.map((room) =>
        String(secondAssignmentsForDate[room._id] || '').trim()
      )

      if (orderedFunctionaryIds.some((value) => !value) || orderedSecondFunctionaryIds.some((value) => !value)) {
        toast.error('Assign both invigilators for each room')
        return
      }

      const hasSameInRoom = orderedFunctionaryIds.some((firstId, index) => firstId === orderedSecondFunctionaryIds[index])
      if (hasSameInRoom) {
        toast.error('Invigilator 1 and Invigilator 2 cannot be same for any room')
        return
      }

      const uniqueFunctionaryIds = new Set([...orderedFunctionaryIds, ...orderedSecondFunctionaryIds])
      if (uniqueFunctionaryIds.size !== orderedFunctionaryIds.length + orderedSecondFunctionaryIds.length) {
        toast.error('One invigilator cannot be assigned to multiple rooms on same date')
        return
      }

    }

    setSavingRoomAssignments(true)
    try {
      const response = await dutiesService.assignDailyDuties({
        examDate: selectedRoomDate,
        functionaryIds: orderedFunctionaryIds,
        secondFunctionaryIds: orderedSecondFunctionaryIds,
      })

      const nextAssignments: Record<string, string> = {}
      const nextAssignmentsSecond: Record<string, string> = {}
      for (const duty of response?.duties || []) {
        const roomId = String(duty?.room?._id || '')
        const functionaryId = String(duty?.functionary?._id || '')
        const functionary2Id = String(duty?.functionary2?._id || '')
        if (roomId && functionaryId) nextAssignments[roomId] = functionaryId
        if (roomId && functionary2Id) nextAssignmentsSecond[roomId] = functionary2Id
      }
      setRoomAssignmentsByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: nextAssignments,
      }))
      setRoomAssignmentsByDateSecond((prev) => ({
        ...prev,
        [selectedRoomDate]: nextAssignmentsSecond,
      }))
      setRoomCandidateSchoolCodesByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: response?.roomCandidateSchoolCodes || prev[selectedRoomDate] || {},
      }))
      setRoomSubjectCodesByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: response?.roomSubjectCodes || prev[selectedRoomDate] || {},
      }))
      setRoomRollNumbersByDate((prev) => ({
        ...prev,
        [selectedRoomDate]: response?.roomRollNumbers || prev[selectedRoomDate] || {},
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
    setLoadingDutyPdfPreview(true)
    try {
      const rawBlob = await dutiesService.downloadFunctionaryDutyRecord(selectedRoomDate)
      if (!rawBlob || rawBlob.size === 0) {
        toast.error('Generated file is empty. Please try again.')
        return
      }

      const blobType = String(rawBlob.type || '').toLowerCase()
      if (blobType.includes('application/json') || blobType.includes('text/plain') || blobType.includes('text/html')) {
        const rawText = await rawBlob.text()
        let message = 'Unable to generate PDF preview.'
        try {
          const parsed = JSON.parse(rawText)
          message = parsed?.message || parsed?.error || message
        } catch {
          if (rawText?.trim()) message = rawText
        }
        toast.error(message)
        return
      }

      const pdfBlob = rawBlob.type === 'application/pdf'
        ? rawBlob
        : new Blob([rawBlob], { type: 'application/pdf' })
      const objectUrl = URL.createObjectURL(pdfBlob)
      setDutyPdfPageCount(0)
      setDutyPdfRenderError(null)
      setDutyPdfPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl)
        return objectUrl
      })
      setShowDutyPdfPreview(true)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate duty record preview')
    } finally {
      setLoadingDutyPdfPreview(false)
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
          <div className="overflow-x-auto duties-table-scroll" ref={dutiesTableRef}>
            <table className="min-w-full border-separate border-spacing-0 border-2 border-gray-400 dark:border-gray-500">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 w-[4.5rem] min-w-[4.5rem] border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]">
                    Sr No
                  </th>
                  <th className="sticky left-[4.5rem] z-20 w-52 min-w-52 border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]">
                    Functionary Name
                  </th>
                  <th
                    className="sticky left-[17.5rem] z-20 w-20 min-w-20 border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]"
                    onClick={() =>
                      setInvigilatorDutySort((prev) =>
                        prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none'
                      )
                    }
                  >
                    Duties
                    {invigilatorDutySort !== 'none' && (
                      <span className="ml-1 text-[10px]">
                        {invigilatorDutySort === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th
                    className="sticky left-[22.5rem] z-20 w-28 min-w-28 border border-gray-400 dark:border-gray-500 px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]"
                  >
                    OASIS ID
                  </th>
                  {examDates.map((dateKey) => (
                    <th
                      key={dateKey}
                      data-date={dateKey}
                      className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap"
                    >
                      {formatDateLabel(dateKey)}
                    </th>
                  ))}
                </tr>
                {/* Dynamic Maximum Duties row */}
                <tr>
                  {/* Label cell spanning Sr No + Functionary Name */}
                  <th
                    colSpan={2}
                    className="sticky left-0 z-20 border border-gray-400 dark:border-gray-500 px-4 py-2 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-100 uppercase tracking-wide whitespace-nowrap bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]"
                  >
                    {getMaxRowLabel(activeTab)}
                  </th>
                  {/* Total assigned / total max spanning Duties + OASIS ID */}
                  <th
                    colSpan={2}
                    className="sticky left-[17.5rem] z-20 border border-gray-400 dark:border-gray-500 px-4 py-2 text-center text-[11px] font-semibold whitespace-nowrap bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]"
                  >
                    {(() => {
                      const totalAssigned = examDates.reduce((sum, dk) => sum + (checkedCountByDate[dk] || 0), 0)
                      const totalMax = examDates.reduce((sum, dk) => {
                        const rooms = Number(requiredRoomsByDate[dk] || 0)
                        const candidates = Number(candidatesByDate[dk] || 0)
                        return sum + computeMaxDuties(activeTab, rooms, candidates)
                      }, 0)
                      return (
                        <span
                          className={
                            totalMax <= 0
                              ? 'text-gray-700 dark:text-gray-100'
                              : totalAssigned > totalMax
                                ? 'text-amber-600 dark:text-amber-400'
                                : totalAssigned === totalMax
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {totalAssigned}/{totalMax}
                        </span>
                      )
                    })()}
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
                        <span
                          className={
                            maxDuties <= 0
                              ? 'text-gray-700 dark:text-gray-100'
                              : checked > maxDuties
                                ? 'text-amber-600 dark:text-amber-400'
                                : checked === maxDuties
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {checked}/{maxDuties}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {filteredFunctionaries.map((func, index) => (
                  <tr key={func._id} className="group hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="sticky left-0 z-[5] w-[4.5rem] min-w-[4.5rem] border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">
                      {index + 1}
                    </td>
                    <td className="sticky left-[4.5rem] z-[5] w-52 min-w-52 border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">
                      <span>{String(func.name || '').toUpperCase()}</span>
                    </td>
                    <td className="sticky left-[17.5rem] z-[5] w-20 min-w-20 border border-gray-400 dark:border-gray-500 px-4 py-4 text-center text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">
                      {checkedCountByFunctionary[func._id] || 0}
                    </td>
                    <td
                      className="sticky left-[22.5rem] z-[5] w-28 min-w-28 border border-gray-400 dark:border-gray-500 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]"
                    >
                      {activeTab === 'CL4' ? 'N/A' : (func.employeeId || '-')}
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
                      colSpan={4 + examDates.length}
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
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Manual</span>
                  <button
                    type="button"
                    onClick={() => handleModeChange(allocationMode === 'auto' ? 'manual' : 'auto')}
                    disabled={loadingAllocationMode}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors ${
                      allocationMode === 'auto'
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    } ${loadingAllocationMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={
                      allocationMode === 'auto'
                        ? 'Switch to manual mode'
                        : canEnableAutoModeForDate
                          ? 'Switch to auto mode'
                          : 'Switch to auto mode (requires selected functionaries for date)'
                    }
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        allocationMode === 'auto' ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Auto</span>
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
                {allocationMode !== 'auto' && (
                  <button
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSaveRoomAssignments}
                    disabled={!selectedRoomDate || savingRoomAssignments || loadingRoomAssignments}
                  >
                    {savingRoomAssignments ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadRoomAssignments}
                  disabled={!selectedRoomDate || loadingRoomAssignments || loadingDutyPdfPreview}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Preview Exam Functionary Duty Record"
                  aria-label="Preview Exam Functionary Duty Record"
                >
                  {loadingDutyPdfPreview ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

          <div className="overflow-x-auto duties-table-scroll">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      Room
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      Invigilator 1
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      OASIS ID
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      Invigilator 2
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide">
                      OASIS ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {allocatedRoomsForSelectedDate.map((room) => {
                    const selectedFunctionaryId = roomAssignmentsByDate[selectedRoomDate]?.[room._id] || ''
                    const selectedFunctionarySecondId = roomAssignmentsByDateSecond[selectedRoomDate]?.[room._id] || ''
                    const selectedFunctionary = functionaryById[selectedFunctionaryId]
                    const selectedFunctionarySecond = functionaryById[selectedFunctionarySecondId]
                    const remainingForFirst = getRemainingInvigilatorIdsForSlot(selectedRoomDate, room._id, 'first')
                    const remainingForSecond = getRemainingInvigilatorIdsForSlot(selectedRoomDate, room._id, 'second')

                    const options = [...roomDropdownInvigilators].filter((func) => {
                      const candidateId = String(func._id || '').trim()
                      if (!candidateId) return false
                      if (!remainingForFirst.has(candidateId)) return false
                      if (candidateId === String(selectedFunctionarySecondId || '').trim()) return false
                      if (!isInvigilatorAllowedForRoom(room._id, candidateId, selectedRoomDate)) return false
                      if (isFunctionaryAssignedElsewhere(selectedRoomDate, candidateId, room._id, 'first')) return false
                      return true
                    })

                    const secondOptions = [...roomDropdownInvigilators].filter((func) => {
                      const candidateId = String(func._id || '').trim()
                      if (!candidateId) return false
                      if (!remainingForSecond.has(candidateId)) return false
                      if (candidateId === String(selectedFunctionaryId || '').trim()) return false
                      if (!isInvigilatorAllowedForRoom(room._id, candidateId, selectedRoomDate)) return false
                      if (isFunctionaryAssignedElsewhere(selectedRoomDate, candidateId, room._id, 'second')) return false
                      return true
                    })
                    if (
                      selectedFunctionaryId &&
                      selectedFunctionary &&
                      isInvigilatorAllowedForRoom(room._id, selectedFunctionaryId, selectedRoomDate) &&
                      !isFunctionaryAssignedElsewhere(selectedRoomDate, selectedFunctionaryId, room._id, 'first') &&
                      !options.some((func) => func._id === selectedFunctionaryId)
                    ) {
                      options.push(selectedFunctionary)
                    }
                    if (
                      selectedFunctionarySecondId &&
                      selectedFunctionarySecond &&
                      String(selectedFunctionarySecondId) !== String(selectedFunctionaryId) &&
                      isInvigilatorAllowedForRoom(room._id, selectedFunctionarySecondId, selectedRoomDate) &&
                      !isFunctionaryAssignedElsewhere(selectedRoomDate, selectedFunctionarySecondId, room._id, 'second') &&
                      !secondOptions.some((func) => func._id === selectedFunctionarySecondId)
                    ) {
                      secondOptions.push(selectedFunctionarySecond)
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
                            disabled={loadingRoomAssignments || allocationMode === 'auto'}
                            title={
                              allocationMode === 'auto'
                                ? `Auto mode: invigilator is assigned by system for room ${room.roomNo}`
                                : `Assign invigilator for room ${room.roomNo}`
                            }
                          >
                            <option value="">Select invigilator</option>
                            {options.map((func) => (
                              <option key={func._id} value={func._id}>
                                {String(func.name || '').toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {selectedFunctionary?.employeeId || '-'}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                          <select
                            value={selectedFunctionarySecondId}
                            onChange={(e) => handleRoomAssignmentSecondChange(room._id, e.target.value)}
                            disabled={loadingRoomAssignments || allocationMode === 'auto'}
                            className={`w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white px-2 py-1.5 ${
                              allocationMode === 'auto'
                                ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                                : 'bg-white dark:bg-gray-800'
                            }`}
                            title={`Invigilator 2 for room ${room.roomNo}`}
                          >
                            <option value="">Select invigilator</option>
                            {secondOptions.map((func) => (
                              <option key={func._id} value={func._id}>
                                {String(func.name || '').toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {selectedFunctionarySecond?.employeeId || '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {allocatedRoomsForSelectedDate.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No rooms are allotted for this date.
                      </td>
                    </tr>
                  )}
                  {allocatedRoomsForSelectedDate.length > 0 && allocationMode === 'manual' && roomDropdownInvigilators.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-xs text-amber-700 dark:text-amber-300">
                        No invigilators selected for this date. Select invigilators in the upper table first.
                      </td>
                    </tr>
                  )}
                  {allocatedRoomsForSelectedDate.length > 0 && allocationMode === 'auto' && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-xs text-blue-700 dark:text-blue-300">
                        Auto mode is active. Invigilators shown here are assigned by backend on Save.
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
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{String(invigilator?.name || '').toUpperCase()}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{invigilator?.employeeId || ''}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1" />
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{getSchoolInitials(invigilator)}</td>
                            <td className="border border-gray-600 dark:border-gray-400 px-1 py-1">{String(invigilator?.name || '').toUpperCase()}</td>
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

      {showDutyPdfPreview && dutyPdfPreviewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl h-[88vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Exam Functionary Duty Record Preview
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={dutyPdfPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Open in New Tab
                </a>
                <a
                  href={dutyPdfPreviewUrl}
                  download={`exam-functionary-duty-record-${selectedRoomDate}.pdf`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={closeDutyPdfPreview}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="w-full flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
              {dutyPdfRenderError ? (
                <div className="h-full w-full flex items-center justify-center p-6 text-center text-sm text-gray-600 dark:text-gray-300">
                  {dutyPdfRenderError}
                </div>
              ) : (
                <Document
                  file={dutyPdfPreviewUrl}
                  loading={
                    <div className="h-full w-full flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                      Loading PDF preview...
                    </div>
                  }
                  onLoadSuccess={({ numPages }) => {
                    setDutyPdfPageCount(numPages)
                    setDutyPdfRenderError(null)
                  }}
                  onLoadError={(error) => {
                    console.error('Failed to render duty PDF preview:', error)
                    const message = (error as Error)?.message || 'Unknown PDF render error'
                    setDutyPdfRenderError(`Failed to render preview in dialog (${message}). Use "Open in New Tab" or "Download PDF".`)
                  }}
                  className="flex flex-col items-center gap-4"
                >
                  {Array.from({ length: dutyPdfPageCount }).map((_, index) => (
                    <Page
                      key={`duty-preview-page-${index + 1}`}
                      pageNumber={index + 1}
                      width={980}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ))}
                </Document>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Duties
