import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import centreDatesheetService, {
  type CentreDatesheetEntry,
} from '../services/centreDatesheetService'
import {
  seatingPlanService,
  type SeatingPlanTemplateSettings,
} from '../services/seatingPlanService'

export const seatingPlanKeys = {
  all: ['seatingPlan'] as const,
  centreDatesheetEntries: () => [...seatingPlanKeys.all, 'centreDatesheetEntries'] as const,
  templateSettings: () => [...seatingPlanKeys.all, 'templateSettings'] as const,
}

async function fetchCentreDatesheetEntries(): Promise<CentreDatesheetEntry[]> {
  const response = await centreDatesheetService.getEntries()
  return response?.data ?? []
}

export function useCentreDatesheetEntries(
  options?: Omit<
    UseQueryOptions<CentreDatesheetEntry[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: seatingPlanKeys.centreDatesheetEntries(),
    queryFn: fetchCentreDatesheetEntries,
    ...options,
  })
}

async function fetchTemplateSettings(): Promise<SeatingPlanTemplateSettings> {
  return seatingPlanService.getTemplateSettings()
}

export function useSeatingPlanTemplateSettings(
  options?: Omit<
    UseQueryOptions<SeatingPlanTemplateSettings, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: seatingPlanKeys.templateSettings(),
    queryFn: fetchTemplateSettings,
    ...options,
  })
}

export type SeatingPlanFormat = 'mainGate' | 'roomFolderSlip' | 'roomDoorSlip' | 'cbseCopy'

const FORMAT_FILENAMES: Record<SeatingPlanFormat, string> = {
  mainGate: 'main-gate.pdf',
  roomFolderSlip: 'room-folder-slip.pdf',
  roomDoorSlip: 'room-door-slip.pdf',
  cbseCopy: 'cbse-copy.pdf',
}

const extractPdfErrorMessage = async (error: any): Promise<string> => {
  const fallback = 'Failed to generate PDF. Please try again.'
  const data = error?.response?.data
  const status = Number(error?.response?.status || 0)
  const allocationGuidance =
    'Rooms are not allocated for this exam date. Please allocate rooms first in Exam Room/Hall or switch room allocation mode to Auto.'

  if (data instanceof Blob) {
    try {
      const text = await data.text()
      if (!text) return error?.message || fallback
      try {
        const parsed = JSON.parse(text)
        return parsed?.message || parsed?.error || text || error?.message || fallback
      } catch {
        return text || error?.message || fallback
      }
    } catch {
      return error?.message || fallback
    }
  }

  if (typeof data === 'string' && data.trim()) {
    try {
      const parsed = JSON.parse(data)
      return parsed?.message || parsed?.error || data
    } catch {
      return data
    }
  }

  if (data && typeof data === 'object') {
    return data.message || data.error || error?.message || fallback
  }

  if (status === 400) {
    return allocationGuidance
  }

  const genericMessage = String(error?.message || '')
  if (genericMessage.includes('status code 400')) {
    return allocationGuidance
  }

  return error?.message || fallback
}

async function generatePDF(datesheetId: string, format: SeatingPlanFormat): Promise<Blob> {
  try {
    switch (format) {
      case 'mainGate':
        return await seatingPlanService.generateMainGate(datesheetId)
      case 'roomFolderSlip':
        return await seatingPlanService.generateRoomFolderSlip(datesheetId)
      case 'roomDoorSlip':
        return await seatingPlanService.generateRoomDoorSlip(datesheetId)
      case 'cbseCopy':
        return await seatingPlanService.generateCBSECopy(datesheetId)
      default:
        throw new Error(`Unknown format: ${format}`)
    }
  } catch (error: any) {
    const message = await extractPdfErrorMessage(error)
    throw new Error(message)
  }
}

export interface GenerateSeatingPlanPDFVariables {
  datesheetId: string
  format: SeatingPlanFormat
  filename?: string
}

type GenerateSeatingPlanPDFMutationOptions = UseMutationOptions<
  Blob,
  Error,
  GenerateSeatingPlanPDFVariables
> & {
  autoDownload?: boolean
}

export function useGenerateSeatingPlanPDFMutation(
  options?: GenerateSeatingPlanPDFMutationOptions
) {
  const autoDownload = options?.autoDownload ?? true

  return useMutation({
    mutationFn: ({ datesheetId, format }: GenerateSeatingPlanPDFVariables) =>
      generatePDF(datesheetId, format),
    onSuccess: (blob, variables, onMutateResult, context) => {
      if (autoDownload) {
        const filename = variables.filename || FORMAT_FILENAMES[variables.format]
        seatingPlanService.downloadPDF(blob, filename)
      }
      options?.onSuccess?.(blob, variables, onMutateResult, context)
    },
    ...options,
  })
}

export function useUpdateSeatingPlanTemplateSettingsMutation(
  options?: UseMutationOptions<
    SeatingPlanTemplateSettings,
    Error,
    SeatingPlanTemplateSettings
  >
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings) => seatingPlanService.updateTemplateSettings(settings),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.setQueryData(seatingPlanKeys.templateSettings(), data)
      options?.onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}
