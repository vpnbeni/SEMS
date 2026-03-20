import api from './api'

export type RemunerationRate = {
  remuneration: number
  conveyance: number
  refreshment: number
}

export type RemunerationRatesResponse = {
  byDutyType: Record<string, RemunerationRate>
}

const getRates = async (): Promise<RemunerationRatesResponse> => {
  const response = await api.get('/remuneration/rates')
  return response.data?.data ?? { byDutyType: {} }
}

export const remunerationRatesService = {
  getRates,
}

