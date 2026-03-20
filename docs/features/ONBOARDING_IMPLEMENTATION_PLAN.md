# Onboarding Functionality Implementation Plan

## Overview
Create a unified onboarding workflow that guides users through the three critical data import steps in sequence: Candidate Import → Form 66 Upload → Attendance Sheet Upload. This ensures data integrity and proper cross-validation between systems.

## Current System Analysis

### 1. Candidate Import System
- **Entry**: `/client/src/pages/Candidates.tsx` with ImportModal
- **Backend**: `POST /candidates/import`
- **Parser**: `/server/src/utils/candidatePdfParser.js`
- **Features**: PDF parsing, duplicate detection, auto-subject creation, Cloudinary archival
- **Output**: Candidate records with roll numbers, subjects, and metadata

### 2. Form 66 System
- **Entry**: `/client/src/pages/Form66.tsx`
- **Backend**: `POST /api/form66/upload`
- **Parser**: `/server/src/utils/form66Parser.js`
- **Features**: TXT parsing, class detection, date/subject extraction, PDF conversion
- **Output**: Attendance records by roll number, exam date, and subject
- **Note**: Currently operates independently with NO validation against candidates

### 3. Attendance Sheet System
- **Entry**: `/client/src/pages/Attendance.tsx`
- **Backend**: `POST /attendance/upload`
- **Parser**: `/server/src/utils/attendanceSheetParser.js`
- **Features**: PDF parsing, photo extraction, roll number matching, candidate photo updates
- **Output**: Absentee records with room/sheet cross-references

## Implementation Strategy

### Phase 1: Onboarding UI Component

**New File**: `/client/src/pages/Onboarding.tsx`

**Features**:
- Stepper component showing 3 steps with progress tracking
- Step 1: Candidate Import (required)
- Step 2: Form 66 Upload (optional but recommended)
- Step 3: Attendance Sheet Upload (optional)
- Each step shows validation status and allows re-upload
- Summary view showing imported counts and any mismatches

**Navigation**:
- Add route: `/onboarding`
- Add menu item in main navigation
- Redirect new users to onboarding on first login

### Phase 2: Backend Validation Enhancements

#### 2.1 Form 66 Validation Against Candidates

**New Endpoint**: `POST /api/form66/upload-with-validation`

**Validation Logic**:
1. Parse Form 66 records as usual
2. Query candidates by roll numbers from parsed records
3. Identify mismatches:
   - Roll numbers in Form 66 but not in candidates DB
   - Subject codes in Form 66 not matching candidate's enrolled subjects
   - Class mismatches
4. Return validation report with warnings/errors
5. Allow user to proceed with warnings or fix issues

**New File**: `/server/src/utils/form66Validator.js`
```javascript
// Functions:
// - validateForm66AgainstCandidates(form66Records, candidates)
// - detectRollNumberMismatches(form66Records, candidates)
// - detectSubjectMismatches(form66Records, candidates)
// - generateValidationReport(mismatches)
```

#### 2.2 Attendance Sheet Validation Enhancement

**Modify**: `/server/src/controllers/attendanceController.js`

**Enhanced Validation**:
1. Current: Matches photos to candidates by roll number
2. Add: Validate roll numbers exist in candidates DB before processing
3. Add: Check if candidates have the subjects they're marked absent for
4. Add: Cross-reference with Form 66 data if available
5. Return detailed validation report

### Phase 3: Cross-System Verification

**New File**: `/server/src/utils/onboardingValidator.js`

**Functions**:
- `validateCandidateCompleteness()` - Check required fields populated
- `crossValidateForm66()` - Verify Form 66 roll numbers against candidates
- `crossValidateAttendance()` - Verify attendance records against candidates and Form 66
- `generateOnboardingReport()` - Comprehensive validation summary

**Validation Rules**:
1. All roll numbers in Form 66 must exist in candidates
2. All subjects in Form 66 must match candidate enrollments
3. All roll numbers in attendance must exist in candidates
4. Attendance dates should align with Form 66 exam dates
5. Subject codes should be consistent across all three systems

