import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import centreDatesheetService, {
  type CentreDatesheetEntry,
} from '../services/centreDatesheetService'
import { seatingPlanService } from '../services/seatingPlanService'

export const seatingPlanKeys = {
  all: ['seatingPlan'] as const,
  centreDatesheetEntries: () => [...seatingPlanKeys.all, 'centreDatesheetEntries'] as const,
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

export type SeatingPlanFormat = 'mainGate' | 'roomFolderSlip' | 'roomDoorSlip' | 'cbseCopy'

const FORMAT_FILENAMES: Record<SeatingPlanFormat, string> = {
  mainGate: 'main-gate.pdf',
  roomFolderSlip: 'room-folder-slip.pdf',
  roomDoorSlip: 'room-door-slip.pdf',
  cbseCopy: 'cbse-copy.pdf',
}

async function generatePDF(datesheetId: string, format: SeatingPlanFormat): Promise<Blob> {
  switch (format) {
    case 'mainGate':
      return seatingPlanService.generateMainGate(datesheetId)
    case 'roomFolderSlip':
      return seatingPlanService.generateRoomFolderSlip(datesheetId)
    case 'roomDoorSlip':
      return seatingPlanService.generateRoomDoorSlip(datesheetId)
    case 'cbseCopy':
      return seatingPlanService.generateCBSECopy(datesheetId)
    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

export interface GenerateSeatingPlanPDFVariables {
  datesheetId: string
  format: SeatingPlanFormat
}

export function useGenerateSeatingPlanPDFMutation(
  options?: UseMutationOptions<Blob, Error, GenerateSeatingPlanPDFVariables>
) {
  return useMutation({
    mutationFn: ({ datesheetId, format }: GenerateSeatingPlanPDFVariables) =>
      generatePDF(datesheetId, format),
    onSuccess: (blob, variables) => {
      const filename = FORMAT_FILENAMES[variables.format]
      seatingPlanService.downloadPDF(blob, filename)
    },
    ...options,
  })
}
