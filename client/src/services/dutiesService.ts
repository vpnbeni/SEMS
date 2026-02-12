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
  assignedAt?: string
}

export interface DailyDutiesResponse {
  examDate: string
  duties: DutyRecord[]
  totalAssigned: number
  totalRooms?: number
}

const getDailyDuties = async (examDate: string): Promise<DailyDutiesResponse> => {
  const response = await api.get('/duties', { params: { examDate } })
  return response.data?.data ?? { examDate, duties: [], totalAssigned: 0 }
}

const assignDailyDuties = async (payload: { examDate: string; functionaryIds: string[] }): Promise<DailyDutiesResponse> => {
  const response = await api.post('/duties/assign', payload)
  return response.data?.data ?? { examDate: payload.examDate, duties: [], totalAssigned: 0 }
}

const dutiesService = {
  getDailyDuties,
  assignDailyDuties,
}

export default dutiesService
