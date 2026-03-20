import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import onboardingService from '@/services/onboardingService';

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
