import { useMutation, useQueryClient } from '@tanstack/react-query'
import candidateService, {
  type ComparisonResult,
  type ImpactResult,
  type ReimportChange,
} from '../services/candidateService'
import { candidateKeys } from './useCandidates'

export function useReimportCompare() {
  return useMutation({
    mutationFn: async (file: File): Promise<ComparisonResult> => {
      const res = await candidateService.reimportCompare(file)
      const body = res.data ?? res
      return body.data
    },
  })
}

export function useReimportImpact() {
  return useMutation({
    mutationFn: async (changes: ReimportChange[]): Promise<ImpactResult> => {
      const res = await candidateService.reimportImpact(changes)
      const body = res.data ?? res
      return body.data
    },
  })
}

export function useReimportApply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (changes: ReimportChange[]) => {
      const res = await candidateService.reimportApply(changes)
      const body = res.data ?? res
      return body.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all })
    },
  })
}

export function useRemoveSubjectCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      subjectCode,
      classLevel,
      cascadeCleanup,
    }: {
      subjectCode: string
      classLevel: string
      cascadeCleanup?: boolean
    }) => {
      const res = await candidateService.removeSubjectCode(
        subjectCode,
        classLevel,
        cascadeCleanup
      )
      const body = res.data ?? res
      return body.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all })
    },
  })
}
