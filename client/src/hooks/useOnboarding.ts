import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import onboardingService, { type JobState } from '@/services/onboardingService';

export const useOnboardingStatus = () => {
  return useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: onboardingService.getStatus,
  });
};

export const useStartOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionType: 'initial' | 'reimport' = 'initial') =>
      onboardingService.startSession(sessionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
};

export const useCompleteStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepNumber, formData }: { stepNumber: number; formData: FormData }) =>
      onboardingService.completeStep(stepNumber, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
};

export const useValidationReport = () => {
  return useQuery({
    queryKey: ['onboarding', 'validation'],
    queryFn: onboardingService.getValidationReport,
    enabled: false, // Only fetch when explicitly called
  });
};

export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: onboardingService.completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
};

export const useOnboardingHistory = () => {
  return useQuery({
    queryKey: ['onboarding', 'history'],
    queryFn: onboardingService.getHistory,
  });
};

/**
 * Queue both attendance PDFs for background processing.
 * Returns immediately with a jobId.
 */
export const useQueueAttendanceUpload = () => {
  return useMutation({
    mutationFn: (formData: FormData) => onboardingService.queueAttendanceUpload(formData),
  });
};

/**
 * Poll a background attendance job every 3 seconds while it is active/waiting.
 * Stops polling automatically when the job reaches 'completed' or 'failed'.
 */
export const useJobStatus = (jobId: string | null) => {
  return useQuery({
    queryKey: ['attendance-job', jobId],
    queryFn: () => onboardingService.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data?.state as JobState | undefined;
      if (state === 'completed' || state === 'failed') return false;
      return 3000;
    },
    staleTime: 0,
  });
};
