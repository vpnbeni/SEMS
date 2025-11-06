# Answer Sheets - Centre Datesheet Linking Feature

## Overview
This feature allows linking used answer sheets to specific exams from the centre datesheet, enabling better tracking of answer sheet usage per subject, exam date, and candidate count.

## Features Added

### 1. Database Schema Updates
**File: `server/src/models/AnswerSheet.js`**

Added new fields to the AnswerSheet model:
- `centreDatesheetEntry`: Reference to CBSEDatesheet entry
- `linkedExamDate`: Cached exam date for quick access
- `linkedSubjectCode`: Subject code from the exam
- `linkedSubjectName`: Subject name from the exam
- `linkedCandidateCount`: Number of candidates taking the exam

### 2. Backend API

#### New Route: Centre Datesheet Entries
**File: `server/src/routes/centreDatesheet.js`**

**Endpoint:** `GET /api/centre-datesheet/entries`

Returns centre-specific datesheet entries with candidate counts:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "examDate": "2025-02-15",
      "dayName": "SATURDAY",
      "subjectCode": "041",
      "subjectName": "MATHEMATICS STANDARD",
      "class": "10",
      "timeSlot": {
        "start": "10:30 AM",
        "end": "01:30 PM"
      },
      "duration": 180,
      "candidateCount": 45,
      "roomsNeeded": 2
    }
  ],
  "count": 15
}
```

#### Updated Endpoint: Use Answer Sheets
**File: `server/src/controllers/answerSheetController.js`**

**Endpoint:** `POST /api/answersheets/:id/use`

Now accepts optional linking data:
```json
{
  "quantity": 50,
  "centreDatesheetEntryId": "...",
  "examDate": "2025-02-15",
  "subjectCode": "041",
  "subjectName": "MATHEMATICS STANDARD",
  "candidateCount": 45
}
```

### 3. Frontend Updates

#### Service Layer
**File: `client/src/services/centreDatesheetService.ts`**

New service to fetch centre datesheet entries for linking.

**File: `client/src/services/answerSheetService.ts`**

Updated `useSheets()` method to accept optional linking data.

#### UI Updates
**File: `client/src/pages/AnswerSheets.tsx`**

1. **Used Answer Sheets Tab - New Columns:**
   - Sr No
   - Date (from linked exam)
   - Class
   - Subject Code
   - Subject Name
   - Candidates (count)
   - Received
   - Used
   - Balance
   - Discarded
   - Actions

2. **Link Modal:**
   When marking answer sheets as "used", a modal appears allowing users to:
   - Select an exam from the centre datesheet
   - View exam details (date, time, subject, candidates)
   - Skip linking if desired (mark as used without exam details)

## User Workflow

### Marking Answer Sheets as Used

1. Navigate to Answer Sheets page
2. Click on "Used" tab to view used answer sheets
3. In any other tab (Received, Balance, Discarded), click "Use" button
4. Enter quantity to mark as used
5. **New:** Link modal appears with centre datesheet entries
6. Select an exam from the dropdown (optional)
7. View exam details in the confirmation panel
8. Click "Confirm & Mark as Used"

### Viewing Used Answer Sheets

1. Click on "Used" tab
2. View answer sheets with linked exam details:
   - Date of exam
   - Class
   - Subject code and name
   - Number of candidates
3. Entries without linked exams show "-" in the detail columns

## Benefits

1. **Better Tracking:** Know exactly which answer sheets were used for which exam
2. **Candidate Count:** See how many candidates took each exam
3. **Date Tracking:** Track answer sheet usage by exam date
4. **Subject Mapping:** Link answer sheets to specific subjects
5. **Audit Trail:** Complete history of answer sheet usage per exam

## Technical Details

### Data Flow

1. User clicks "Use" on an answer sheet entry
2. Frontend fetches centre datesheet entries (if not already loaded)
3. Modal displays available exams with candidate counts
4. User selects an exam (optional)
5. Frontend sends use request with linking data
6. Backend updates answer sheet with linked details
7. Used tab displays the linked information

### Database Relationships

```
AnswerSheet
  ├── centreDatesheetEntry (ref: CBSEDatesheet._id)
  ├── linkedExamDate (cached)
  ├── linkedSubjectCode (cached)
  ├── linkedSubjectName (cached)
  └── linkedCandidateCount (cached)
```

Caching exam details in the AnswerSheet document improves query performance and ensures data consistency even if the datesheet is updated later.

## Future Enhancements

1. **Bulk Linking:** Link multiple answer sheet entries to exams at once
2. **Auto-Linking:** Automatically suggest exams based on answer sheet class and date
3. **Reports:** Generate reports showing answer sheet usage per exam
4. **Validation:** Warn if answer sheet quantity doesn't match candidate count
5. **Edit Linking:** Allow editing the linked exam after marking as used

## Testing

### Manual Testing Steps

1. **Setup:**
   - Import CBSE datesheet
   - Ensure candidates have subjects linked
   - Add answer sheet entries

2. **Test Linking:**
   - Mark answer sheets as used
   - Select different exams from the dropdown
   - Verify details are saved correctly

3. **Test Display:**
   - View "Used" tab
   - Verify all columns display correctly
   - Check date formatting and candidate counts

4. **Test Optional Linking:**
   - Mark answer sheets as used without selecting an exam
   - Verify they still appear in "Used" tab with "-" in detail columns

## Notes

- Linking is optional - users can skip it and still mark answer sheets as used
- Centre datesheet entries are filtered to only show exams with candidates
- Candidate counts are calculated from linked candidate-subject relationships
- Rooms needed are calculated as: `Math.ceil(candidateCount / 24)`
