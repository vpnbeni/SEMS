import api from './api'

export interface CentreDetails {
  _id?: string
  centreNo: string
  centreName: string
  centreSchoolCode: string
  centreSuperintendent: string
  centreSuperintendentContact: string
  deputyCentreSuperintendent: string
  deputyCentreSuperintendentContact: string
  centreClerk: string
  centreClerkContact: string
  packingClothColor: string
  packingMarker: string
  packingClothColorClass10: string
  packingMarkerClass10: string
  packingClothColorClass12: string
  packingMarkerClass12: string
  dispatchSlipToAddress: string
  dispatchSlipFromAddress: string
  dispatchSlipInsuredAmount: string
}

export const defaultCentreDetails: CentreDetails = {
  centreNo: '',
  centreName: '',
  centreSchoolCode: '',
  centreSuperintendent: '',
  centreSuperintendentContact: '',
  deputyCentreSuperintendent: '',
  deputyCentreSuperintendentContact: '',
  centreClerk: '',
  centreClerkContact: '',
  packingClothColor: '',
  packingMarker: '',
  packingClothColorClass10: '',
  packingMarkerClass10: '',
  packingClothColorClass12: '',
  packingMarkerClass12: '',
  dispatchSlipToAddress: '',
  dispatchSlipFromAddress: '',
  dispatchSlipInsuredAmount: '1000',
}

const normalizeCentreDetails = (value: Partial<CentreDetails> | null | undefined): CentreDetails => ({
  ...defaultCentreDetails,
  ...(value || {}),
})

const getCentreDetails = async (): Promise<CentreDetails | null> => {
  const response = await api.get('/centre-details')
  const payload = response?.data?.data
  if (!payload || typeof payload !== 'object') {
    return null
  }
  return normalizeCentreDetails(payload)
}

const updateCentreDetails = async (details: Partial<CentreDetails>): Promise<CentreDetails> => {
  const response = await api.put('/centre-details', details)
  const payload = response?.data?.data ?? response?.data
  return normalizeCentreDetails(payload)
}

const centreDetailsService = {
  getCentreDetails,
  updateCentreDetails,
}

export default centreDetailsService
