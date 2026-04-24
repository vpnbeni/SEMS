import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTimetable, WEEKDAYS, EMPTY_CELL, type TimetableCell } from '@/contexts/TimetableContext'
import bellTimingsService, { type BellTimingRowPayload } from '@/services/bellTimingsService'
import timetableService, { type TimetableVersionSummary, type TimetableGridState } from '@/services/timetableService'
import toast from 'react-hot-toast'

/* ══════════════════════════════ Helpers ══════════════════════════════ */

/** Stable colour palette for subjects — same subject always gets same colour */
const SUBJECT_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {}
const PALETTE = [
  { bg: '#eef2ff', text: '#4338ca', darkBg: '#312e8144', darkText: '#a5b4fc' },
  { bg: '#f0fdf4', text: '#166534', darkBg: '#14532d44', darkText: '#86efac' },
  { bg: '#fef3c7', text: '#92400e', darkBg: '#78350f44', darkText: '#fcd34d' },
  { bg: '#fce7f3', text: '#9d174d', darkBg: '#831843aa', darkText: '#f9a8d4' },
  { bg: '#e0f2fe', text: '#075985', darkBg: '#0c4a6e44', darkText: '#7dd3fc' },
  { bg: '#fae8ff', text: '#6b21a8', darkBg: '#581c8744', darkText: '#d8b4fe' },
  { bg: '#fff7ed', text: '#9a3412', darkBg: '#7c2d1244', darkText: '#fdba74' },
  { bg: '#f1f5f9', text: '#334155', darkBg: '#33415544', darkText: '#cbd5e1' },
  { bg: '#ecfdf5', text: '#065f46', darkBg: '#064e3b44', darkText: '#6ee7b7' },
  { bg: '#fef2f2', text: '#991b1b', darkBg: '#7f1d1d44', darkText: '#fca5a5' },
  { bg: '#eff6ff', text: '#1e40af', darkBg: '#1e3a5f44', darkText: '#93c5fd' },
  { bg: '#f5f3ff', text: '#5b21b6', darkBg: '#4c1d9544', darkText: '#c4b5fd' },
]

let _colorIdx = 0
const getSubjectColor = (subject: string) => {
  if (!SUBJECT_COLORS[subject]) {
    SUBJECT_COLORS[subject] = PALETTE[_colorIdx % PALETTE.length]
    _colorIdx++
  }
  return SUBJECT_COLORS[subject]
}

/** Short day names for compact display */
const SHORT_DAYS: Record<string, string> = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED',
  Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT',
}

const normalizeTeacherName = (value: string) => value.trim().toLowerCase()
const normalizeSubjectName = (value: string) => value.trim().toLowerCase()

const createWeekdaySelection = (checked: boolean) =>
  WEEKDAYS.reduce<Record<string, boolean>>((acc, day) => {
    acc[day] = checked
    return acc
  }, {})

const FALLBACK_START_MINUTES = 8 * 60

