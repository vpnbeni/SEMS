import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { dispatchSlipService } from '../services/dispatchSlipService'

export const dispatchSlipKeys = {
  all: ['dispatchSlip'] as const,
  pdfBucket: () => [...dispatchSlipKeys.all, 'pdf'] as const,
  pdf: (entryId: string, destination: string) =>
    [...dispatchSlipKeys.pdfBucket(), entryId, destination] as const,
}

export interface GenerateDispatchSlipVariables {
  entryId: string
  destination: string
  filename?: string
}

type GenerateDispatchSlipOptions = UseMutationOptions<
  Blob,
  Error,
  GenerateDispatchSlipVariables
> & {
  autoDownload?: boolean
}

export function useGenerateDispatchSlipPdfMutation(options?: GenerateDispatchSlipOptions) {
  const autoDownload = options?.autoDownload ?? false
  const queryClient = useQueryClient()
  const maxPdfCacheAgeMs = 5 * 60 * 1000

  return useMutation({
    mutationFn: async ({ entryId, destination }: GenerateDispatchSlipVariables) => {
      const cacheKey = dispatchSlipKeys.pdf(entryId, destination)
      const cached = queryClient.getQueryData<Blob>(cacheKey)
      const cachedState = queryClient.getQueryState(cacheKey)
      const cacheAge = Date.now() - Number(cachedState?.dataUpdatedAt || 0)

      if (cached && cacheAge < maxPdfCacheAgeMs) {
        return cached
      }

      const blob = await dispatchSlipService.downloadDispatchSlipPdf(entryId, destination)
      queryClient.setQueryData(cacheKey, blob)
      return blob
    },
    onSuccess: (blob, variables, onMutateResult, context) => {
      queryClient.setQueryData(dispatchSlipKeys.pdf(variables.entryId, variables.destination), blob)
      if (autoDownload) {
        const filename = variables.filename || `dispatch-slip_${variables.entryId}.pdf`
        dispatchSlipService.downloadPDF(blob, filename)
      }
      options?.onSuccess?.(blob, variables, onMutateResult, context)
    },
    ...options,
  })
}

