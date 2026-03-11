import api from './api'

export type BellTimingType = 'period' | 'break'

export interface BellTimingMetaPayload {
  schoolName: string
  title: string
  session: string
  effectiveDate: string
}

export interface BellTimingRowPayload {
  id: string
  type: BellTimingType
  label: string
  duration: number
}

export interface BellTimingsPayload {
  meta: BellTimingMetaPayload
  startTime: string
  rows: BellTimingRowPayload[]
}

const DEFAULT_BELL_TIMINGS: BellTimingsPayload = {
  meta: {
    schoolName: '',
    title: 'SUMMER BELL TIMINGS',
    session: '',
    effectiveDate: '',
  },
  startTime: '08:00',
  rows: [],
}

const normalizeBellTimingsPayload = (
  value: Partial<BellTimingsPayload> | null | undefined
): BellTimingsPayload => {
  const meta = (value?.meta ?? {}) as Partial<BellTimingMetaPayload>
  return {
    meta: {
      schoolName: String(meta.schoolName || ''),
      title: String(meta.title || DEFAULT_BELL_TIMINGS.meta.title),
      session: String(meta.session || ''),
      effectiveDate: String(meta.effectiveDate || ''),
    },
    startTime: String(value?.startTime || DEFAULT_BELL_TIMINGS.startTime),
    rows: Array.isArray(value?.rows)
      ? value!.rows.map((row, index) => ({
          id: String(row?.id || `bt-row-${index + 1}`),
          type: row?.type === 'break' ? 'break' : 'period',
          label: String(row?.label || ''),
          duration:
            typeof row?.duration === 'number' && Number.isFinite(row.duration) && row.duration > 0
              ? row.duration
              : row?.type === 'break'
                ? 15
                : 40,
        }))
      : [],
  }
}

const bellTimingsService = {
  async getBellTimings(): Promise<BellTimingsPayload> {
    const response = await api.get('/timetable/bell-timings')
    const payload = response.data?.data as Partial<BellTimingsPayload> | undefined
    return normalizeBellTimingsPayload(payload)
  },

  async saveBellTimings(payload: BellTimingsPayload): Promise<BellTimingsPayload> {
    const response = await api.put('/timetable/bell-timings', payload)
    const saved = response.data?.data as Partial<BellTimingsPayload> | undefined
    return normalizeBellTimingsPayload(saved)
  },
}

export default bellTimingsService
