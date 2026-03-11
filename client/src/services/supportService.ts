import api from './api'

export interface SupportTicketPayload {
  centreCode: string
  examDate: string
  module: 'Candidates' | 'Seating Plan' | 'Duties' | 'Answer Sheets' | 'Reports'
  description: string
  screenshot?: string
}

export interface FeedbackPayload {
  name: string
  email: string
  rating: number
  message: string
}

const submitTicket = async (payload: SupportTicketPayload) => {
  const response = await api.post('/support/ticket', payload)
  return response.data
}

const submitFeedback = async (payload: FeedbackPayload) => {
  const response = await api.post('/support/feedback', payload)
  return response.data
}

const supportService = {
  submitTicket,
  submitFeedback,
}

export default supportService