const parseTimeToMinutes = (value: string): number => {
  const [hoursRaw, minutesRaw] = String(value || '').split(':')
  const hours = Number.parseInt(hoursRaw, 10)
  const minutes = Number.parseInt(minutesRaw, 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return FALLBACK_START_MINUTES
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return FALLBACK_START_MINUTES
  return hours * 60 + minutes
}

const formatMinutesTo12Hour = (value: number): string => {
  const normalized = ((value % 1440) + 1440) % 1440
  const hours24 = Math.floor(normalized / 60)
  const minutes = String(normalized % 60).padStart(2, '0')
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
  return `${String(hours12).padStart(2, '0')}:${minutes} ${suffix}`
}

const buildPeriodTimeRanges = (startTime: string, rows: BellTimingRowPayload[]): string[] => {
  let cursor = parseTimeToMinutes(startTime)
  const periodRanges: string[] = []

  rows.forEach((row) => {
    const duration = Number.isFinite(row.duration) && row.duration > 0
      ? row.duration
      : row.type === 'break'
        ? 15
        : 40
    const from = cursor
    const to = cursor + duration

    if (row.type === 'period') {
      periodRanges.push(`${formatMinutesTo12Hour(from)} - ${formatMinutesTo12Hour(to)}`)
    }

    cursor = to
  })

  return periodRanges
}

/* ══════════════════════════════ Component ══════════════════════════════ */

const ClassWise: React.FC = () => {
  const {
    classes,
    teachers,
    teacherSubjectAllocations,
    periodAllocation,
    periodsPerDay,
    timetableGrid,
    setGridCell,
    clearGridForClass,
  } = useTimetable()

  // Selected class
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  // Cell editor state
  const [editingCell, setEditingCell] = useState<{ day: string; slot: number } | null>(null)
  const [cellDraft, setCellDraft] = useState<TimetableCell>({ ...EMPTY_CELL })
  const [editingPeriodSlot, setEditingPeriodSlot] = useState<number | null>(null)
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const [periodDraft, setPeriodDraft] = useState<{
    primarySubject: string
    primaryDays: Record<string, boolean>
    useSecondary: boolean
    secondarySubject: string
  }>({
    primarySubject: '',
    primaryDays: createWeekdaySelection(true),
    useSecondary: false,
    secondarySubject: '',
  })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const periodEditorRef = useRef<HTMLDivElement>(null)
  const [periodTimeRanges, setPeriodTimeRanges] = useState<string[]>([])

  // ── Version state ──
  const [versions, setVersions] = useState<TimetableVersionSummary[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string>('')
  const [versionGrid, setVersionGrid] = useState<TimetableGridState | null>(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  useEffect(() => {
    timetableService.getVersions().then(setVersions).catch(() => setVersions([]))
  }, [])

  useEffect(() => {
    if (!selectedVersionId) {
      setVersionGrid(null)
      return
    }
    timetableService.getVersion(selectedVersionId)
      .then((v) => setVersionGrid(v.grid ?? null))
      .catch(() => { setVersionGrid(null); toast.error('Failed to load version data.') })
  }, [selectedVersionId])

  const handleExportExcel = async () => {
    if (!selectedVersionId) { toast.error('Select a version to export.'); return }
    setExportingExcel(true)
    try { await timetableService.exportExcel(selectedVersionId) }
    catch { toast.error('Excel export failed.') }
    finally { setExportingExcel(false) }
  }

  const handleExportPDF = async () => {
    if (!selectedVersionId) { toast.error('Select a version to export.'); return }
    if (!selectedClassId) { toast.error('Select a class to export.'); return }
    setExportingPDF(true)
    try { await timetableService.exportClassPDF(selectedVersionId, selectedClassId) }
    catch { toast.error('PDF export failed.') }
    finally { setExportingPDF(false) }
  }

  // Auto-select first class if none selected
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  )

  const selectedClassPeriodAllocation = useMemo<Record<string, number>>(() => {
    if (!selectedClass) return {}

    const direct = periodAllocation[selectedClass.id]
    if (direct && Object.keys(direct).length > 0) {
      return direct
    }

    const classNameKey = selectedClass.className.trim().toLowerCase()
    const sectionKey = selectedClass.section.trim().toLowerCase()

    const exactFallback = classes.find((item) => {
      if (item.id === selectedClass.id) return false
      const allocation = periodAllocation[item.id]
      if (!allocation || Object.keys(allocation).length === 0) return false
      return (
        item.className.trim().toLowerCase() === classNameKey &&
        item.section.trim().toLowerCase() === sectionKey
      )
    })
    if (exactFallback) {
      return periodAllocation[exactFallback.id] || {}
    }

    const classWideFallback = classes.find((item) => {
      const allocation = periodAllocation[item.id]
      if (!allocation || Object.keys(allocation).length === 0) return false
      return item.className.trim().toLowerCase() === classNameKey
    })

    return classWideFallback ? periodAllocation[classWideFallback.id] || {} : {}
  }, [selectedClass, periodAllocation, classes])

  const unassignedSubjectsForAutoMode = useMemo(() => {
    if (!selectedClass) return []

    const classSubjects = Array.from(
      new Set(
        (selectedClass.subjects || [])
          .map((subject) => subject.trim())
          .filter(Boolean)
      )
    )
    if (classSubjects.length === 0) return []

    const selectedClassNameKey = selectedClass.className.trim().toLowerCase()
    const selectedSectionKey = selectedClass.section.trim().toLowerCase()
    const mappedSubjects = new Set<string>()

    teacherSubjectAllocations.forEach((allocation) => {
      const assignment = allocation.assignments.find((entry) => {
        const classIdMatch = entry.classId === selectedClass.id
        const classNameMatch = entry.className.trim().toLowerCase() === selectedClassNameKey
        const sectionMatch = entry.section.trim().toLowerCase() === selectedSectionKey
        return classIdMatch || (classNameMatch && sectionMatch)
      })
      if (!assignment) return

      assignment.subjects.forEach((subject) => {
        const trimmed = subject.trim()
        if (!trimmed) return
        mappedSubjects.add(normalizeSubjectName(trimmed))
      })
    })

    return classSubjects.filter((subject) => !mappedSubjects.has(normalizeSubjectName(subject)))
  }, [selectedClass, teacherSubjectAllocations])

  const handleModeToggle = useCallback(() => {
    if (mode === 'auto') {
      setMode('manual')
      return
    }

    if (unassignedSubjectsForAutoMode.length > 0) {
      const preview = unassignedSubjectsForAutoMode.slice(0, 5)
      const remainingCount = Math.max(unassignedSubjectsForAutoMode.length - preview.length, 0)
      const extraSuffix = remainingCount > 0 ? ` +${remainingCount} more` : ''
      const label = unassignedSubjectsForAutoMode.length === 1 ? 'subject' : 'subjects'

      toast.error(
        `Assign this remaining ${label} to any teacher under Departments: ${preview.join(', ')}${extraSuffix}`
      )
      return
    }

    setMode('auto')
  }, [mode, unassignedSubjectsForAutoMode])

  // If the selected class is deleted or no selection, pick first
  useMemo(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClassId(classes[0].id)
    }
  }, [selectedClass, classes])

  useEffect(() => {
    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })
    setEditingPeriodSlot(null)
  }, [selectedClassId])

  // Period slots array [0, 1, 2, ... periodsPerDay-1]
  const periodSlots = useMemo(
    () => Array.from({ length: periodsPerDay }, (_, i) => i),
    [periodsPerDay]
  )

  const periodHeaderTimes = useMemo(
    () => periodSlots.map((slot) => periodTimeRanges[slot] || '-'),
    [periodSlots, periodTimeRanges]
  )

  useEffect(() => {
    let isMounted = true

    const loadBellTimings = async () => {
      try {
        const saved = await bellTimingsService.getBellTimings()
        if (!isMounted) return
        setPeriodTimeRanges(buildPeriodTimeRanges(saved.startTime, saved.rows))
      } catch {
        if (!isMounted) return
        setPeriodTimeRanges([])
      }
    }

    void loadBellTimings()

    return () => {
      isMounted = false
    }
  }, [])

  // Get a cell from the grid — reads version grid when a version is selected
  const getCell = useCallback(
    (classId: string, day: string, slot: number): TimetableCell => {
      if (versionGrid) {
        const cell = (versionGrid[classId]?.[day] as Record<string | number, TimetableCell> | undefined)?.[slot]
        return cell ?? EMPTY_CELL
      }
      return timetableGrid[classId]?.[day]?.[slot] ?? EMPTY_CELL
    },
    [timetableGrid, versionGrid]
  )

  // Stats for selected class
  const stats = useMemo(() => {
    if (!selectedClass) return { filled: 0, total: 0, bySubject: {} as Record<string, number> }
    const total = periodsPerDay * WEEKDAYS.length
    let filled = 0
    const bySubject: Record<string, number> = {}
    for (const day of WEEKDAYS) {
      for (let slot = 0; slot < periodsPerDay; slot++) {
        const cell = getCell(selectedClass.id, day, slot)
        if (cell.subject) {
          filled++
          bySubject[cell.subject] = (bySubject[cell.subject] || 0) + 1
        }
      }
    }
    return { filled, total, bySubject }
  }, [selectedClass, periodsPerDay, getCell])

  // Open cell editor
  const openEditor = useCallback((day: string, slot: number) => {
    if (!selectedClass) return
    setEditingPeriodSlot(null)
    const existing = getCell(selectedClass.id, day, slot)
    setCellDraft({ subject: existing.subject, teacher: existing.teacher })
    setEditingCell({ day, slot })
  }, [selectedClass, getCell])

  // Save cell
  const saveCell = useCallback(() => {
    if (!selectedClass || !editingCell) return
    const normalizedTeacher = normalizeTeacherName(cellDraft.teacher)
    let conflict: string | null = null
    if (normalizedTeacher) {
      for (const cls of classes) {
        if (cls.id === selectedClass.id) continue
        const existingCell = getCell(cls.id, editingCell.day, editingCell.slot)
        if (normalizeTeacherName(existingCell.teacher) === normalizedTeacher) {
          conflict = `${cls.className}-${cls.section}`
          break
        }
      }
    }
    if (conflict) {
      window.alert(`Teacher "${cellDraft.teacher}" is already assigned in ${conflict} for this day and period.`)
      return
    }
    setGridCell(selectedClass.id, editingCell.day, editingCell.slot, { ...cellDraft })
    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })
  }, [selectedClass, editingCell, cellDraft, setGridCell, classes, getCell])

  // Clear a single cell
  const clearCell = useCallback(() => {
    if (!selectedClass || !editingCell) return
    setGridCell(selectedClass.id, editingCell.day, editingCell.slot, { ...EMPTY_CELL })
    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })
  }, [selectedClass, editingCell, setGridCell])

  // Close editor
  const closeEditor = useCallback(() => {
    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })
  }, [])

  const closePeriodEditor = useCallback(() => {
    setEditingPeriodSlot(null)
    setPeriodDraft({
      primarySubject: '',
      primaryDays: createWeekdaySelection(true),
      useSecondary: false,
      secondarySubject: '',
    })
  }, [])

  // Click outside to close open popovers
  useEffect(() => {
    if (!editingCell && editingPeriodSlot === null) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (editingCell && dropdownRef.current && !dropdownRef.current.contains(target)) {
        closeEditor()
      }
      if (editingPeriodSlot !== null && periodEditorRef.current && !periodEditorRef.current.contains(target)) {
        closePeriodEditor()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editingCell, editingPeriodSlot, closeEditor, closePeriodEditor])

  const selectedClassTeacherPool = useMemo(() => {
    if (!selectedClass) return []

    const byId = new Map<string, (typeof teachers)[number]>()
    const byName = new Map<string, (typeof teachers)[number]>()
    teachers.forEach((teacher) => {
      byId.set(teacher.id, teacher)
      byName.set(teacher.name.trim().toLowerCase(), teacher)
    })

    const mappedTeachers = new Map<string, { id: string; name: string; shortName: string; subjects: string[] }>()

    const selectedClassNameKey = selectedClass.className.trim().toLowerCase()
    const selectedSectionKey = selectedClass.section.trim().toLowerCase()

    teacherSubjectAllocations.forEach((allocation) => {
      const assignment = allocation.assignments.find((entry) => {
        const classIdMatch = entry.classId === selectedClass.id
        const classNameMatch = entry.className.trim().toLowerCase() === selectedClassNameKey
        const sectionMatch = entry.section.trim().toLowerCase() === selectedSectionKey
        return classIdMatch || (classNameMatch && sectionMatch)
      })
      if (!assignment) return

      const teacherId = String(allocation.teacherId || '').trim()
      const teacherName = String(allocation.teacherName || '').trim()
      if (!teacherId && !teacherName) return

      const teacherFromId = teacherId ? byId.get(teacherId) : undefined
      const teacherFromName = byName.get(teacherName.toLowerCase())
      const normalizedName = teacherName || teacherFromId?.name || teacherFromName?.name || ''
      if (!normalizedName) return

      const key = teacherId || normalizedName.toLowerCase()
      const existing = mappedTeachers.get(key)
      if (existing) {
        const merged = new Set([...existing.subjects, ...assignment.subjects])
        existing.subjects = Array.from(merged)
        return
      }

      mappedTeachers.set(key, {
        id: teacherId || key,
        name: normalizedName,
        shortName: teacherFromId?.shortName || teacherFromName?.shortName || '',
        subjects: [...assignment.subjects],
      })
    })

    if (mappedTeachers.size > 0) {
      return Array.from(mappedTeachers.values())
    }

    // Fallback for legacy data where subject allocation is not configured yet.
    return teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      shortName: teacher.shortName,
      subjects: [...teacher.subjects],
    }))
  }, [selectedClass, teachers, teacherSubjectAllocations])

  // Teachers filtered by subject for dropdown
  const getTeachersForSubject = useCallback(
    (subject: string) => {
      if (!subject) return selectedClassTeacherPool
      const key = subject.trim().toLowerCase()
      return selectedClassTeacherPool.filter((t) =>
        t.subjects.length === 0 ||
        t.subjects.some((assigned) => assigned.trim().toLowerCase() === key)
      )
    },
    [selectedClassTeacherPool]
  )

  // Check teacher conflict: is teacher already assigned elsewhere at this day+slot?
  const hasTeacherConflict = useCallback(
    (teacherName: string, day: string, slot: number, excludeClassId: string): string | null => {
      const normalizedTeacher = normalizeTeacherName(teacherName)
      if (!normalizedTeacher) return null
      for (const cls of classes) {
        if (cls.id === excludeClassId) continue
        const cell = getCell(cls.id, day, slot)
        if (normalizeTeacherName(cell.teacher) === normalizedTeacher) {
          return `${cls.className}-${cls.section}`
        }
      }
      return null
    },
    [classes, getCell]
  )

  // Check if there is at least one available teacher for a subject at a given slot.
  const canAssignSubjectToSlot = useCallback(
    (subject: string, day: string, slot: number, classId: string): boolean => {
      const candidates = getTeachersForSubject(subject)
      if (candidates.length === 0) return false
      return candidates.some(
        (teacher) => !hasTeacherConflict(teacher.name, day, slot, classId)
      )
    },
    [getTeachersForSubject, hasTeacherConflict]
  )

  const getAutoTeacherForSubject = useCallback(
    (subject: string, day: string, slot: number, classId: string) => {
      const normalizedSubject = subject.trim().toLowerCase()
      if (!normalizedSubject) return ''

      const exactSubjectTeachers = selectedClassTeacherPool.filter((teacher) =>
        teacher.subjects.some((assigned) => assigned.trim().toLowerCase() === normalizedSubject)
      )
      const genericTeachers = selectedClassTeacherPool.filter((teacher) => teacher.subjects.length === 0)
      const pool = [...exactSubjectTeachers, ...genericTeachers]
      if (pool.length === 0) return ''

      const available = pool.find((teacher) => !hasTeacherConflict(teacher.name, day, slot, classId))
      return available?.name || ''
    },
    [selectedClassTeacherPool, hasTeacherConflict]
  )

  const autoFillClassTimetable = useCallback(() => {
    if (!selectedClass) return

    const allocation = selectedClassPeriodAllocation
    const remainingBySubject: Record<string, number> = {}

    Object.entries(allocation).forEach(([subjectName, countValue]) => {
      const trimmed = subjectName.trim()
      const parsed = Number.parseInt(String(countValue), 10)
      if (!trimmed || !Number.isFinite(parsed) || parsed <= 0) return
      remainingBySubject[trimmed] = parsed
    })

    const subjectOrder = Object.keys(remainingBySubject)
    if (subjectOrder.length === 0) {
      toast.error('No period distribution found for this class-section. Set periods in Period Distribution first.')
      return
    }
    const totalRequired = subjectOrder.reduce((sum, subj) => sum + remainingBySubject[subj], 0)
    const totalSlots = periodsPerDay * WEEKDAYS.length
    if (totalRequired > totalSlots) {
      toast.error('Allocated periods exceed available slots for this class. Some periods will be skipped.')
    }

    // For each period slot, assign subjects across weekdays.
    const usedSubjectsByDay: Record<string, Set<string>> = {}
    WEEKDAYS.forEach((day) => {
      usedSubjectsByDay[day] = new Set<string>()
    })

    let pointer = 0

    for (let slot = 0; slot < periodsPerDay; slot++) {
      WEEKDAYS.forEach((day) => {
        const usedForDay = usedSubjectsByDay[day]
        const previousSubject =
          slot > 0 ? getCell(selectedClass.id, day, slot - 1).subject.trim() : ''
        let chosenSubject: string | null = null

        // First pass: prefer subjects not yet used on this day and not same as previous period.
        let attempts = 0
        while (attempts < subjectOrder.length) {
          const idx = (pointer + attempts) % subjectOrder.length
          const candidate = subjectOrder[idx]
          const remaining = remainingBySubject[candidate] || 0
          if (
            remaining > 0 &&
            !usedForDay.has(candidate) &&
            candidate.trim() !== previousSubject
          ) {
            chosenSubject = candidate
            pointer = idx + 1
            break
          }
          attempts++
        }

        // Second pass: allow repeats on the same day / consecutive if needed.
        if (!chosenSubject) {
          attempts = 0
          while (attempts < subjectOrder.length) {
            const idx = (pointer + attempts) % subjectOrder.length
            const candidate = subjectOrder[idx]
            const remaining = remainingBySubject[candidate] || 0
            if (remaining > 0) {
              chosenSubject = candidate
              pointer = idx + 1
              break
            }
            attempts++
          }
        }

        if (!chosenSubject) {
          // No subject left to assign for this cell.
          setGridCell(selectedClass.id, day, slot, { ...EMPTY_CELL })
          return
        }

        const teacher = getAutoTeacherForSubject(chosenSubject, day, slot, selectedClass.id)
        // Always assign the subject; teacher is optional (can be filled later).
        setGridCell(selectedClass.id, day, slot, { subject: chosenSubject, teacher: teacher || '' })
        remainingBySubject[chosenSubject] = (remainingBySubject[chosenSubject] || 0) - 1
        usedForDay.add(chosenSubject)
      })
    }
  }, [selectedClass, selectedClassPeriodAllocation, periodsPerDay, setGridCell, getCell, getAutoTeacherForSubject])

  const openPeriodEditor = useCallback((slot: number) => {
    if (!selectedClass) return
    if (editingPeriodSlot === slot) {
      closePeriodEditor()
      return
    }

    setEditingCell(null)
    setCellDraft({ ...EMPTY_CELL })

    const firstFilledDay = WEEKDAYS.find((day) => getCell(selectedClass.id, day, slot).subject)
    const detectedPrimarySubject = firstFilledDay ? getCell(selectedClass.id, firstFilledDay, slot).subject : ''
    const hasExistingAssignments = WEEKDAYS.some((day) => Boolean(getCell(selectedClass.id, day, slot).subject))
    const primaryDays = createWeekdaySelection(!hasExistingAssignments)

    if (detectedPrimarySubject) {
      WEEKDAYS.forEach((day) => {
        const cellSubject = getCell(selectedClass.id, day, slot).subject
        primaryDays[day] = cellSubject === detectedPrimarySubject
      })
    }

    const secondaryDay = WEEKDAYS.find((day) => {
      const cellSubject = getCell(selectedClass.id, day, slot).subject
      return Boolean(cellSubject) && cellSubject !== detectedPrimarySubject && !primaryDays[day]
    })
    const detectedSecondarySubject = secondaryDay ? getCell(selectedClass.id, secondaryDay, slot).subject : ''

    setPeriodDraft({
      primarySubject: detectedPrimarySubject,
      primaryDays,
      useSecondary: Boolean(detectedSecondarySubject),
      secondarySubject: detectedSecondarySubject,
    })
    setEditingPeriodSlot(slot)
  }, [selectedClass, getCell, editingPeriodSlot, closePeriodEditor])

  const togglePeriodDay = useCallback((day: string) => {
    setPeriodDraft((prev) => ({
      ...prev,
      primaryDays: {
        ...prev.primaryDays,
        [day]: !prev.primaryDays[day],
      },
    }))
  }, [])

  const savePeriodAssignment = useCallback(() => {
    if (!selectedClass || editingPeriodSlot === null) return

    const selectedDays = WEEKDAYS.filter((day) => Boolean(periodDraft.primaryDays[day]))
    if (selectedDays.length > 0 && !periodDraft.primarySubject) {
      window.alert('Select the first subject for checked weekdays.')
      return
    }
    if (periodDraft.useSecondary && !periodDraft.secondarySubject) {
      window.alert('Select the second subject for remaining weekdays.')
      return
    }

    selectedDays.forEach((day) => {
      const subject = periodDraft.primarySubject
      const teacher = getAutoTeacherForSubject(subject, day, editingPeriodSlot, selectedClass.id)
      setGridCell(selectedClass.id, day, editingPeriodSlot, { subject, teacher })
    })

    if (periodDraft.useSecondary && periodDraft.secondarySubject) {
      WEEKDAYS.filter((day) => !periodDraft.primaryDays[day]).forEach((day) => {
        const subject = periodDraft.secondarySubject
        const teacher = getAutoTeacherForSubject(subject, day, editingPeriodSlot, selectedClass.id)
        setGridCell(selectedClass.id, day, editingPeriodSlot, { subject, teacher })
      })
    }

    closePeriodEditor()
  }, [selectedClass, editingPeriodSlot, periodDraft, setGridCell, getAutoTeacherForSubject, closePeriodEditor])

  const clearPeriodAssignment = useCallback(() => {
    if (!selectedClass || editingPeriodSlot === null) return

    WEEKDAYS.forEach((day) => {
      setGridCell(selectedClass.id, day, editingPeriodSlot, { ...EMPTY_CELL })
    })

    closePeriodEditor()
  }, [selectedClass, editingPeriodSlot, setGridCell, closePeriodEditor])

  return (
    <div className="cw-page">
      <style>{`
        /* ───────── Page ───────── */
        .cw-page {
          padding: 12px 32px 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ───────── Top bar ───────── */
        .cw-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .cw-top-bar p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
        }
        .dark .cw-top-bar p { color: #94a3b8; }

        /* ───────── Class selector ───────── */
        .cw-class-selector {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .cw-class-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
        }
        .dark .cw-class-label { color: #cbd5e1; }
        .cw-class-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cw-class-tab {
          padding: 6px 16px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 600;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .dark .cw-class-tab {
          background: #1e293b;
          border-color: #475569;
          color: #94a3b8;
        }
        .cw-class-tab:hover {
          border-color: #6366f1;
          color: #4f46e5;
          background: #eef2ff;
        }
        .dark .cw-class-tab:hover {
          border-color: #818cf8;
          color: #a5b4fc;
          background: #312e8133;
        }
        .cw-class-tab-active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
          color: #fff !important;
          border-color: transparent !important;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
        }

        /* ───────── Card ───────── */
        .cw-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.04);
          overflow: hidden;
          margin-bottom: 24px;
          border: 1px solid #e8ecf1;
          transition: box-shadow 0.3s ease;
        }
        .cw-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 10px 36px rgba(0,0,0,0.06);
        }
        .dark .cw-card {
          background: #1e293b;
          border-color: #334155;
        }

        /* ───────── Card header ───────── */
        .cw-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dark .cw-card-header {
          background: linear-gradient(135deg, #1e2a3e 0%, #2a1e3e 100%);
          border-color: #334155;
        }
        .cw-card-header h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dark .cw-card-header h3 { color: #f1f5f9; }
        .cw-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        .cw-header-icon svg {
          width: 18px;
          height: 18px;
          color: #fff;
        }

        /* ───────── Header stats ───────── */
        .cw-header-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .cw-stat-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .cw-stat-indigo {
          background: #eef2ff;
          color: #4f46e5;
        }
        .dark .cw-stat-indigo {
          background: #312e8133;
          color: #a5b4fc;
        }
        .cw-stat-green {
          background: #ecfdf5;
          color: #059669;
        }
        .dark .cw-stat-green {
          background: #064e3b33;
          color: #34d399;
        }
        .cw-stat-amber {
          background: #fef3c7;
          color: #92400e;
        }
        .dark .cw-stat-amber {
          background: #78350f33;
          color: #fbbf24;
        }

        /* ───────── Mode toggle ───────── */
        .cw-mode-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .cw-mode-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #4b5563;
        }
        .dark .cw-mode-label {
          color: #e5e7eb;
        }
        .cw-mode-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: 44px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          background: #e5e7eb;
          padding: 0 2px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .dark .cw-mode-switch {
          border-color: #4b5563;
          background: #111827;
        }
        .cw-mode-switch-auto {
          background: #2563eb;
          border-color: #2563eb;
        }
        .dark .cw-mode-switch-auto {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }
        .cw-mode-switch-thumb {
          position: relative;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          transform: translateX(0);
          transition: transform 0.15s ease;
        }
        .cw-mode-switch-thumb-auto {
          transform: translateX(18px);
        }

        /* ───────── Header actions ───────── */
        .cw-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .cw-btn svg { width: 14px; height: 14px; }
        .cw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cw-btn-danger {
          background: #fff;
          color: #ef4444;
          border: 1.5px solid #fecaca;
        }
        .dark .cw-btn-danger {
          background: #1e293b;
          border-color: #7f1d1d;
          color: #fca5a5;
        }
        .cw-btn-danger:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        /* ───────── Grid table ───────── */
        .cw-grid-wrap {
          overflow-x: auto;
        }
        .cw-grid {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .cw-grid thead th {
          padding: 10px 6px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #475569;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          text-align: center;
          white-space: nowrap;
        }
        .dark .cw-grid thead th {
          background: linear-gradient(180deg, #1e293b 0%, #1a2536 100%);
          color: #94a3b8;
          border-color: #334155;
        }
        .cw-grid thead th.cw-th-day {
          width: 80px;
          min-width: 80px;
          text-align: left;
          padding-left: 16px;
        }
        .cw-grid thead tr.cw-time-row th {
          padding: 6px 6px;
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          text-transform: none;
          color: #64748b;
          background: #f8fafc;
        }
        .dark .cw-grid thead tr.cw-time-row th {
          color: #94a3b8;
          background: #1a2536;
        }
        .cw-grid thead tr.cw-time-row th.cw-th-day {
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
        }
        .cw-period-header-btn {
          width: 100%;
          border: none;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .cw-period-header-btn:hover {
          background: #e0e7ff;
          color: #4338ca;
        }
        .dark .cw-period-header-btn:hover {
          background: #312e8133;
          color: #a5b4fc;
        }
        .cw-period-header-btn.cw-period-header-active {
          background: #6366f1;
          color: #fff;
        }
        .dark .cw-period-header-btn.cw-period-header-active {
          background: #818cf8;
          color: #0f172a;
        }
        .cw-grid tbody td {
          padding: 0;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
          height: 64px;
          position: relative;
        }
        .dark .cw-grid tbody td {
          border-color: #334155;
        }
        .cw-grid tbody td.cw-td-day {
          padding: 8px 16px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          background: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          width: 80px;
          min-width: 80px;
        }
        .dark .cw-grid tbody td.cw-td-day {
          color: #94a3b8;
          background: #1a2536;
        }
        .cw-grid tbody tr:hover td {
          background: #fafaff;
        }
        .dark .cw-grid tbody tr:hover td {
          background: #1e2a3e;
        }
        .cw-grid tbody tr:hover td.cw-td-day {
          background: #f0f1f8;
        }
        .dark .cw-grid tbody tr:hover td.cw-td-day {
          background: #1a2a40;
        }

        /* ───────── Cell ───────── */
        .cw-cell {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 4px;
          transition: all 0.15s ease;
          user-select: none;
          min-height: 62px;
        }
        .cw-cell:hover {
          background: #eef2ff;
        }
        .dark .cw-cell:hover {
          background: #312e8122;
        }
        .cw-cell-empty {
          color: #cbd5e1;
          font-size: 0.72rem;
        }
        .dark .cw-cell-empty {
          color: #475569;
        }
        .cw-cell-empty:hover {
          color: #6366f1;
        }
        .cw-cell-filled {
          border-radius: 6px;
          margin: 3px;
          padding: 4px 6px;
        }
        .cw-cell-subject {
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
        }
        .cw-cell-teacher {
          font-size: 0.62rem;
          font-weight: 500;
          line-height: 1.2;
          text-align: center;
          opacity: 0.75;
          margin-top: 2px;
        }

        /* ───────── Cell editor dropdown ───────── */
        .cw-editor-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
        }
        .cw-editor {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          margin-top: 4px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          padding: 12px;
          min-width: 220px;
          white-space: nowrap;
        }
        .dark .cw-editor {
          background: #1e293b;
          border-color: #475569;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .cw-editor-title {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        .cw-editor-field {
          margin-bottom: 10px;
        }
        .cw-editor-field label {
          display: block;
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 4px;
        }
        .dark .cw-editor-field label { color: #94a3b8; }
        .cw-editor-select {
          width: 100%;
          padding: 6px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          background: #fff;
          color: #334155;
          transition: border-color 0.15s;
        }
        .dark .cw-editor-select {
          background: #0f172a;
          border-color: #475569;
          color: #e2e8f0;
        }
        .cw-editor-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .cw-editor-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          padding-top: 4px;
          border-top: 1px solid #f1f5f9;
          margin-top: 4px;
        }
        .dark .cw-editor-actions {
          border-color: #334155;
        }
        .cw-editor-btn {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cw-editor-btn-save {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
        }
        .cw-editor-btn-save:hover {
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }
        .cw-editor-btn-clear {
          background: none;
          color: #ef4444;
        }
        .cw-editor-btn-clear:hover {
          background: #fef2f2;
        }
        .cw-editor-btn-cancel {
          background: none;
          color: #94a3b8;
        }
        .cw-editor-btn-cancel:hover {
          background: #f1f5f9;
          color: #64748b;
        }
        .dark .cw-editor-btn-cancel:hover {
          background: #334155;
          color: #cbd5e1;
        }
        .cw-conflict-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: #ef4444;
          margin-top: 2px;
        }
        .dark .cw-conflict-badge { color: #fca5a5; }

        /* ————————— Period bulk editor ————————— */
        .cw-period-editor-panel {
          margin: 14px 16px 0;
          border: 1.5px solid #c7d2fe;
          border-radius: 12px;
          background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
          padding: 14px;
        }
        .dark .cw-period-editor-panel {
          border-color: #4f46e5;
          background: linear-gradient(135deg, #1e2a3f 0%, #1e293b 100%);
        }
        .cw-period-editor-title {
          font-size: 0.78rem;
          font-weight: 800;
          color: #4338ca;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 10px;
        }
        .dark .cw-period-editor-title {
          color: #a5b4fc;
        }
        .cw-period-editor-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
          gap: 12px;
        }
        .cw-period-editor-field label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }
        .dark .cw-period-editor-field label {
          color: #cbd5e1;
        }
        .cw-period-editor-select {
          width: 100%;
          padding: 7px 10px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #334155;
          outline: none;
          font-size: 0.82rem;
        }
        .dark .cw-period-editor-select {
          background: #0f172a;
          border-color: #475569;
          color: #e2e8f0;
        }
        .cw-period-editor-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .cw-weekday-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .cw-weekday-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          color: #334155;
        }
        .dark .cw-weekday-item {
          color: #cbd5e1;
        }
        .cw-weekday-item input {
          width: 14px;
          height: 14px;
          accent-color: #6366f1;
        }
        .cw-secondary-toggle {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.76rem;
          font-weight: 600;
          color: #334155;
        }
        .dark .cw-secondary-toggle {
          color: #cbd5e1;
        }
        .cw-period-editor-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .cw-period-hint {
          margin-top: 10px;
          font-size: 0.74rem;
          color: #6366f1;
          font-weight: 600;
        }
        .dark .cw-period-hint {
          color: #a5b4fc;
        }
        @media (max-width: 900px) {
          .cw-period-editor-grid {
            grid-template-columns: 1fr;
          }
          .cw-weekday-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* ───────── Subject legend ───────── */
        .cw-legend {
          padding: 12px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .dark .cw-legend {
          border-color: #334155;
        }
        .cw-legend-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-right: 8px;
        }
        .cw-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 600;
        }
        .cw-legend-count {
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.6;
        }

        /* ───────── Empty state ───────── */
        .cw-empty {
          padding: 48px 24px;
          text-align: center;
        }
        .cw-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cw-empty-icon svg {
          width: 32px;
          height: 32px;
          color: #94a3b8;
        }
        .cw-empty h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 6px;
        }
        .dark .cw-empty h3 { color: #f1f5f9; }
        .cw-empty p {
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0 0 6px;
        }
        .cw-empty a {
          color: #6366f1;
          font-weight: 600;
          text-decoration: none;
        }
        .cw-empty a:hover { text-decoration: underline; }

        /* ───────── Version toolbar ───────── */
        .cw-version-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .cw-version-select {
          padding: 6px 10px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          font-size: 0.82rem;
          font-weight: 600;
          background: #fff;
          color: #475569;
          min-width: 220px;
        }
        .dark .cw-version-select {
          background: #1e293b;
          border-color: #475569;
          color: #94a3b8;
        }
        .cw-version-badge {
          font-size: 0.78rem;
          color: #6366f1;
          font-weight: 600;
        }
        .cw-version-actions {
          margin-left: auto;
          display: flex;
          gap: 8px;
        }
        .cw-export-btn {
          padding: 6px 14px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          font-size: 0.82rem;
          font-weight: 600;
          background: #f1f5f9;
          color: #475569;
          cursor: pointer;
          transition: background 0.15s;
        }
        .cw-export-btn:hover:not(:disabled) { background: #e2e8f0; }
        .cw-export-btn:disabled { color: #cbd5e1; cursor: not-allowed; }
        .dark .cw-export-btn { background: #1e293b; border-color: #475569; color: #94a3b8; }
        .cw-export-btn-primary {
          padding: 6px 14px;
          border-radius: 10px;
          border: none;
          font-size: 0.82rem;
          font-weight: 600;
          background: #6366f1;
          color: #fff;
          cursor: pointer;
          transition: background 0.15s;
        }
        .cw-export-btn-primary:hover:not(:disabled) { background: #4f46e5; }
        .cw-export-btn-primary:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

        /* ───────── No subjects notice ───────── */
        .cw-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #92400e;
          background: #fef3c7;
          border-bottom: 1px solid #fde68a;
        }
        .dark .cw-notice {
          background: #78350f33;
          border-color: #92400e;
          color: #fbbf24;
        }
        .cw-notice svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .cw-notice a {
          color: inherit;
          font-weight: 700;
          text-decoration: underline;
        }

        /* ───────── No teachers notice ───────── */
        .cw-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          font-size: 0.78rem;
          font-weight: 500;
          color: #1e40af;
          background: #eff6ff;
          border-bottom: 1px solid #bfdbfe;
        }
        .dark .cw-info {
          background: #1e3a5f33;
          border-color: #1e40af;
          color: #93c5fd;
        }
        .cw-info svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
      `}</style>

      {/* ── Version / Export toolbar ── */}
      <div className="cw-version-bar">
        <label htmlFor="cw-version-select" className="cw-class-label">Version:</label>
        <select
          id="cw-version-select"
          className="cw-version-select"
          title="Select a generated timetable version to view"
          value={selectedVersionId}
          onChange={(e) => setSelectedVersionId(e.target.value)}
        >
          <option value="">Manual (current grid)</option>
          {versions.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name} [{v.status}]
            </option>
          ))}
        </select>

        {selectedVersionId && versionGrid && (
          <span className="cw-version-badge">
            Viewing generated version — editing disabled
          </span>
        )}

        <div className="cw-version-actions">
          <button
            type="button"
            className="cw-export-btn"
            onClick={handleExportPDF}
            disabled={!selectedVersionId || exportingPDF}
          >
            {exportingPDF ? 'Exporting…' : 'Export PDF'}
          </button>
          <button
            type="button"
            className="cw-export-btn-primary"
            onClick={handleExportExcel}
            disabled={!selectedVersionId || exportingExcel}
          >
            {exportingExcel ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* ── Top bar ── */}
      <div className="cw-top-bar">
        <p>
          {versionGrid
            ? 'Showing generated timetable — select "Manual (current grid)" to edit cells.'
            : 'Click a Period header to bulk-assign subjects by weekdays, or use Auto mode to fill the grid from Period Distribution.'}
        </p>
      </div>

      {/* ── Empty state: no classes ── */}
      {classes.length === 0 && (
        <div className="cw-card">
          <div className="cw-empty">
            <div className="cw-empty-icon">
              <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3>No Classes to Schedule</h3>
            <p>Add classes on the <a href="#/time-table/classes">Classes</a> page first, then come back here to build timetables.</p>
          </div>
        </div>
      )}

      {/* ── Class tabs ── */}
      {classes.length > 0 && (
        <>
          <div className="cw-class-selector" style={{ marginBottom: 20 }}>
            <span className="cw-class-label">Select Class:</span>
            <div className="cw-class-tabs">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  className={`cw-class-tab ${selectedClassId === cls.id ? 'cw-class-tab-active' : ''}`}
                  onClick={() => setSelectedClassId(cls.id)}
                >
                  {cls.className}-{cls.section}
                </button>
              ))}
            </div>
          </div>

          {/* ── Selected class grid ── */}
          {selectedClass && (
            <div className="cw-card">
              {/* Header */}
              <div className="cw-card-header">
                <h3>
                  <span className="cw-header-icon">
                    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </span>
                  {selectedClass.className} — Section {selectedClass.section}
                </h3>
                <div className="cw-header-stats">
                  <span className="cw-stat-pill cw-stat-indigo">
                    {stats.filled} / {stats.total} filled
                  </span>
                  <span className={`cw-stat-pill ${stats.filled === stats.total && stats.total > 0 ? 'cw-stat-green' : 'cw-stat-amber'}`}>
                    {stats.total - stats.filled} free
                  </span>
                  {selectedClass.incharge && (
                    <span className="cw-stat-pill cw-stat-indigo">
                      Incharge: {selectedClass.incharge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="cw-mode-toggle" aria-label="Timetable mode">
                    <span className="cw-mode-label">Manual</span>
                    <button
                      type="button"
                      className={`cw-mode-switch ${mode === 'auto' ? 'cw-mode-switch-auto' : ''}`}
                      onClick={handleModeToggle}
                    >
                      <span
                        className={`cw-mode-switch-thumb ${
                          mode === 'auto' ? 'cw-mode-switch-thumb-auto' : ''
                        }`}
                      />
                    </button>
                    <span className="cw-mode-label">Auto</span>
                  </div>
                  {mode === 'auto' && (
                    <button
                      type="button"
                      className="cw-btn"
                      onClick={autoFillClassTimetable}
                      disabled={selectedClass.subjects.length === 0}
                    >
                      <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Auto Fill
                    </button>
                  )}
                  <button
                    className="cw-btn cw-btn-danger"
                    onClick={() => {
                      if (window.confirm(`Clear all timetable entries for ${selectedClass.className}-${selectedClass.section}?`)) {
                        clearGridForClass(selectedClass.id)
                      }
                    }}
                    disabled={stats.filled === 0}
                  >
                    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Clear All
                  </button>
                </div>
              </div>

              {/* No subjects warning */}
              {selectedClass.subjects.length === 0 && (
                <div className="cw-notice">
                  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span>This class has no subjects assigned. <a href="#/time-table/classes">Assign subjects</a> first.</span>
                </div>
              )}

              {/* No teachers info */}
              {selectedClassTeacherPool.length === 0 && selectedClass.subjects.length > 0 && (
                <div className="cw-info">
                  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <span>No teacher mapping found for this class-section. Assign teachers in Subject Allocation to auto-wire period teacher options.</span>
                </div>
              )}

              {/* Grid */}
              {selectedClass.subjects.length > 0 && (
                <>
                {editingPeriodSlot !== null && (
                  <div className="cw-period-editor-panel" ref={periodEditorRef}>
                    <div className="cw-period-editor-title">
                      Period {editingPeriodSlot + 1} Bulk Assignment
                    </div>
                    <div className="cw-period-editor-grid">
                      <div className="cw-period-editor-field">
                        <label>First Subject (checked weekdays)</label>
                        <select
                          className="cw-period-editor-select"
                          value={periodDraft.primarySubject}
                          onChange={(e) => setPeriodDraft((prev) => ({ ...prev, primarySubject: e.target.value }))}
                        >
                          <option value="">— Select Subject —</option>
                          {selectedClass.subjects.map((subj) => (
                            <option key={subj} value={subj}>{subj}</option>
                          ))}
                        </select>
                        <div className="cw-secondary-toggle">
                          <input
                            type="checkbox"
                            checked={periodDraft.useSecondary}
                            onChange={(e) => setPeriodDraft((prev) => ({ ...prev, useSecondary: e.target.checked }))}
                          />
                          <span>Assign second subject for remaining weekdays</span>
                        </div>
                        {periodDraft.useSecondary && (
                          <div style={{ marginTop: 8 }}>
                            <select
                              className="cw-period-editor-select"
                              value={periodDraft.secondarySubject}
                              onChange={(e) => setPeriodDraft((prev) => ({ ...prev, secondarySubject: e.target.value }))}
                            >
                              <option value="">— Select Second Subject —</option>
                              {selectedClass.subjects.map((subj) => (
                                <option key={subj} value={subj}>{subj}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="cw-period-editor-field">
                        <label>Select Weekdays For First Subject</label>
                        <div className="cw-weekday-grid">
                          {WEEKDAYS.map((day) => (
                            <label key={day} className="cw-weekday-item">
                              <input
                                type="checkbox"
                                checked={Boolean(periodDraft.primaryDays[day])}
                                onChange={() => togglePeriodDay(day)}
                              />
                              {SHORT_DAYS[day]}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="cw-period-hint">
                      Teacher will auto-populate from teacher-subject mapping for each assigned day.
                    </div>
                    <div className="cw-period-editor-actions">
                      <button className="cw-btn cw-btn-danger" onClick={clearPeriodAssignment}>Clear Period</button>
                      <button className="cw-editor-btn cw-editor-btn-cancel" onClick={closePeriodEditor}>Cancel</button>
                      <button className="cw-editor-btn cw-editor-btn-save" onClick={savePeriodAssignment}>Save</button>
                    </div>
                  </div>
                )}
                <div className="cw-grid-wrap">
                  <table className="cw-grid">
                    <thead>
                      <tr>
                        <th className="cw-th-day">Day</th>
                        {periodSlots.map((slot) => (
                          <th key={slot}>
                            <button
                              type="button"
                              className={`cw-period-header-btn ${editingPeriodSlot === slot ? 'cw-period-header-active' : ''}`}
                              onClick={() => openPeriodEditor(slot)}
                            >
                              Period {slot + 1}
                            </button>
                          </th>
                        ))}
                      </tr>
                      <tr className="cw-time-row">
                        <th className="cw-th-day">Time</th>
                        {periodSlots.map((slot) => (
                          <th key={`period-time-${slot}`}>{periodHeaderTimes[slot]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {WEEKDAYS.map((day) => (
                        <tr key={day}>
                          <td className="cw-td-day">{SHORT_DAYS[day]}</td>
                          {periodSlots.map((slot) => {
                            const cell = getCell(selectedClass.id, day, slot)
                            const isEditing = editingCell?.day === day && editingCell?.slot === slot
                            const color = cell.subject ? getSubjectColor(cell.subject) : null

                            return (
                              <td key={slot} style={{ position: 'relative' }}>
                                <div
                                  className="cw-cell"
                                  onClick={() => openEditor(day, slot)}
                                  style={color ? {
                                    background: `var(--cw-cell-bg, ${color.bg})`,
                                  } : undefined}
                                >
                                  {cell.subject ? (
                                    <div
                                      className="cw-cell-filled"
                                      style={{
                                        background: color!.bg,
                                        color: color!.text,
                                      }}
                                    >
                                      <div className="cw-cell-subject">{cell.subject}</div>
                                      {cell.teacher && (
                                        <div className="cw-cell-teacher" style={{ color: color!.text }}>{cell.teacher}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="cw-cell-empty">+</span>
                                  )}
                                </div>

                                {/* Cell editor dropdown */}
                                {isEditing && (
                                  <div className="cw-editor" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                                    <div className="cw-editor-title">{SHORT_DAYS[day]} — Period {slot + 1}</div>
                                    <div className="cw-editor-field">
                                      <label>Subject</label>
                                      <select
                                        className="cw-editor-select"
                                        value={cellDraft.subject}
                                        onChange={(e) => {
                                          const nextSubject = e.target.value
                                          if (
                                            nextSubject &&
                                            !canAssignSubjectToSlot(nextSubject, day, slot, selectedClass.id)
                                          ) {
                                            window.alert(
                                              `All teachers for ${nextSubject} are already busy in another section for this period.`
                                            )
                                            return
                                          }
                                          setCellDraft((p) => ({
                                            ...p,
                                            subject: nextSubject,
                                            teacher: nextSubject
                                              ? getAutoTeacherForSubject(nextSubject, day, slot, selectedClass.id)
                                              : '',
                                          }))
                                        }}
                                      >
                                        <option value="">— None —</option>
                                        {selectedClass.subjects.map((subj) => {
                                          const disabled =
                                            !!subj &&
                                            subj !== cellDraft.subject &&
                                            !canAssignSubjectToSlot(subj, day, slot, selectedClass.id)
                                          return (
                                            <option
                                              key={subj}
                                              value={subj}
                                              disabled={disabled}
                                            >
                                              {subj}
                                              {disabled ? ' [no free teacher]' : ''}
                                            </option>
                                          )
                                        })}
                                      </select>
                                    </div>
                                    <div className="cw-editor-field">
                                      <label>Teacher</label>
                                      <select
                                        className="cw-editor-select"
                                        value={cellDraft.teacher}
                                        onChange={(e) => setCellDraft((p) => ({ ...p, teacher: e.target.value }))}
                                        disabled={!cellDraft.subject}
                                      >
                                        <option value="">— None —</option>
                                        {getTeachersForSubject(cellDraft.subject).map((t) => {
                                          const conflict = hasTeacherConflict(t.name, day, slot, selectedClass.id)
                                          return (
                                            <option key={t.id} value={t.name} disabled={!!conflict}>
                                              {t.name}{t.shortName ? ` (${t.shortName})` : ''}{conflict ? ` [busy: ${conflict}]` : ''}
                                            </option>
                                          )
                                        })}
                                      </select>
                                      {cellDraft.teacher && (
                                        (() => {
                                          const conflict = hasTeacherConflict(cellDraft.teacher, day, slot, selectedClass.id)
                                          return conflict ? (
                                            <div className="cw-conflict-badge">Conflict: {cellDraft.teacher} is in {conflict}</div>
                                          ) : null
                                        })()
                                      )}
                                    </div>
                                    <div className="cw-editor-actions">
                                      {cell.subject && (
                                        <button className="cw-editor-btn cw-editor-btn-clear" onClick={clearCell}>Clear</button>
                                      )}
                                      <button className="cw-editor-btn cw-editor-btn-cancel" onClick={closeEditor}>Cancel</button>
                                      <button className="cw-editor-btn cw-editor-btn-save" onClick={saveCell}>Save</button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}

              {/* Subject legend + period counts */}
              {selectedClass.subjects.length > 0 && stats.filled > 0 && (
                <div className="cw-legend">
                  <span className="cw-legend-title">Subjects</span>
                  {selectedClass.subjects.map((subj) => {
                    const color = getSubjectColor(subj)
                    const count = stats.bySubject[subj] || 0
                    return (
                      <span
                        key={subj}
                        className="cw-legend-item"
                        style={{ background: color.bg, color: color.text }}
                      >
                        {subj}
                        {count > 0 && <span className="cw-legend-count">({count})</span>}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ClassWise
