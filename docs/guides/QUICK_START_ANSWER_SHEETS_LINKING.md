# Quick Start: Answer Sheets - Centre Datesheet Linking

## What's New?

The "Used Answer Sheets" tab now displays detailed exam information including:
- **Date**: Exam date
- **Class**: Class level (10 or 12)
- **Subject Code**: Subject code from exam
- **Subject Name**: Full subject name
- **Candidates**: Number of candidates taking the exam

## How to Use

### Step 1: Prerequisites
1. Import CBSE datesheet (Datesheets page → Import PDF)
2. Ensure candidates have subjects linked
3. Add answer sheet entries (Answer Sheets page → Upload Excel or Add manually)

### Step 2: Mark Answer Sheets as Used
1. Go to Answer Sheets page
2. In any tab (Received, Balance, Discarded), find an answer sheet entry
3. Click the **"Use"** button
4. Enter the quantity to mark as used
5. **New:** A modal appears with available exams

### Step 3: Link to Exam (Optional)
1. In the modal, select an exam from the dropdown
2. View exam details:
   - Date and day
   - Class and subject
   - Time slot
   - Number of candidates
   - Rooms needed
3. Click **"Confirm & Mark as Used"**
4. Or skip linking by selecting "-- Skip linking --" option

### Step 4: View Used Answer Sheets
1. Click on the **"Used"** tab
2. See all used answer sheets with linked exam details
3. Entries without links show "-" in detail columns

## API Endpoints

### Get Centre Datesheet Entries
```
GET /api/centre-datesheet/entries
```

Returns exams with candidate counts for linking.

### Mark Answer Sheets as Used (with linking)
```
POST /api/answersheets/:id/use
{
  "quantity": 50,
  "centreDatesheetEntryId": "...",
  "examDate": "2025-02-15",
  "subjectCode": "041",
  "subjectName": "MATHEMATICS STANDARD",
  "candidateCount": 45
}
```

## Testing

Run the test script to verify setup:
```bash
cd server
node test-centre-datesheet-linking.js
```

This will check:
- CBSE datesheet exists
- Candidates have subjects
- Centre entries are generated
- Answer sheets are ready

## Troubleshooting

### No exams appear in the dropdown
**Cause:** No centre datesheet entries with candidates

**Solution:**
1. Import CBSE datesheet
2. Link subjects to candidates
3. Refresh the Answer Sheets page

### Used tab shows "-" in detail columns
**Cause:** Answer sheets were marked as used without linking

**Solution:**
- This is normal if linking was skipped
- Future entries can be linked when marking as used

### Candidate count is 0
**Cause:** No candidates have that subject linked

**Solution:**
1. Go to Candidates page
2. Link subjects to candidates
3. Refresh Answer Sheets page

## Benefits

✅ Track which answer sheets were used for which exam
✅ See candidate counts per exam
✅ Better audit trail for answer sheet usage
✅ Link answer sheets to specific dates and subjects
✅ Calculate rooms needed per exam

## Files Changed

### Backend
- `server/src/models/AnswerSheet.js` - Added linking fields
- `server/src/controllers/answerSheetController.js` - Updated use endpoint
- `server/src/routes/centreDatesheet.js` - New route for entries
- `server/src/app.js` - Registered new route

### Frontend
- `client/src/pages/AnswerSheets.tsx` - Added columns and modal
- `client/src/services/answerSheetService.ts` - Updated interface
- `client/src/services/centreDatesheetService.ts` - New service

## Support

For detailed documentation, see:
- `ANSWER_SHEETS_CENTRE_DATESHEET_LINKING.md` - Complete feature documentation
- `ANSWER_SHEETS_USED_TAB_UPDATE.md` - Summary of changes
