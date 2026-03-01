import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import dashboardService, { type TodaysExamsResponse } from '../services/dashboardService'
import dutiesService, { type DailyDutiesResponse } from '../services/dutiesService'
import answerSheetService, { type AnswerSheetEntry } from '../services/answerSheetService'

// Query keys – centralised for invalidation
export const dashboardKeys = {
  all: ['dashboard'] as const,
  todaysExams: (date?: string) => [...dashboardKeys.all, 'todays-exams', date ?? ''] as const,
  dailyDuties: (date?: string) => [...dashboardKeys.all, 'daily-duties', date ?? ''] as const,
  answerSheets: () => [...dashboardKeys.all, 'answer-sheets'] as const,
}

// Fetch functions
async function fetchTodaysExams(date?: string): Promise<TodaysExamsResponse> {
  return dashboardService.getTodaysExams(date)
}

async function fetchDailyDuties(examDate: string): Promise<DailyDutiesResponse> {
  return dutiesService.getDailyDuties(examDate)
}

async function fetchAnswerSheets(): Promise<AnswerSheetEntry[]> {
  const response = await answerSheetService.getAnswerSheets()
  const data = response?.data ?? response
  return Array.isArray(data) ? data : []
}

/**
 * Hook to fetch today's (or any date's) exam dashboard data.
 */
export function useTodaysExams(
  date?: string,
  options?: Omit<UseQueryOptions<TodaysExamsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.todaysExams(date),
    queryFn: () => fetchTodaysExams(date),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch daily duty assignments for a given exam date.
 * @param examDate - DD.MM.YYYY format string (as stored in DutySelection)
 */
export function useDailyDuties(
  examDate?: string,
  options?: Omit<UseQueryOptions<DailyDutiesResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.dailyDuties(examDate),
    queryFn: () => fetchDailyDuties(examDate!),
    enabled: !!examDate,
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Hook to fetch all answer sheets for inventory display.
 */
export function useDashboardAnswerSheets(
  options?: Omit<UseQueryOptions<AnswerSheetEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.answerSheets(),
    queryFn: fetchAnswerSheets,
    staleTime: 2 * 60 * 1000,
    ...options,
  })
}
