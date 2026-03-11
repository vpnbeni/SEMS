import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import candidateService from '../services/candidateService'
import centreDetailsService, {
  defaultCentreDetails,
  type CentreDetails,
} from '../services/centreDetailsService'
import datesheetService from '../services/datesheetService'

export interface CandidateRow {
  schoolCode: string
  schoolName: string
  class: string
  rollNumber: string
}

export interface CentreDetailsSummary {
  candidates: CandidateRow[]
  examDays: number
}

const PAGE_LIMIT = 1000

export const centreDetailsKeys = {
  all: ['centreDetails'] as const,
  current: () => [...centreDetailsKeys.all, 'current'] as const,
  summary: () => [...centreDetailsKeys.all, 'summary'] as const,
}

async function fetchCentreDetails(): Promise<CentreDetails> {
  const data = await centreDetailsService.getCentreDetails()
  return data ?? defaultCentreDetails
}

async function fetchCentreDetailsSummary(): Promise<CentreDetailsSummary> {
  const allCandidates: CandidateRow[] = []
  let page = 1
  let totalPages = 1

  do {
    const res = await candidateService.getCandidatesWithParams({ page, limit: PAGE_LIMIT })
    const rows = Array.isArray(res?.data) ? res.data : []

    rows.forEach((row: any) => {
      allCandidates.push({
        schoolCode: String(row?.schoolCode || '').trim(),
        schoolName: String(row?.schoolName || '').trim(),
        class: String(row?.class || '').trim(),
        rollNumber: String(row?.rollNumber || '').trim(),
      })
    })

    totalPages = Number(res?.pages || 1)
    page += 1
  } while (page <= totalPages)

  let examDays = 0
  try {
    const statsRes = await datesheetService.getStats()
    const statsData = statsRes?.data?.data ?? {}
    const computedExamDays = Number(statsData?.centreDays ?? statsData?.fullDatesheetDays ?? 0)
    examDays = Number.isFinite(computedExamDays) ? computedExamDays : 0
  } catch {
    examDays = 0
  }

  return {
    candidates: allCandidates,
    examDays,
  }
}

export function useCentreDetails(
  options?: Omit<UseQueryOptions<CentreDetails, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: centreDetailsKeys.current(),
    queryFn: fetchCentreDetails,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export function useCentreDetailsSummary(
  options?: Omit<UseQueryOptions<CentreDetailsSummary, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: centreDetailsKeys.summary(),
    queryFn: fetchCentreDetailsSummary,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export function useUpdateCentreDetailsMutation(
  options?: UseMutationOptions<CentreDetails, Error, Partial<CentreDetails>>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (details) => centreDetailsService.updateCentreDetails(details),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.setQueryData(centreDetailsKeys.current(), data)
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}
