import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import form66Service, {
  type Form66Record,
  type Form66UploadResponse,
} from '../services/form66Service'

export type Form66ClassKey = 'X' | 'XII'

export interface Form66FileUrls {
  original: Record<Form66ClassKey, string | null>
  processed: Record<Form66ClassKey, string | null>
}

const CLASS_MAP: Record<Form66ClassKey, '10th' | '12th'> = {
  X: '10th',
  XII: '12th',
}

export const form66Keys = {
  all: ['form66'] as const,
  records: () => [...form66Keys.all, 'records'] as const,
  fileUrls: () => [...form66Keys.all, 'fileUrls'] as const,
}

export function useForm66Records(
  options?: Omit<UseQueryOptions<Form66Record[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: form66Keys.records(),
    queryFn: form66Service.getRecords,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

async function fetchForm66FileUrls(): Promise<Form66FileUrls> {
  const entries = await Promise.all(
    (Object.keys(CLASS_MAP) as Form66ClassKey[]).map(async (key) => {
      const classQuery = CLASS_MAP[key]
      const [processedUrl, originalUrl] = await Promise.all([
        form66Service.getProcessedPdfUrl(classQuery),
        form66Service.getOriginalFileUrl(classQuery),
      ])
      return { key, processedUrl, originalUrl }
    })
  )

  const next: Form66FileUrls = {
    original: { X: null, XII: null },
    processed: { X: null, XII: null },
  }

  entries.forEach(({ key, processedUrl, originalUrl }) => {
    next.processed[key] = processedUrl
    next.original[key] = originalUrl
  })

  return next
}

export function useForm66FileUrls(
  options?: Omit<UseQueryOptions<Form66FileUrls, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: form66Keys.fileUrls(),
    queryFn: fetchForm66FileUrls,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export function useUploadForm66Mutation(
  options?: UseMutationOptions<Form66UploadResponse, Error, File>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => form66Service.upload(file),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: form66Keys.records() })
      queryClient.invalidateQueries({ queryKey: form66Keys.fileUrls() })
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}

export function useForm66DatePdfMutation(
  options?: UseMutationOptions<Blob, Error, { date: string; subjectCode?: string }>
) {
  return useMutation({
    mutationFn: ({ date, subjectCode }) => form66Service.getDatePdf(date, subjectCode),
    ...options,
  })
}
