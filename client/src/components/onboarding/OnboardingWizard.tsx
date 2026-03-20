import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStatus, useStartOnboarding, useCompleteStep, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { CheckCircle, AlertCircle, Clock, FileText, XCircle } from 'lucide-react';
import Dialog from '@/components/common/Dialog/Dialog';
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
  const [isReportOpen, setIsReportOpen] = useState(false);

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

        {/* Slow-step warning for steps 5 & 6 */}
        {(currentStep === 5 || currentStep === 6) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">This step takes longer than usual</p>
                <p className="text-sm text-amber-700 mt-1">
                  Attendance sheets contain candidate photos and require extra processing time.
                  Please <strong>do not close or refresh this tab</strong> until the upload completes.
                </p>
              </div>
            </div>
          </div>
        )}

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
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 text-gray-500 hover:text-gray-700 text-sm underline underline-offset-2"
            >
              Finish later
            </button>
          </div>

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

      {/* Validation Report Button */}
      {session?.validationReport && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsReportOpen(true)}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline text-sm"
          >
            <FileText className="w-4 h-4" />
            View Validation Report
          </button>
        </div>
      )}

      {/* Validation Report Dialog */}
      <Dialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Validation Report"
        size="lg"
        variant={
          session?.validationReport?.overallStatus === 'errors'
            ? 'error'
            : session?.validationReport?.overallStatus === 'warnings'
            ? 'warning'
            : 'success'
        }
        icon={
          session?.validationReport?.overallStatus === 'errors' ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : session?.validationReport?.overallStatus === 'warnings' ? (
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )
        }
      >
        {session?.validationReport && (
          <div className="space-y-5">
            {/* Overall status badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
              ${session.validationReport.overallStatus === 'errors'
                ? 'bg-red-100 text-red-700'
                : session.validationReport.overallStatus === 'warnings'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
              }`}
            >
              {session.validationReport.overallStatus === 'valid' ? 'All data looks good' : `Status: ${session.validationReport.overallStatus}`}
            </div>

            {/* Candidate counts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Class X Candidates</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {session.validationReport.candidateCountX ?? '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Class XII Candidates</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {session.validationReport.candidateCountXII ?? '—'}
                </p>
              </div>
            </div>

            {/* Form 66 mismatches */}
            {(session.validationReport.form66MismatchesX?.length ?? 0) > 0 && (
              <MismatchSection
                title="Form 66 Mismatches — Class X"
                items={session.validationReport.form66MismatchesX!}
              />
            )}
            {(session.validationReport.form66MismatchesXII?.length ?? 0) > 0 && (
              <MismatchSection
                title="Form 66 Mismatches — Class XII"
                items={session.validationReport.form66MismatchesXII!}
              />
            )}

            {/* Attendance mismatches */}
            {(session.validationReport.attendanceMismatchesX?.length ?? 0) > 0 && (
              <MismatchSection
                title="Attendance Mismatches — Class X"
                items={session.validationReport.attendanceMismatchesX!}
              />
            )}
            {(session.validationReport.attendanceMismatchesXII?.length ?? 0) > 0 && (
              <MismatchSection
                title="Attendance Mismatches — Class XII"
                items={session.validationReport.attendanceMismatchesXII!}
              />
            )}

            {session.validationReport.overallStatus === 'valid' &&
              !session.validationReport.form66MismatchesX?.length &&
              !session.validationReport.form66MismatchesXII?.length &&
              !session.validationReport.attendanceMismatchesX?.length &&
              !session.validationReport.attendanceMismatchesXII?.length && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No mismatches found. All imported data is consistent.
                </p>
              )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function MismatchSection({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
        <AlertCircle className="w-4 h-4 text-yellow-500" />
        {title}
        <span className="ml-1 text-xs font-normal text-gray-500">({items.length})</span>
      </h4>
      <div className="max-h-48 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-xs">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {typeof item === 'object' ? (
                  Object.entries(item).map(([k, v]) => (
                    <td key={k} className="px-3 py-1.5 text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-gray-500 dark:text-gray-400">{k}:</span>{' '}
                      {String(v)}
                    </td>
                  ))
                ) : (
                  <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{String(item)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
