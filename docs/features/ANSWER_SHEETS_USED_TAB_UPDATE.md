# Answer Sheets - Used Tab Update Summary

## What Was Done

Added new columns to the "Used Answer Sheets" tab and linked it with the centre datesheet to display exam details.

## Changes Made

### Backend Changes

1. **AnswerSheet Model** (`server/src/models/AnswerSheet.js`)
   - Added fields: `centreDatesheetEntry`, `linkedExamDate`, `linkedSubjectCode`, `linkedSubjectName`, `linkedCandidateCount`

2. **Answer Sheet Controller** (`server/src/controllers/answerSheetController.js`)
   - Updated `useAnswerSheets` to accept and save linking data

3. **New Route** (`server/src/routes/centreDatesheet.js`)
   - Created endpoint: `GET /api/centre-datesheet/entries`
   - Returns centre-specific exams with candidate counts

4. **App Configuration** (`server/src/app.js`)
   - Registered new centre datesheet route

### Frontend Changes

1. **New Service** (`client/src/services/centreDatesheetService.ts`)
   - Service to fetch centre datesheet entries

2. **Updated Service** (`client/src/services/answerSheetService.ts`)
   - Added `isTemplate` property to interface
   - Updated `useSheets()` to accept linking data

3. **Answer Sheets Page** (`client/src/pages/AnswerSheets.tsx`)
   - Added new columns to "Used" tab: Date, Class, Subject Code, Subject Name, Candidates
   - Added link modal for selecting exam when marking sheets as used
   - Fetches centre datesheet entries on mount
   - Displays linked exam details in "Used" tab

## New Columns in Used Tab

| Column | Description |
|--------|-------------|
| Sr No | Serial number |
| Date | Exam date from linked centre datesheet |
| Class | Class level (10 or 12) |
| Subject Code | Subject code from exam |
| Subject Name | Subject name from exam |
| Candidates | Number of candidates taking the exam |
| Received | Total answer sheets received |
| Used | Number of sheets used |
| Balance | Remaining sheets |
| Discarded | Discarded sheets |
| Actions | Use/Discard buttons |

## How It Works

1. When user clicks "Use" on an answer sheet:
   - Modal appears with centre datesheet entries
   - User can select an exam to link (optional)
   - Shows exam details: date, time, subject, candidates

2. In the "Used" tab:
   - Displays all used answer sheets
   - Shows linked exam details in new columns
   - Entries without links show "-"

## Files Modified

### Backend
- `server/src/models/AnswerSheet.js`
- `server/src/controllers/answerSheetController.js`
- `server/src/app.js`

### Backend (New)
- `server/src/routes/centreDatesheet.js`

### Frontend
- `client/src/pages/AnswerSheets.tsx`
- `client/src/services/answerSheetService.ts`

### Frontend (New)
- `client/src/services/centreDatesheetService.ts`

### Documentation (New)
- `ANSWER_SHEETS_CENTRE_DATESHEET_LINKING.md`
- `ANSWER_SHEETS_USED_TAB_UPDATE.md`

## Testing

To test the feature:

1. Start the server: `cd server && npm start`
2. Start the client: `cd client && npm run dev`
3. Navigate to Answer Sheets page
4. Click "Use" on any answer sheet entry
5. Select an exam from the modal
6. View the "Used" tab to see linked details

## Notes

- Linking is optional - users can skip it
- Centre datesheet must be imported first
- Candidates must have subjects linked
- Only exams with candidates are shown in the dropdown
