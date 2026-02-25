import api from './api'

export interface CentreDatesheetEntry {
  _id: string
  examDate: string
  dayName: string
  subjectCode: string
  subjectName: string
  class: string
  timeSlot: {
    start: string
    end: string
  }
  duration: number
  candidateCount: number
  roomsNeeded: number
  sharedRoomPosition?: number
  answerSheetType: string
}

class CentreDatesheetService {
  /**
   * Get centre datesheet entries for answer sheet linking
   */
  async getEntries(): Promise<{ success: boolean; data: CentreDatesheetEntry[]; count: number }> {
    const response = await api.get('/centre-datesheet/entries')
    return response.data
  }
}

export default new CentreDatesheetService()