### Phase 4: Onboarding Service Layer

**New File**: `/client/src/services/onboardingService.ts`

**API Methods**:
- `getOnboardingStatus()` - Check completion status of each step
- `validateStep(stepNumber, data)` - Pre-validate before upload
- `completeStep(stepNumber, data)` - Upload and mark step complete
- `getValidationReport()` - Fetch cross-system validation results

**New File**: `/client/src/hooks/useOnboarding.ts`

**React Query Hooks**:
- `useOnboardingStatus()` - Track progress
- `useStepValidation()` - Real-time validation
- `useStepCompletion()` - Handle uploads
- `useValidationReport()` - Display mismatches

### Phase 5: Database Schema Updates

**New Model**: `/server/src/models/OnboardingSession.js`

```javascript
{
  userId: ObjectId,
  sessionType: 'initial' | 'reimport',
  steps: {
    candidateImport: {
      status: 'pending' | 'completed' | 'skipped',
      completedAt: Date,
      recordCount: Number,
      fileUrl: String
    },
    form66Upload: {
      status: 'pending' | 'completed' | 'skipped',
      completedAt: Date,
      recordCount: Number,
      fileUrl: String,
      validationWarnings: [String]
    },
    attendanceUpload: {
      status: 'pending' | 'completed' | 'skipped',
      completedAt: Date,
      recordCount: Number,
      fileUrl: String,
      validationWarnings: [String]
    }
  },
  validationReport: {
    candidateCount: Number,
    form66Mismatches: [Object],
    attendanceMismatches: [Object],
    overallStatus: 'valid' | 'warnings' | 'errors'
  },
  completedAt: Date,
  createdAt: Date
}
```

### Phase 6: API Routes

**New File**: `/server/src/routes/onboardingRoutes.js`

**Endpoints**:
- `GET /api/onboarding/status` - Get current onboarding session status
- `POST /api/onboarding/start` - Initialize new onboarding session
- `POST /api/onboarding/step/:stepNumber/validate` - Pre-validate step data
- `POST /api/onboarding/step/:stepNumber/complete` - Complete step with upload
- `GET /api/onboarding/validation-report` - Get comprehensive validation report
- `POST /api/onboarding/complete` - Mark onboarding as complete
- `GET /api/onboarding/history` - Get past onboarding sessions

**New File**: `/server/src/controllers/onboardingController.js`

**Controller Functions**:
- `getOnboardingStatus()`
- `startOnboarding()`
- `validateStep()`
- `completeStep()`
- `getValidationReport()`
- `completeOnboarding()`
- `getOnboardingHistory()`

## Implementation Order

### Week 1: Backend Foundation
1. Create `OnboardingSession` model
2. Create `onboardingValidator.js` utility
3. Create `form66Validator.js` utility
4. Add validation endpoints to existing controllers
5. Create `onboardingController.js` and routes

### Week 2: Enhanced Validation
1. Modify Form 66 upload to validate against candidates
2. Enhance attendance upload validation
3. Implement cross-system verification logic
4. Add comprehensive error reporting

### Week 3: Frontend Components
1. Create `Onboarding.tsx` page with stepper
2. Create step components for each import type
3. Create validation report display components
4. Implement `onboardingService.ts` and hooks

### Week 4: Integration & Testing
1. Wire up frontend to backend APIs
2. Add navigation and routing
3. Test complete onboarding flow
4. Test validation and error scenarios
5. Add user documentation

## Key Design Decisions

### 1. Non-Blocking Validation
- Form 66 and Attendance uploads show warnings but don't block
- Users can proceed with mismatches and fix later
- Critical errors (e.g., invalid file format) still block

### 2. Flexible Workflow
- Steps can be completed in order or skipped
- Users can return to previous steps to re-upload
- Onboarding can be restarted for data refresh

### 3. Validation Levels
- **Error**: Blocks completion (e.g., invalid file format)
- **Warning**: Allows completion but flags issue (e.g., roll number mismatch)
- **Info**: Informational only (e.g., "X candidates imported")

