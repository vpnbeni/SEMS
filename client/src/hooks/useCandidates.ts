import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import candidateService, {
  type CandidateListParams,
  type CandidateListResponse,
} from '../services/candidateService'
import type { Candidate, CandidateStats } from '../types/candidate'

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (params?: CandidateListParams) => [...candidateKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...candidateKeys.all, 'detail', id] as const,
  stats: () => [...candidateKeys.all, 'stats'] as const,
  withoutSubjects: () => [...candidateKeys.all, 'withoutSubjects'] as const,
}

async function fetchCandidates(params: CandidateListParams): Promise<CandidateListResponse> {
  return candidateService.getCandidatesWithParams(params)
}

async function fetchCandidateStats(): Promise<CandidateStats> {
  const data = await candidateService.getStats()
  return data ?? {
    totalCandidates: 0,
    class10th: 0,
    class12th: 0,
    byCourse: [],
    byDepartment: [],
  }
}

export interface CandidateWithoutSubject {
  rollNumber: string
  name: string
  page: number
}

const MAIN_LIST_PAGE_SIZE = 50

async function fetchCandidatesWithoutSubjects(): Promise<CandidateWithoutSubject[]> {
  const res = await candidateService.getCandidatesWithParams({ limit: 1000 })
  const list = res.data ?? []
  return list
    .map((c: any, index: number) => ({
      ...c,
      globalIndex: index,
    }))
    .filter((c: any) => !c.subjects || c.subjects.length === 0)
    .map((c: any) => ({
      rollNumber: c.rollNumber,
      name: c.name,
      page: Math.floor(c.globalIndex / MAIN_LIST_PAGE_SIZE) + 1,
    }))
}

export function useCandidates(
  params: CandidateListParams,
  options?: Omit<
    UseQueryOptions<CandidateListResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: candidateKeys.list(params),
    queryFn: () => fetchCandidates(params),
    ...options,
  })
}

export function useCandidateStats(
  options?: Omit<UseQueryOptions<CandidateStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: candidateKeys.stats(),
    queryFn: fetchCandidateStats,
    ...options,
  })
}

export function useCandidatesWithoutSubjects(
  options?: Omit<
    UseQueryOptions<CandidateWithoutSubject[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: candidateKeys.withoutSubjects(),
    queryFn: fetchCandidatesWithoutSubjects,
    ...options,
  })
}

export function useCandidate(id: string | null, options?: Omit<UseQueryOptions<Candidate, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: candidateKeys.detail(id!),
    queryFn: () => candidateService.getCandidate(id!).then((r) => r.data?.data ?? r.data),
    enabled: !!id,
    ...options,
  })
}

export function useImportCandidatesMutation(
  options?: UseMutationOptions<any, Error, File>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => candidateService.importFromPDF(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all })
    },
    ...options,
  })
}

export function useDeleteCandidateMutation(
  options?: UseMutationOptions<unknown, Error, string>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await candidateService.deleteCandidate(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all })
    },
    ...options,
  })
}
