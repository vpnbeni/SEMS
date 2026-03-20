import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOnboardingStatus, useStartOnboarding, useCompleteStep, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface StepConfig {
  number: number;
  title: string;
  description: string;
  fileType: 'pdf' | 'txt';
  stepKey: string;
}

const STEPS: StepConfig[] = [
  {
    number: 1,
    title: 'Import Class X Candidates',
    description: 'Upload PDF containing Class X candidate list',
    fileType: 'pdf',
    stepKey: 'candidateImportX',
  },
  {
    number: 2,
    title: 'Import Class XII Candidates',
    description: 'Upload PDF containing Class XII candidate list',
    fileType: 'pdf',
    stepKey: 'candidateImportXII',
  },
  {
    number: 3,
    title: 'Upload Form 66 (Class X)',
    description: 'Upload Form 66 text file for Class X',
    fileType: 'txt',
    stepKey: 'form66UploadX',
  },
  {
    number: 4,
    title: 'Upload Form 66 (Class XII)',
    description: 'Upload Form 66 text file for Class XII',
    fileType: 'txt',
    stepKey: 'form66UploadXII',
  },
  {
    number: 5,
    title: 'Upload Attendance Sheet (Class X)',
    description: 'Upload attendance sheet PDF with candidate photos for Class X',
    fileType: 'pdf',
    stepKey: 'attendanceUploadX',
  },
  {
    number: 6,
    title: 'Upload Attendance Sheet (Class XII)',
    description: 'Upload attendance sheet PDF with candidate photos for Class XII',
    fileType: 'pdf',
    stepKey: 'attendanceUploadXII',
  },
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { data: statusData, isLoading } = useOnboardingStatus();
  const startOnboarding = useStartOnboarding();
  const completeStep = useCompleteStep();
  const completeOnboarding = useCompleteOnboarding();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const session = statusData?.session;

  // Sync currentStep to the first incomplete step when session data loads
  useEffect(() => {
    if (!session?.steps) return;
    const firstIncomplete = STEPS.findIndex(
      (step) => session.steps[step.stepKey as keyof typeof session.steps]?.status !== 'completed'
    );
    // If all steps are completed, stay on the last step; otherwise go to first incomplete
    const targetStep = firstIncomplete === -1 ? STEPS.length : firstIncomplete + 1;
    setCurrentStep(targetStep);
  }, [session?.steps]);
  const isComplete = statusData?.isComplete;

  const handleStartOnboarding = useCallback(() => {
    startOnboarding.mutate('initial');
  }, [startOnboarding]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    const step = STEPS[currentStep - 1];

    if (step.fileType === 'pdf') {
      formData.append('pdf', selectedFile);
    } else {
      formData.append('txt', selectedFile);
    }

    const isLastStep = currentStep === STEPS.length;

    completeStep.mutate(
      { stepNumber: currentStep, formData },
      {
        onSuccess: () => {
          setSelectedFile(null);
          if (!isLastStep) {
            setCurrentStep(currentStep + 1);
          } else {
            // Last step uploaded — immediately complete the session
            completeOnboarding.mutate(undefined, {
              onSuccess: () => navigate('/dashboard'),
            });
          }
        },
      }
    );
  }, [currentStep, selectedFile, completeStep, completeOnboarding, navigate]);

  const handleComplete = useCallback(() => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        navigate('/dashboard');
      },
    });
  }, [completeOnboarding, navigate]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(Math.max(1, currentStep - 1));
  }, [currentStep]);

  const getStepStatus = (stepKey: string) => {
    if (!session?.steps) return 'pending';
    return session.steps[stepKey as keyof typeof session.steps]?.status || 'pending';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!statusData?.hasSession) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">Welcome to SEMS</h1>
        <p className="text-gray-600 mb-6">
          Let's get started by importing your examination data. This wizard will guide you through
          uploading candidate lists, Form 66 records, and attendance sheets.
        </p>
        <button
          onClick={handleStartOnboarding}
          disabled={startOnboarding.isPending}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {startOnboarding.isPending ? 'Starting...' : 'Start Onboarding'}
        </button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-lg shadow-lg text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Onboarding Complete!</h1>
        <p className="text-gray-600 mb-6">
          All data has been successfully imported. You can now start using SEMS.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const currentStepConfig = STEPS[currentStep - 1];
  const currentStepStatus = getStepStatus(currentStepConfig.stepKey);
  const currentStepWarnings = session?.steps[currentStepConfig.stepKey as keyof typeof session.steps]?.validationWarnings ?? [];

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6">
      <h1 className="text-3xl font-bold mb-8">Data Import Wizard</h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.stepKey);
            const isActive = currentStep === step.number;
            const isCompleted = status === 'completed';

            return (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <span className="text-xs mt-2 text-center max-w-[100px]">
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-1 w-12 mx-2 ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-2">{currentStepConfig.title}</h2>
        <p className="text-gray-600 mb-6">{currentStepConfig.description}</p>

        {/* Validation Warnings */}
        {currentStepWarnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Warnings</h3>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {currentStepWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select {currentStepConfig.fileType.toUpperCase()} File
          </label>
          <input
            type="file"
            accept={currentStepConfig.fileType === 'pdf' ? '.pdf' : '.txt'}
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleUpload}
              disabled={!selectedFile || completeStep.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {completeStep.isPending ? 'Uploading...' : 'Upload & Continue'}
            </button>
          ) : selectedFile ? (
            <button
              onClick={handleUpload}
              disabled={completeStep.isPending || completeOnboarding.isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {completeStep.isPending || completeOnboarding.isPending ? 'Processing...' : 'Upload & Complete'}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={currentStepStatus !== 'completed' || completeOnboarding.isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {completeOnboarding.isPending ? 'Completing...' : 'Complete Onboarding'}
            </button>
          )}
        </div>
      </div>

      {/* Validation Report Link */}
      {session?.validationReport && (
        <div className="mt-6 text-center">
          <Link
            to="/onboarding/validation"
            className="text-blue-600 hover:underline"
          >
            View Validation Report
          </Link>
        </div>
      )}
    </div>
  );
}
