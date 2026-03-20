import api from './api';

export type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';

export interface AttendanceJobProgress {
  stage: string;
  percent: number;
  processed?: number;
  total?: number;
}

export interface AttendanceJobStatusResponse {
  success: boolean;
  jobId: string;
  state: JobState;
  progress: AttendanceJobProgress | null;
  result: { classX: { uploaded: number }; classXII: { uploaded: number } } | null;
  failedReason: string | null;
}

export interface QueueAttendanceResponse {
  success: boolean;
  jobId: string;
  status: 'queued';
  message: string;
}

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

  // Queue both attendance PDFs for background processing (replaces steps 5 & 6).
  // Returns immediately with a jobId — no 5-minute wait.
  queueAttendanceUpload: async (formData: FormData): Promise<QueueAttendanceResponse> => {
    const response = await api.post('/onboarding/attendance-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 1 min — just for uploading the raw PDFs to Cloudinary
    });
    return response.data;
  },

  // Poll the status of a background attendance processing job.
  getJobStatus: async (jobId: string): Promise<AttendanceJobStatusResponse> => {
    const response = await api.get(`/onboarding/jobs/${jobId}/status`);
    return response.data;
  },
};

export default onboardingService;
