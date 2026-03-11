import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import answerSheetService, {
  type AnswerSheetEntry,
  type AnswerSheetSerialRange,
} from '../services/answerSheetService'
import { sidebarKeys } from './useSidebarCounts'

export const answerSheetKeys = {
  all: ['answerSheets'] as const,
  list: (classFilter?: string | number) =>
    [...answerSheetKeys.all, 'list', classFilter ?? 'all'] as const,
}

async function fetchAnswerSheets(classFilter?: string | number): Promise<AnswerSheetEntry[]> {
  const filters = classFilter ? { class: String(classFilter) } : undefined
  const response = await answerSheetService.getAnswerSheets(filters)
  const data = response?.data ?? response
  return Array.isArray(data) ? data : []
}

export interface UseAnswerSheetsFilters {
  class?: string | number
}

export function useAnswerSheets(
  filters?: UseAnswerSheetsFilters,
  options?: Omit<
    UseQueryOptions<AnswerSheetEntry[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  const classFilter = filters?.class
  return useQuery({
    queryKey: answerSheetKeys.list(classFilter),
    queryFn: () => fetchAnswerSheets(classFilter),
    ...options,
  })
}

export interface CreateAnswerSheetVariables {
  answerSheetType: string
  pages: number
  colour: string
  class: string
  serialRanges?: AnswerSheetSerialRange[]
  serialFrom: string
  serialTo: string
  exam?: string
  subject?: string
  used?: number
  discarded?: number
  suffix?: string
  sortOrder?: number
}

export function useCreateAnswerSheetMutation(
  options?: UseMutationOptions<unknown, Error, CreateAnswerSheetVariables>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: CreateAnswerSheetVariables) =>
      answerSheetService.createAnswerSheet({
        ...variables,
        used: variables.used ?? 0,
        discarded: variables.discarded ?? 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerSheetKeys.all })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

export interface UploadExcelResult {
  success: boolean
  data: { created: number; skipped: number; failed: number }
}

export function useUploadExcelMutation(
  options?: UseMutationOptions<UploadExcelResult, Error, File>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) =>
      answerSheetService.uploadExcel(file) as Promise<UploadExcelResult>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerSheetKeys.all })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

export interface UseSheetsVariables {
  id: string
  quantity: number
  linkData?: {
    centreDatesheetEntryId?: string
    examDate?: string
    subjectCode?: string
    subjectName?: string
    candidateCount?: number
  }
}

export function useUseSheetsMutation(
  options?: UseMutationOptions<unknown, Error, UseSheetsVariables>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity, linkData }: UseSheetsVariables) =>
      answerSheetService.useSheets(id, quantity, linkData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerSheetKeys.all })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

export function useUpdateAnswerSheetMutation(
  options?: UseMutationOptions<
    unknown,
    Error,
    { id: string; data: Partial<AnswerSheetEntry> }
  >
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AnswerSheetEntry> }) =>
      answerSheetService.updateAnswerSheet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerSheetKeys.all })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

export interface DiscardSheetsVariables {
  id: string
  quantity: number
}

export function useDiscardSheetsMutation(
  options?: UseMutationOptions<unknown, Error, DiscardSheetsVariables>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity }: DiscardSheetsVariables) =>
      answerSheetService.discardSheets(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerSheetKeys.all })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

// --- Series hooks ---

export const seriesKeys = {
  current: ['answerSheetSeries'] as const,
}

export function useSeries(
  options?: Omit<
    UseQueryOptions<string | null, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: seriesKeys.current,
    queryFn: async () => {
      const response = await answerSheetService.getSeries()
      return response?.data?.series ?? null
    },
    ...options,
  })
}

export function useUpdateSeriesMutation(
  options?: UseMutationOptions<
    { success: boolean; data: { series: string | null; modifiedCount: number } },
    Error,
    string
  >
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (series: string) => answerSheetService.updateSeries(series),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seriesKeys.current })
      queryClient.invalidateQueries({ queryKey: answerSheetKeys.all })
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}
