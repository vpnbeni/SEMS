import api from './api'

export interface RoomAllocation {
  roomNo: string
  roomName: string
  candidates: number
}

export interface SchoolWiseCount {
  schoolName: string
  count: number
}

export interface AnswerSheetUsedDetail {
  serialFrom: string
  serialTo: string
  type: string
  colour: string
}

export interface TodaysExam {
  _id: string
  class: string
  subjectCode: string
  subjectName: string
  timeSlot: {
    start: string
    end: string
  }
  duration: number
  answerSheetType: string
  candidateCount: number
  roomsUsed: number
  rooms: RoomAllocation[]
  schoolWiseCandidateCount?: SchoolWiseCount[]
  answerSheetDetails?: AnswerSheetUsedDetail[]
  hindiMediumCandidateCount?: number
}

export interface PackingDetails {
  clothColor: string
  marker: string
  clothColorClass10?: string
  markerClass10?: string
  clothColorClass12?: string
  markerClass12?: string
}

export interface TodaysExamsResponse {
  examDate: string
  dayName: string
  exams: TodaysExam[]
  totalExams: number
  totalCandidates: number
  packing?: PackingDetails
  dutiesAssignedCount?: number
  dutiesByType?: Record<string, number>
}

const getTodaysExams = async (date?: string): Promise<TodaysExamsResponse> => {
  const response = await api.get('/dashboard/todays-exams', {
    params: date ? { date } : undefined,
  })
  return response.data?.data ?? response.data
}

const dashboardService = {
  getTodaysExams,
}

export default dashboardService
