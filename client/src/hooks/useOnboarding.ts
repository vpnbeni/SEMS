import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import onboardingService from '@/services/onboardingService';
import toast from 'react-hot-toast';

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
      toast.success('Onboarding session started');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start onboarding');
    },
  });
};

export const useCompleteStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stepNumber, formData }: { stepNumber: number; formData: FormData }) =>
      onboardingService.completeStep(stepNumber, formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success(`${data.result?.recordCount || 0} records processed successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete step');
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
      toast.success('Onboarding completed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete onboarding');
    },
  });
};

export const useOnboardingHistory = () => {
  return useQuery({
    queryKey: ['onboarding', 'history'],
    queryFn: onboardingService.getHistory,
  });
};
