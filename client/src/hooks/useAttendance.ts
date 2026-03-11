import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import attendanceService, {
  type AbsenteeRecord,
  type SaveAbsenteeRecord,
} from '../services/attendanceService'

export const attendanceKeys = {
  all: ['attendance'] as const,
  absentees: () => [...attendanceKeys.all, 'absentees'] as const,
}

export function useAttendanceAbsentees(
  options?: Omit<UseQueryOptions<AbsenteeRecord[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: attendanceKeys.absentees(),
    queryFn: attendanceService.getAbsentees,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export function useSaveAbsenteesMutation(
  options?: UseMutationOptions<unknown, Error, SaveAbsenteeRecord[]>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => attendanceService.saveAbsentees(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.absentees() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

export function useUploadAttendanceMutation(
  options?: UseMutationOptions<any, Error, { file: File; classValue: string }>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, classValue }) => attendanceService.uploadAttendanceSheet(file, classValue),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.absentees() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

export function useAbsenteeReportMutation(
  options?: UseMutationOptions<Blob, Error, string>
) {
  return useMutation({
    mutationFn: (classValue: string) => attendanceService.downloadAbsenteeReport(classValue),
    ...options,
  })
}
