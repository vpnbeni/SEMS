import api from './api'

export interface TimetableClassState {
  id: string
  className: string
  section: string
  floor: string
  subjects: string[]
  incharge: string
}

export interface TimetableSubjectState {
  id: string
  name: string
  type: string
}

export interface TimetableTeacherState {
  id: string
  name: string
  shortName: string
  subjects: string[]
}

export interface TeacherSubjectClassAssignmentState {
  classId: string
  className: string
  section: string
  subjects: string[]
}

export interface TeacherSubjectAllocationState {
  teacherId: string
  teacherName: string
  assignments: TeacherSubjectClassAssignmentState[]
}

export interface ParallelSubjectPairState {
  id: string
  className: string
  subjectA: string
  subjectB: string
}

export interface TimetableCellState {
  subject: string
  teacher: string
}

export type TimetableGridState = Record<string, Record<string, Record<number, TimetableCellState>>>
export type PeriodAllocationState = Record<string, Record<string, number>>
export type TimetableMatrixSelectionState = Record<string, Record<string, boolean>>

export interface TimetableMatrixClassState {
  id: string
  name: string
}

export interface TimetableMatrixSectionState {
  id: string
  name: string
}

export interface TimetableStatePayload {
  classes: TimetableClassState[]
  subjects: TimetableSubjectState[]
  teachers: TimetableTeacherState[]
  teacherSubjectAllocations: TeacherSubjectAllocationState[]
  parallelSubjectPairs: ParallelSubjectPairState[]
  periodsPerWeek: number
  periodAllocation: PeriodAllocationState
  timetableGrid: TimetableGridState
  matrixClasses: TimetableMatrixClassState[]
  matrixSections: TimetableMatrixSectionState[]
  matrixSelection: TimetableMatrixSelectionState
}

const DEFAULT_TIMETABLE_STATE: TimetableStatePayload = {
  classes: [],
  subjects: [],
  teachers: [],
  teacherSubjectAllocations: [],
  parallelSubjectPairs: [],
  periodsPerWeek: 42,
  periodAllocation: {},
  timetableGrid: {},
  matrixClasses: [],
  matrixSections: [],
  matrixSelection: {},
}

const timetableService = {
  async getState(): Promise<TimetableStatePayload> {
    const response = await api.get('/timetable/state')
    const payload = response.data?.data as Partial<TimetableStatePayload> | undefined

    return {
      classes: Array.isArray(payload?.classes) ? payload!.classes : [],
      subjects: Array.isArray(payload?.subjects) ? payload!.subjects : [],
      teachers: Array.isArray(payload?.teachers) ? payload!.teachers : [],
      teacherSubjectAllocations: Array.isArray(payload?.teacherSubjectAllocations) ? payload!.teacherSubjectAllocations : [],
      parallelSubjectPairs: Array.isArray(payload?.parallelSubjectPairs) ? payload!.parallelSubjectPairs : [],
      periodsPerWeek:
        typeof payload?.periodsPerWeek === 'number' && payload.periodsPerWeek > 0
          ? payload.periodsPerWeek
          : DEFAULT_TIMETABLE_STATE.periodsPerWeek,
      periodAllocation: (payload?.periodAllocation ?? {}) as PeriodAllocationState,
      timetableGrid: (payload?.timetableGrid ?? {}) as TimetableGridState,
      matrixClasses: Array.isArray(payload?.matrixClasses) ? payload!.matrixClasses : [],
      matrixSections: Array.isArray(payload?.matrixSections) ? payload!.matrixSections : [],
      matrixSelection: (payload?.matrixSelection ?? {}) as TimetableMatrixSelectionState,
    }
  },

  async saveState(state: TimetableStatePayload): Promise<TimetableStatePayload> {
    const response = await api.put('/timetable/state', state)
    const payload = response.data?.data as Partial<TimetableStatePayload> | undefined

    return {
      classes: Array.isArray(payload?.classes) ? payload!.classes : [],
      subjects: Array.isArray(payload?.subjects) ? payload!.subjects : [],
      teachers: Array.isArray(payload?.teachers) ? payload!.teachers : [],
      teacherSubjectAllocations: Array.isArray(payload?.teacherSubjectAllocations) ? payload!.teacherSubjectAllocations : [],
      parallelSubjectPairs: Array.isArray(payload?.parallelSubjectPairs) ? payload!.parallelSubjectPairs : [],
      periodsPerWeek:
        typeof payload?.periodsPerWeek === 'number' && payload.periodsPerWeek > 0
          ? payload.periodsPerWeek
          : DEFAULT_TIMETABLE_STATE.periodsPerWeek,
      periodAllocation: (payload?.periodAllocation ?? {}) as PeriodAllocationState,
      timetableGrid: (payload?.timetableGrid ?? {}) as TimetableGridState,
      matrixClasses: Array.isArray(payload?.matrixClasses) ? payload!.matrixClasses : [],
      matrixSections: Array.isArray(payload?.matrixSections) ? payload!.matrixSections : [],
      matrixSelection: (payload?.matrixSelection ?? {}) as TimetableMatrixSelectionState,
    }
  },
}

export default timetableService
