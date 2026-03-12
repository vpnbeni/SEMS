import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import dutiesService from '../services/dutiesService'
import { seatingPlanService, type Room } from '../services/seatingPlanService'
import centreDatesheetService from '../services/centreDatesheetService'
import { dashboardKeys } from './useDashboard'

/* ────────── helpers (mirror Duties.tsx derivation) ────────── */

const normalizeDateKey = (value: string | Date): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const normalizeSubjectCode = (value: string | undefined | null): string => {
  return String(value || '').trim().toUpperCase()
}

/* ────────── query keys ────────── */

export const dutiesKeys = {
  all: ['duties'] as const,
  support: () => [...dutiesKeys.all, 'support'] as const,
  selections: (dutyType: string) => [...dutiesKeys.all, 'selections', dutyType] as const,
  allocationMode: () => [...dutiesKeys.all, 'allocation-mode'] as const,
}

/* ────────── support data type ────────── */

export interface DutiesSupportData {
  rooms: Room[]
  examDates: string[]
  requiredRoomsByDate: Record<string, number>
  candidatesByDate: Record<string, number>
  examSubjectCodesByDate: Record<string, string[]>
}

async function fetchDutiesSupport(): Promise<DutiesSupportData> {
  const [roomsRes, datesheetRes] = await Promise.all([
    seatingPlanService.getRooms(),
    centreDatesheetService.getEntries(),
  ])

  const rooms = roomsRes || []
  const rawEntries = Array.isArray(datesheetRes?.data) ? datesheetRes.data : []
  const entries = rawEntries.filter(
    (entry: { candidateCount?: number }) => Number(entry?.candidateCount ?? 0) > 0
  )

  const nextRequired: Record<string, number> = {}
  const nextCandidates: Record<string, number> = {}
  const nextExamSubjectCodesByDate: Record<string, Set<string>> = {}

  const uniqueDates = Array.from(
    new Set(
      entries
        .map((entry: { examDate?: string; roomsNeeded?: number; candidateCount?: number; subjectCode?: string }) => {
          const dateKey = normalizeDateKey(entry.examDate ?? '')
          if (dateKey) {
            nextRequired[dateKey] = (nextRequired[dateKey] || 0) + Number(entry.roomsNeeded || 0)
            nextCandidates[dateKey] = (nextCandidates[dateKey] || 0) + Number(entry.candidateCount || 0)
            if (!nextExamSubjectCodesByDate[dateKey]) {
              nextExamSubjectCodesByDate[dateKey] = new Set<string>()
            }
            const subjectCode = normalizeSubjectCode(entry.subjectCode)
            if (subjectCode) nextExamSubjectCodesByDate[dateKey].add(subjectCode)
          }
          return dateKey
        })
        .filter(Boolean) as string[]
    )
  ).sort() as string[]

  return {
    rooms,
    examDates: uniqueDates,
    requiredRoomsByDate: nextRequired,
    candidatesByDate: nextCandidates,
    examSubjectCodesByDate: Object.fromEntries(
      Object.entries(nextExamSubjectCodesByDate).map(([dateKey, codes]) => [dateKey, Array.from(codes)])
    ),
  }
}

const DUTIES_STALE_TIME = 5 * 60 * 1000
const DUTIES_QUERY_OPTIONS = {
  staleTime: DUTIES_STALE_TIME,
  refetchOnWindowFocus: false,
}

/**
 * Support data for the Duties page: rooms, exam dates, and derived maps.
 */
export function useDutiesSupport(
  options?: Omit<UseQueryOptions<DutiesSupportData, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dutiesKeys.support(),
    queryFn: fetchDutiesSupport,
    ...DUTIES_QUERY_OPTIONS,
    ...options,
  })
}

/**
 * Saved duty selections for a given duty type (tab). Cached per dutyType so tab switches use cache.
 */
export function useDutySelections(
  dutyType: string,
  options?: Omit<UseQueryOptions<Record<string, boolean>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dutiesKeys.selections(dutyType),
    queryFn: () => dutiesService.getDutySelections(dutyType),
    enabled: !!dutyType,
    ...DUTIES_QUERY_OPTIONS,
    ...options,
  })
}

/**
 * Current duty allocation mode (auto | manual).
 */
export function useDutyAllocationMode(
  options?: Omit<UseQueryOptions<'auto' | 'manual', Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dutiesKeys.allocationMode(),
    queryFn: () => dutiesService.getDutyAllocationMode(),
    ...DUTIES_QUERY_OPTIONS,
    ...options,
  })
}

/**
 * Mutation to save duty selections for a duty type. Invalidates that tab's selections query.
 */
export function useSaveDutySelectionsMutation(
  options?: UseMutationOptions<void, Error, { dutyType: string; selections: Record<string, boolean> }>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dutyType, selections }) =>
      dutiesService.saveDutySelections(dutyType, selections),
    onSuccess: (_, { dutyType }) => {
      queryClient.invalidateQueries({ queryKey: dutiesKeys.selections(dutyType) })
    },
    ...options,
  })
}

/**
 * Mutation to update duty allocation mode. Invalidates allocation mode query.
 */
export function useUpdateDutyAllocationModeMutation(
  options?: UseMutationOptions<'auto' | 'manual', Error, { mode: 'auto' | 'manual'; silent?: boolean }>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ mode, silent }) => dutiesService.updateDutyAllocationMode(mode, { silent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dutiesKeys.allocationMode() })
    },
    ...options,
  })
}

/**
 * Mutation to assign daily duties. Invalidates daily duties for that date and dashboard.
 */
export function useAssignDailyDutiesMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof dutiesService.assignDailyDuties>>,
    Error,
    { examDate: string; functionaryIds: string[]; secondFunctionaryIds?: string[]; silent?: boolean }
  >
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      dutiesService.assignDailyDuties({
        examDate: payload.examDate,
        functionaryIds: payload.functionaryIds,
        secondFunctionaryIds: payload.secondFunctionaryIds,
      }, { silent: payload.silent }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.dailyDuties(variables.examDate) })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    ...options,
  })
}
