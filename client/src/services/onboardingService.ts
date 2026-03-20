import api from './api';

export interface OnboardingStep {
  status: 'pending' | 'completed' | 'skipped';
  completedAt?: string;
  recordCount?: number;
  fileUrl?: string;
  validationWarnings?: string[];
}

export interface OnboardingSession {
  _id: string;
  userId: string;
  sessionType: 'initial' | 'reimport';
  steps: {
    candidateImportX: OnboardingStep;
    candidateImportXII: OnboardingStep;
    form66UploadX: OnboardingStep;
    form66UploadXII: OnboardingStep;
    attendanceUploadX: OnboardingStep;
    attendanceUploadXII: OnboardingStep;
  };
  validationReport: {
    candidateCountX?: number;
    candidateCountXII?: number;
    form66MismatchesX?: any[];
    form66MismatchesXII?: any[];
    attendanceMismatchesX?: any[];
    attendanceMismatchesXII?: any[];
    overallStatus: 'valid' | 'warnings' | 'errors';
  };
  completedAt?: string;
  createdAt: string;
}

export interface OnboardingStatusResponse {
  success: boolean;
  hasSession: boolean;
  isComplete: boolean;
  session?: OnboardingSession;
}

const onboardingService = {
  // Get current onboarding status
  getStatus: async (): Promise<OnboardingStatusResponse> => {
    const response = await api.get('/onboarding/status');
    return response.data;
  },

  // Start new onboarding session
  startSession: async (sessionType: 'initial' | 'reimport' = 'initial') => {
    const response = await api.post('/onboarding/start', { sessionType });
    return response.data;
  },

  // Complete a step (PDF processing can take minutes for large files)
  completeStep: async (stepNumber: number, formData: FormData) => {
    const response = await api.post(`/onboarding/step/${stepNumber}/complete`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes — matches candidateService for large PDF processing
    });
    return response.data;
  },

  // Get validation report
  getValidationReport: async () => {
    const response = await api.get('/onboarding/validation-report');
    return response.data;
  },

  // Complete onboarding
  completeOnboarding: async () => {
    const response = await api.post('/onboarding/complete');
    return response.data;
  },

  // Get onboarding history
  getHistory: async () => {
    const response = await api.get('/onboarding/history');
    return response.data;
  },
};

export default onboardingService;