### 4. Data Consistency
- Form 66 validation checks roll numbers exist in candidates
- Attendance validation checks roll numbers and subjects
- Cross-validation report highlights all discrepancies

## Files to Create

### Backend
- `/server/src/models/OnboardingSession.js`
- `/server/src/controllers/onboardingController.js`
- `/server/src/routes/onboardingRoutes.js`
- `/server/src/utils/onboardingValidator.js`
- `/server/src/utils/form66Validator.js`

### Frontend
- `/client/src/pages/Onboarding.tsx`
- `/client/src/components/onboarding/StepperComponent.tsx`
- `/client/src/components/onboarding/CandidateImportStep.tsx`
- `/client/src/components/onboarding/Form66UploadStep.tsx`
- `/client/src/components/onboarding/AttendanceUploadStep.tsx`
- `/client/src/components/onboarding/ValidationReport.tsx`
- `/client/src/services/onboardingService.ts`
- `/client/src/hooks/useOnboarding.ts`

### Documentation
- `/docs/features/ONBOARDING_USER_GUIDE.md`
- `/docs/features/ONBOARDING_API.md`

## Files to Modify

### Backend
- `/server/src/controllers/form66Controller.js` - Add validation logic
- `/server/src/controllers/attendanceController.js` - Enhance validation
- `/server/src/index.js` - Register onboarding routes

### Frontend
- `/client/src/App.tsx` - Add onboarding route
- `/client/src/components/Layout.tsx` - Add onboarding menu item
- `/client/src/pages/Candidates.tsx` - Add link to onboarding
- `/client/src/pages/Form66.tsx` - Add link to onboarding
- `/client/src/pages/Attendance.tsx` - Add link to onboarding

## Success Metrics

1. **Data Integrity**: Zero undetected mismatches between systems
2. **User Experience**: Complete onboarding in < 10 minutes
3. **Error Reduction**: 90% reduction in data entry errors
4. **Adoption**: 100% of new users complete onboarding
5. **Validation Coverage**: All cross-system validations implemented

## Future Enhancements

1. **Bulk Edit**: Allow fixing mismatches in bulk from validation report
2. **Auto-Matching**: Fuzzy matching for near-miss roll numbers
3. **Import Templates**: Downloadable templates for each file type
4. **Progress Persistence**: Save partial progress and resume later
5. **Audit Trail**: Track all changes made during onboarding
6. **Notifications**: Email/SMS alerts for validation issues
7. **Scheduled Imports**: Automated imports from external systems
8. **Data Preview**: Show sample data before committing import

## Risk Mitigation

1. **Data Loss**: All uploads archived to Cloudinary before processing
2. **Partial Failures**: Bulk operations use `ordered: false` to continue on errors
3. **Performance**: Large file uploads processed asynchronously with progress tracking
4. **Rollback**: Onboarding sessions tracked separately, can be reverted
5. **Validation Errors**: Comprehensive error messages with actionable guidance

## Technical Considerations

1. **File Size Limits**: Support PDFs up to 50MB, TXT up to 10MB
2. **Concurrent Uploads**: Queue system for multiple simultaneous uploads
3. **Database Transactions**: Use transactions for multi-step operations
4. **Caching**: Cache validation results to avoid repeated queries
5. **Rate Limiting**: Prevent abuse of upload endpoints
6. **Error Logging**: Detailed logging for debugging validation issues

## Dependencies

- Existing: `pdf-parse`, `pdf-lib`, `cloudinary`, `mongoose`
- New: `react-stepper` or similar UI component library
- Optional: `bull` for job queue if async processing needed

## Estimated Effort

- Backend: 3-4 weeks
- Frontend: 2-3 weeks
- Testing: 1-2 weeks
- Documentation: 1 week
- **Total**: 7-10 weeks for complete implementation

## Next Steps

1. Review and approve this plan
2. Create detailed technical specifications for each component
3. Set up project tracking (tasks, milestones)
4. Begin Week 1 implementation
5. Schedule regular check-ins for progress review
