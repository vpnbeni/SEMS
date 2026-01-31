import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import subjectService, {
  type SubjectListParams,
  type SubjectListResponse,
  type SubjectStats,
} from '../services/subjectService'

export const subjectKeys = {
  all: ['subjects'] as const,
  list: (params?: SubjectListParams) => [...subjectKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...subjectKeys.all, 'detail', id] as const,
  stats: () => [...subjectKeys.all, 'stats'] as const,
}

export function useSubjectList(
  params: SubjectListParams,
  options?: Omit<
    UseQueryOptions<SubjectListResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: subjectKeys.list(params),
    queryFn: () => subjectService.getAllWithParams(params),
    ...options,
  })
}

export function useSubjectStats(
  options?: Omit<UseQueryOptions<SubjectStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: subjectKeys.stats(),
    queryFn: () => subjectService.getStats(),
    ...options,
  })
}

export function useSubject(id: string | null, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: subjectKeys.detail(id!),
    queryFn: () => subjectService.getById(id!).then((r) => r.data?.data ?? r.data),
    enabled: !!id,
    ...options,
  })
}

export function useCreateSubjectMutation(options?: UseMutationOptions<any, Error, any>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => subjectService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all })
    },
    ...options,
  })
}

export function useUpdateSubjectMutation(
  options?: UseMutationOptions<any, Error, { id: string; data: any }>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => subjectService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all })
      queryClient.invalidateQueries({ queryKey: subjectKeys.detail(variables.id) })
    },
    ...options,
  })
}

export function useDeleteSubjectMutation(options?: UseMutationOptions<unknown, Error, string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => subjectService.deleteById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all })
    },
    ...options,
  })
}

export function useDeleteAllSubjectsMutation(options?: UseMutationOptions<unknown, Error, void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => subjectService.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all })
    },
    ...options,
  })
}

export function useImportSubjectsMutation(options?: UseMutationOptions<any, Error, File>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => subjectService.importFromPDF(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all })
    },
    ...options,
  })
}
