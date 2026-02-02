import api from './api'

export interface RoomAllocation {
  roomNo: string
  roomName: string
  candidates: number
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
}

export interface TodaysExamsResponse {
  examDate: string
  dayName: string
  exams: TodaysExam[]
  totalExams: number
  totalCandidates: number
}

const getTodaysExams = async (): Promise<TodaysExamsResponse> => {
  const response = await api.get('/dashboard/todays-exams')
  return response.data.data
}

const dashboardService = {
  getTodaysExams,
}

export default dashboardService
