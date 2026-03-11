import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

/* ══════════════════════════════ Types ══════════════════════════════ */

export interface TimetableClass {
  id: string
  className: string
  section: string
  floor: string
  subjects: string[]
  incharge: string
}

export interface TimetableSubject {
  id: string
  name: string
  type: string
}

export interface TimetableTeacher {
  id: string
  name: string
  shortName: string
  subjects: string[]          // subjects they can teach
}

/**
 * Period allocation per class.
 * Key = class id, Value = map of subject name → period count
 */
export type PeriodAllocationMap = Record<string, Record<string, number>>

/** A single cell in the weekly timetable grid */
export interface TimetableCell {
  subject: string
  teacher: string
}

/** Empty sentinel for cleared cells */
export const EMPTY_CELL: TimetableCell = { subject: '', teacher: '' }

/**
 * Full timetable grid.
 * Structure: classId → day → periodSlot (0-based) → TimetableCell
 */
export type TimetableGrid = Record<string, Record<string, Record<number, TimetableCell>>>

/** Days of the week (Mon-Sat, fixed order) */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export type Weekday = typeof WEEKDAYS[number]

/* ══════════════════════════════ Context shape ══════════════════════════════ */

interface TimetableContextType {
  // Classes
  classes: TimetableClass[]
  addClass: (item: Omit<TimetableClass, 'id'>) => void
  updateClass: (id: string, data: Partial<TimetableClass>) => void
  deleteClasses: (ids: string[]) => void

  // Subjects
  subjects: TimetableSubject[]
  addSubject: (item: Omit<TimetableSubject, 'id'>) => void
  updateSubject: (id: string, data: Partial<TimetableSubject>) => void
  deleteSubjects: (ids: string[]) => void

  // Teachers
  teachers: TimetableTeacher[]
  addTeacher: (item: Omit<TimetableTeacher, 'id'>) => void
  updateTeacher: (id: string, data: Partial<TimetableTeacher>) => void
  deleteTeachers: (ids: string[]) => void

  // Period allocation
  periodsPerWeek: number
  setPeriodsPerWeek: (n: number) => void
  periodsPerDay: number
  periodAllocation: PeriodAllocationMap
  setPeriodCount: (classId: string, subject: string, count: number) => void
  clearPeriodAllocation: () => void

  // Timetable grid
  timetableGrid: TimetableGrid
  setGridCell: (classId: string, day: string, slot: number, cell: TimetableCell) => void
  clearGridForClass: (classId: string) => void
  clearAllGrid: () => void
}

const TimetableContext = createContext<TimetableContextType>({
  classes: [],
  addClass: () => {},
  updateClass: () => {},
  deleteClasses: () => {},
  subjects: [],
  addSubject: () => {},
  updateSubject: () => {},
  deleteSubjects: () => {},
  teachers: [],
  addTeacher: () => {},
  updateTeacher: () => {},
  deleteTeachers: () => {},
  periodsPerWeek: 42,
  setPeriodsPerWeek: () => {},
  periodsPerDay: 7,
  periodAllocation: {},
  setPeriodCount: () => {},
  clearPeriodAllocation: () => {},
  timetableGrid: {},
  setGridCell: () => {},
  clearGridForClass: () => {},
  clearAllGrid: () => {},
})

/* ══════════════════════════════ ID generator ══════════════════════════════ */

let _seq = 0
const genId = (prefix: string) => `${prefix}-${++_seq}-${Date.now()}`

/* ══════════════════════════════ Provider ══════════════════════════════ */

export const TimetableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<TimetableClass[]>([])
  const [subjects, setSubjects] = useState<TimetableSubject[]>([])
  const [teachers, setTeachers] = useState<TimetableTeacher[]>([])
  const [periodsPerWeek, setPeriodsPerWeek] = useState(42)
  const [periodAllocation, setPeriodAllocation] = useState<PeriodAllocationMap>({})
  const [timetableGrid, setTimetableGrid] = useState<TimetableGrid>({})

  const periodsPerDay = useMemo(() => Math.floor(periodsPerWeek / WEEKDAYS.length), [periodsPerWeek])

  // ── Classes ──
  const addClass = useCallback((item: Omit<TimetableClass, 'id'>) => {
    setClasses((prev) => [...prev, { ...item, id: genId('tc') }])
  }, [])

  const updateClass = useCallback((id: string, data: Partial<TimetableClass>) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }, [])

  const deleteClasses = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setClasses((prev) => prev.filter((c) => !idSet.has(c.id)))
    // Also clean up period allocation and grid for deleted classes
    setPeriodAllocation((prev) => {
      const next = { ...prev }
      ids.forEach((id) => delete next[id])
      return next
    })
    setTimetableGrid((prev) => {
      const next = { ...prev }
      ids.forEach((id) => delete next[id])
      return next
    })
  }, [])

  // ── Subjects ──
  const addSubject = useCallback((item: Omit<TimetableSubject, 'id'>) => {
    setSubjects((prev) => [...prev, { ...item, id: genId('ts') }])
  }, [])

  const updateSubject = useCallback((id: string, data: Partial<TimetableSubject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))
  }, [])

  const deleteSubjects = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setSubjects((prev) => prev.filter((s) => !idSet.has(s.id)))
  }, [])

  // ── Teachers ──
  const addTeacher = useCallback((item: Omit<TimetableTeacher, 'id'>) => {
    setTeachers((prev) => [...prev, { ...item, id: genId('tt') }])
  }, [])

  const updateTeacher = useCallback((id: string, data: Partial<TimetableTeacher>) => {
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  }, [])

  const deleteTeachers = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setTeachers((prev) => prev.filter((t) => !idSet.has(t.id)))
  }, [])

  // ── Period allocation ──
  const setPeriodCount = useCallback((classId: string, subject: string, count: number) => {
    setPeriodAllocation((prev) => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {}),
        [subject]: count,
      },
    }))
  }, [])

  const clearPeriodAllocation = useCallback(() => {
    setPeriodAllocation({})
  }, [])

  // ── Timetable grid ──
  const setGridCell = useCallback((classId: string, day: string, slot: number, cell: TimetableCell) => {
    setTimetableGrid((prev) => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {}),
        [day]: {
          ...((prev[classId] || {})[day] || {}),
          [slot]: cell,
        },
      },
    }))
  }, [])

  const clearGridForClass = useCallback((classId: string) => {
    setTimetableGrid((prev) => {
      const next = { ...prev }
      delete next[classId]
      return next
    })
  }, [])

  const clearAllGrid = useCallback(() => {
    setTimetableGrid({})
  }, [])

  return (
    <TimetableContext.Provider
      value={{
        classes,
        addClass,
        updateClass,
        deleteClasses,
        subjects,
        addSubject,
        updateSubject,
        deleteSubjects,
        teachers,
        addTeacher,
        updateTeacher,
        deleteTeachers,
        periodsPerWeek,
        setPeriodsPerWeek,
        periodsPerDay,
        periodAllocation,
        setPeriodCount,
        clearPeriodAllocation,
        timetableGrid,
        setGridCell,
        clearGridForClass,
        clearAllGrid,
      }}
    >
      {children}
    </TimetableContext.Provider>
  )
}

export const useTimetable = () => useContext(TimetableContext)

export default TimetableContext
