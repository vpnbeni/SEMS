import api from './api'

export interface DutyFunctionary {
  _id: string
  name: string
  employeeId?: string
  department?: string
  designation?: string
}

export interface DutyRoom {
  _id: string
  roomNo: string
  roomName?: string
  floor?: string
}

export interface DutyRecord {
  _id: string
  examDate: string
  room: DutyRoom
  functionary: DutyFunctionary
  functionary2?: DutyFunctionary
  assignedAt?: string
}

export interface DailyDutiesResponse {
  examDate: string
  duties: DutyRecord[]
  totalAssigned: number
  totalRooms?: number
  roomCandidateSchoolCodes?: Record<string, string[]>
  roomSubjectCodes?: Record<string, string[]>
  roomSchoolNames?: Record<string, string[]>
  roomRollNumbers?: Record<string, string[]>
}

const getDailyDuties = async (examDate: string): Promise<DailyDutiesResponse> => {
  const response = await api.get('/duties', { params: { examDate } })
  return response.data?.data ?? { examDate, duties: [], totalAssigned: 0 }
}

const assignDailyDuties = async (payload: {
  examDate: string
  functionaryIds: string[]
  secondFunctionaryIds?: string[]
}, options?: { silent?: boolean }): Promise<DailyDutiesResponse> => {
  const response = await api.post('/duties/assign', payload, {
    ...(options?.silent ? { _silent: true } as any : {}),
  })
  return response.data?.data ?? { examDate: payload.examDate, duties: [], totalAssigned: 0 }
}

/** Fetch saved duty selections for a given dutyType */
const getDutySelections = async (dutyType: string): Promise<Record<string, boolean>> => {
  const response = await api.get('/duties/selections', { params: { dutyType } })
  return response.data?.data ?? {}
}

/** Save duty selections (replaces all existing for the dutyType) */
const saveDutySelections = async (dutyType: string, selections: Record<string, boolean>): Promise<void> => {
  await api.post('/duties/selections', { dutyType, selections })
}

const getDutyAllocationMode = async (): Promise<'auto' | 'manual'> => {
  const response = await api.get('/duties/allocation-mode')
  return response.data?.data?.mode === 'auto' ? 'auto' : 'manual'
}

const updateDutyAllocationMode = async (mode: 'auto' | 'manual', options?: { silent?: boolean }): Promise<'auto' | 'manual'> => {
  const response = await api.put('/duties/allocation-mode', { mode }, {
    ...(options?.silent ? { _silent: true } as any : {}),
  })
  return response.data?.data?.mode === 'auto' ? 'auto' : 'manual'
}

const downloadFunctionaryDutyRecord = async (examDate: string): Promise<Blob> => {
  const response = await api.get('/duties/functionary-duty-record', {
    params: { examDate },
    responseType: 'blob',
  })
  return response.data
}

/** Fetch total duty selection counts grouped by dutyType */
const getDutySelectionCounts = async (): Promise<Record<string, number>> => {
  const response = await api.get('/duties/selections/counts')
  return response.data?.data ?? {}
}

export interface ReplacementCandidate {
  _id: string
  name: string
  employeeId?: string
  schoolCode?: string
  eligibleRoomCount: number
  totalRooms: number
  dutyCount: number
}

const getReplacementCandidates = async (payload: {
  examDate: string
  currentFunctionaryIds: string[]
  replaceFunctionaryId: string
}): Promise<ReplacementCandidate[]> => {
  const response = await api.post('/duties/replacement-candidates', payload, {
    _silent: true,
  } as any)
  return response.data?.data ?? []
}

const dutiesService = {
  getDailyDuties,
  assignDailyDuties,
  getDutySelections,
  saveDutySelections,
  getDutyAllocationMode,
  updateDutyAllocationMode,
  downloadFunctionaryDutyRecord,
  getDutySelectionCounts,
  getReplacementCandidates,
}

export default dutiesService


