import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import sessionService, { type AcademicSessionInfo } from '../services/sessionService'

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
  available: () => [...sessionKeys.all, 'available'] as const,
}

/**
 * Fetch existing sessions for the tenant.
 */
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: async () => {
      const res = await sessionService.getSessions()
      return res
    },
  })
}

/**
 * Fetch available sessions (calendar-generated, merged with DB).
 */
export function useAvailableSessions() {
  return useQuery({
    queryKey: sessionKeys.available(),
    queryFn: async () => {
      const res = await sessionService.getAvailableSessions()
      return res
    },
  })
}

/**
 * Create (ensure) a session.
 */
export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (label: string) => sessionService.createSession(label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/**
 * Carry forward data from one session to another.
 */
export function useCarryForward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ targetLabel, sourceLabel }: { targetLabel: string; sourceLabel: string }) =>
      sessionService.carryForward(targetLabel, sourceLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

export type { AcademicSessionInfo }
