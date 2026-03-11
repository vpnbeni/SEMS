import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import datesheetService, {
  type CBSEDatesheetParams,
  type CentreDatesheetParams,
  type DatesheetStats,
} from '../services/datesheetService'
import subjectService, { type SubjectListParams } from '../services/subjectService'
import { sidebarKeys } from './useSidebarCounts'

// Query keys – centralised for invalidation
export const datesheetKeys = {
  all: ['datesheets'] as const,
  list: () => [...datesheetKeys.all, 'list'] as const,
  stats: () => [...datesheetKeys.all, 'stats'] as const,
  cbse: (params?: CBSEDatesheetParams) => [...datesheetKeys.all, 'cbse', params ?? {}] as const,
  centre: (params?: CentreDatesheetParams) => [...datesheetKeys.all, 'centre', params ?? {}] as const,
}

export const subjectKeys = {
  all: ['subjects'] as const,
  list: (params?: SubjectListParams) => [...subjectKeys.all, 'list', params ?? {}] as const,
}

// Fetch functions
async function fetchDatesheets() {
  const res = await datesheetService.getAll()
  return res.data?.data?.datesheets ?? []
}

const emptyCbseCentre = { entries: [] as any[], meta: null as any, stats: null as any }

async function fetchCBSEDatesheet(params: CBSEDatesheetParams) {
  try {
    const { data } = await datesheetService.getCBSEDatesheet(params)
    if (!data?.success) return emptyCbseCentre
    return {
      entries: data.data ?? [],
      meta: data.meta ?? null,
      stats: data.stats ?? data.datesheet?.statistics ?? null,
    }
  } catch (err: any) {
    if (err?.response?.status === 404) return emptyCbseCentre
    throw err
  }
}

async function fetchCentreDatesheet(params: CentreDatesheetParams) {
  try {
    const { data } = await datesheetService.getCentreDatesheet(params)
    if (!data?.success) return emptyCbseCentre
    return {
      entries: data.data ?? [],
      meta: data.meta ?? null,
      stats: data.stats ?? null,
    }
  } catch (err: any) {
    if (err?.response?.status === 404) return emptyCbseCentre
    throw err
  }
}

async function fetchSubjects(params: SubjectListParams) {
  const { data } = await subjectService.getAll(params)
  if (!data?.success) return { subjects: [], meta: null }
  return {
    subjects: data.data ?? [],
    meta: data.meta ?? null,
  }
}

async function fetchDatesheetStats(): Promise<DatesheetStats> {
  const { data } = await datesheetService.getStats()
  if (!data?.success || !data?.data) {
    return {
      fullDatesheet: 0,
      fullDatesheetDays: 0,
      centre: 0,
      centreDays: 0,
      centreCandidates: 0,
      centre10th: 0,
      centre10thDays: 0,
      centre10thCandidates: 0,
      centre12th: 0,
      centre12thDays: 0,
      centre12thCandidates: 0,
    }
  }
  return data.data
}

// Query hooks
export function useDatesheets(
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: datesheetKeys.list(),
    queryFn: fetchDatesheets,
    ...options,
  })
}

export function useDatesheetStats(
  options?: Omit<UseQueryOptions<DatesheetStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: datesheetKeys.stats(),
    queryFn: fetchDatesheetStats,
    ...options,
  })
}

export function useCBSEDatesheet(
  params: CBSEDatesheetParams,
  options?: Omit<
    UseQueryOptions<{ entries: any[]; meta: any; stats: any }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: datesheetKeys.cbse(params),
    queryFn: () => fetchCBSEDatesheet(params),
    enabled: params != null,
    ...options,
  })
}

export function useCentreDatesheet(
  params: CentreDatesheetParams,
  options?: Omit<
    UseQueryOptions<{ entries: any[]; meta: any; stats: any }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: datesheetKeys.centre(params),
    queryFn: () => fetchCentreDatesheet(params),
    enabled: params != null,
    ...options,
  })
}

export function useSubjects(
  params: SubjectListParams,
  options?: Omit<
    UseQueryOptions<{ subjects: any[]; meta: any }, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: subjectKeys.list(params),
    queryFn: () => fetchSubjects(params),
    enabled: params != null,
    ...options,
  })
}

// Mutation hooks
export function useImportDatesheetMutation(
  options?: UseMutationOptions<any, Error, File>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => datesheetService.importFromPDF(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datesheetKeys.all })
      queryClient.invalidateQueries({ queryKey: datesheetKeys.stats() })
      queryClient.invalidateQueries({ queryKey: subjectKeys.all })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

export function useCreateDatesheetMutation(
  options?: UseMutationOptions<any, Error, any>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => datesheetService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datesheetKeys.all })
      queryClient.invalidateQueries({ queryKey: datesheetKeys.stats() })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

export function useUpdateDatesheetMutation(
  options?: UseMutationOptions<any, Error, { id: string; data: any }>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      datesheetService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datesheetKeys.all })
      queryClient.invalidateQueries({ queryKey: datesheetKeys.stats() })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}
