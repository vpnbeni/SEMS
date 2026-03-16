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
import { sidebarKeys } from './useSidebarCounts'
import type { Candidate, CandidateStats } from '../types/candidate'

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (params?: CandidateListParams) => [...candidateKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...candidateKeys.all, 'detail', id] as const,
  stats: (params?: Partial<CandidateListParams>) =>
    [...candidateKeys.all, 'stats', params ?? {}] as const,
  withoutSubjects: () => [...candidateKeys.all, 'withoutSubjects'] as const,
}

async function fetchCandidates(params: CandidateListParams): Promise<CandidateListResponse> {
  return candidateService.getCandidatesWithParams(params)
}

async function fetchCandidateStats(params?: Partial<CandidateListParams>): Promise<CandidateStats> {
  const data = await candidateService.getStats(params)
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

export interface CandidateSchool {
  schoolCode?: string
  schoolName?: string
}

export interface CandidateFilterOptions {
  schools: CandidateSchool[]
  categories: string[]
  pwdValues: string[]
  mediums: { value: string; label: string }[]
  subjectCodes: string[]
}

async function fetchCandidateFilterOptions(): Promise<CandidateFilterOptions> {
  const res = await candidateService.getCandidatesWithParams({ limit: 2000 })
  const list = res.data ?? []

  const byKey = new Map<string, CandidateSchool>()
  const categorySet = new Set<string>()
  const pwdSet = new Set<string>()
  const mediumSet = new Set<string>()
  const subjectCodeSet = new Set<string>()

  for (const c of list as any[]) {
    const code = String(c.schoolCode || '').trim()
    const name = String(c.schoolName || '').trim()
    const category = String(c.category || '').trim()
    const pwd = String(c.pwd || '').trim()

    if (category) categorySet.add(category)
    if (pwd) pwdSet.add(pwd)

    if (Array.isArray(c.subjectCodes)) {
      for (const sc of c.subjectCodes as any[]) {
        if (!sc) continue
        const subjCode =
          typeof sc === 'string'
            ? String(sc).trim()
            : String(sc.code || '').trim()
        const medium =
          typeof sc === 'object'
            ? String(sc.medium || '').trim()
            : ''
        if (subjCode) subjectCodeSet.add(subjCode)
        if (medium) mediumSet.add(medium)
      }
    }

    if (!code && !name) continue
    const key = code || name
    if (!byKey.has(key)) {
      byKey.set(key, {
        schoolCode: code || undefined,
        schoolName: name || undefined,
      })
    }
  }

  const schools = Array.from(byKey.values()).sort((a, b) => {
    const aLabel = `${a.schoolCode || ''} ${a.schoolName || ''}`.trim().toUpperCase()
    const bLabel = `${b.schoolCode || ''} ${b.schoolName || ''}`.trim().toUpperCase()
    return aLabel.localeCompare(bLabel)
  })

  const categories = Array.from(categorySet).sort((a, b) =>
    a.toUpperCase().localeCompare(b.toUpperCase()),
  )

  const pwdValues = Array.from(pwdSet).sort((a, b) =>
    a.toUpperCase().localeCompare(b.toUpperCase()),
  )

  const mediumLabel = (value: string): string => {
    if (value === '1') return 'English Medium'
    if (value === '2') return 'Hindi Medium'
    return `Medium ${value}`
  }

  const mediums = Array.from(mediumSet)
    .sort()
    .map((value) => ({
      value,
      label: mediumLabel(value),
    }))

  const subjectCodes = Array.from(subjectCodeSet).sort()

  return {
    schools,
    categories,
    pwdValues,
    mediums,
    subjectCodes,
  }
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
  params?: Partial<CandidateListParams>,
  options?: Omit<UseQueryOptions<CandidateStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: candidateKeys.stats(params),
    queryFn: () => fetchCandidateStats(params),
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

export function useCandidateFilterOptions(
  options?: Omit<
    UseQueryOptions<CandidateFilterOptions, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: [...candidateKeys.all, 'schools'],
    queryFn: fetchCandidateFilterOptions,
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
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
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
      queryClient.invalidateQueries({ queryKey: sidebarKeys.all })
    },
    ...options,
  })
}

export function useUpdateCandidateMutation(
  options?: UseMutationOptions<any, Error, { id: string; data: Record<string, any> }>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      candidateService.updateCandidate(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.detail(id) })
    },
    ...options,
  })
}
