import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import centreGuidelinesService, {
  type GuidelinesCheckResponse,
  type GuidelinesSearchResult,
} from '../services/centreGuidelinesService'

export const centreGuidelinesKeys = {
  all: ['centreGuidelines'] as const,
  check: () => [...centreGuidelinesKeys.all, 'check'] as const,
  parsed: () => [...centreGuidelinesKeys.all, 'parsed'] as const,
}

export function useCentreGuidelinesCheck(
  options?: Omit<UseQueryOptions<GuidelinesCheckResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: centreGuidelinesKeys.check(),
    queryFn: centreGuidelinesService.check,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export function useCentreGuidelinesParsed(
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: centreGuidelinesKeys.parsed(),
    queryFn: centreGuidelinesService.parse,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export function useUploadCentreGuidelinesMutation(
  options?: UseMutationOptions<unknown, Error, File>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => centreGuidelinesService.upload(file),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: centreGuidelinesKeys.check() })
      queryClient.invalidateQueries({ queryKey: centreGuidelinesKeys.parsed() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

export function useSearchCentreGuidelinesMutation(
  options?: UseMutationOptions<GuidelinesSearchResult[], Error, string>
) {
  return useMutation({
    mutationFn: (query) => centreGuidelinesService.search(query),
    ...options,
  })
}

export function useGuidelinesViewerMutation(
  options?: UseMutationOptions<Blob, Error, void>
) {
  return useMutation({
    mutationFn: () => centreGuidelinesService.getFileBlob(),
    ...options,
  })
}
