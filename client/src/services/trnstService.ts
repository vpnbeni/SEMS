import api from './api'

export type VehicleStatus = 'active' | 'maintenance' | 'inactive'
export type VehicleType = 'Bus' | 'Mini Bus' | 'Van' | 'Winger' | 'Other'
export type RouteShift = 'morning' | 'afternoon' | 'both'

export type TransportVehicle = {
  _id: string
  registrationNumber: string
  vehicleType: VehicleType
  make?: string
  model?: string
  color?: string
  capacity?: number
  driverName?: string
  driverPhone?: string
  conductorName?: string
  conductorPhone?: string
  insuranceExpiry?: string | null
  fitnessExpiry?: string | null
  status: VehicleStatus
  notes?: string
}

export type TransportStop = {
  name: string
  landmark?: string
  pickupTime?: string
  dropTime?: string
  sequence?: number
}

export type TransportRoute = {
  _id: string
  name: string
  code: string
  vehicleId?: TransportVehicle | string | null
  shift: RouteShift
  startPoint?: string
  endPoint?: string
  distanceKm?: number
  stops?: TransportStop[]
  isActive?: boolean
}

export type CommuteMode = 'Walk' | 'Bicycle' | 'Parent drop' | 'Own vehicle' | 'Other'

export type SelfStudentRecord = {
  _id: string
  studentId: string
  name: string
  rollNumber?: string
  className?: string
  section?: string
  commuteMode: CommuteMode
  guardianPhone?: string
  notes?: string
}

export type SelfStudentOption = {
  _id: string
  name: string
  rollNumber?: string
  class?: string
  section?: string
  guardianPhone?: string
  phone?: string
}

export type TransportOverview = {
  vehicles: TransportVehicle[]
  routes: TransportRoute[]
  selfStudents?: SelfStudentRecord[]
  stats: {
    vehicleCount: number
    routeCount: number
    activeVehicles: number
    maintenanceVehicles: number
    totalCapacity: number
    totalStops: number
    selfStudentCount?: number
  }
}

const getOverview = async () => {
  const response = await api.get('/trnst/overview')
  return response.data.data as TransportOverview
}

const getVehicles = async () => {
  const response = await api.get('/trnst/vehicles')
  return (response.data.data || []) as TransportVehicle[]
}

const saveVehicle = async (payload: Partial<TransportVehicle>, id?: string) => {
  if (id) return api.put(`/trnst/vehicles/${id}`, payload)
  return api.post('/trnst/vehicles', payload)
}

const deleteVehicle = async (id: string) => api.delete(`/trnst/vehicles/${id}`)

const getRoutes = async () => {
  const response = await api.get('/trnst/routes')
  return (response.data.data || []) as TransportRoute[]
}

const saveRoute = async (payload: Partial<TransportRoute>, id?: string) => {
  if (id) return api.put(`/trnst/routes/${id}`, payload)
  return api.post('/trnst/routes', payload)
}

const deleteRoute = async (id: string) => api.delete(`/trnst/routes/${id}`)

const getSelfStudents = async (params?: { className?: string; section?: string }) => {
  const response = await api.get('/trnst/self-students', { params })
  return (response.data.data || { records: [], availableStudents: [], classOptions: [] }) as {
    records: SelfStudentRecord[]
    availableStudents: SelfStudentOption[]
    classOptions: Array<{ className: string; sections: string[] }>
  }
}

const saveSelfStudent = async (payload: Partial<SelfStudentRecord> & { studentId?: string }, id?: string) => {
  if (id) return api.put(`/trnst/self-students/${id}`, payload)
  return api.post('/trnst/self-students', payload)
}

const deleteSelfStudent = async (id: string) => api.delete(`/trnst/self-students/${id}`)

const trnstService = {
  getOverview,
  getVehicles,
  saveVehicle,
  deleteVehicle,
  getRoutes,
  saveRoute,
  deleteRoute,
  getSelfStudents,
  saveSelfStudent,
  deleteSelfStudent,
}

export default trnstService
