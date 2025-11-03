# Class Detection Update

## Issue
The PDF clearly shows "SECONDARY SCHOOL EXAMINATION 2025" which indicates 10th class students, but the class field was showing as blank in the candidate details.

## Root Cause
The database currently has no candidates (0 candidates found). The candidates need to be imported from the PDF.

## Solution Implemented

### 1. Improved Pattern Matching Logic
Updated the class detection logic in both `candidateController.js` and `test-pdf-parsing.js` to properly distinguish between:
- **SECONDARY SCHOOL EXAMINATION** → 10th class
- **SENIOR SECONDARY SCHOOL EXAMINATION** → 12th class

The logic now checks for "SENIOR" keyword first to avoid false matches:
```javascript
if (examType.includes('SENIOR') && examType.includes('SECONDARY')) {
  currentClass = '12th';
} else if (examType.includes('SECONDARY') && !examType.includes('SENIOR')) {
  currentClass = '10th';
}
```

### 2. Enhanced Logging
Added detailed logging to track when class information is detected:
```javascript
console.log('Found class:', currentClass, 'from line:', line);
```

### 3. Migration Script
Created `server/update-candidate-class.js` to update existing candidates if needed. However, since the database is currently empty, you need to:

## Next Steps

### Re-import the PDF
1. Go to the Candidates page at `http://localhost:5173/candidates`
2. Click "Import PDF" or drag and drop the PDF file
3. The system will now correctly detect and set the class based on the examination type:
   - "SECONDARY SCHOOL EXAMINATION" → 10th class (green badge)
   - "SENIOR SEC SCH CERT EXAMINATION" → 12th class (purple badge)

### Verify the Import
After importing, you should see:
- Class column showing "10th" (green badge) or "12th" (purple badge)
- School codes and names properly displayed
- All subject codes correctly parsed

### Update Existing Candidates (if needed)
If you have already imported candidates and need to update their class:
```bash
cd server
node update-candidate-class.js
```

This script will:
- Check all candidates in the database
- Update their class based on the PDF filename or default to 12th
- Show progress and results

## Testing

To test the PDF parsing before importing:
```bash
cd server
node test-pdf-parsing.js
```

This will show you:
- Detected class level
- School names
- Candidate details
- Subject codes

## Expected Output

When you import the "SECONDARY SCHOOL EXAMINATION 2025" PDF, all candidates will have:
- `class: "10th"` 
- Green badge in the Class column
- School name from the CENTRE/SCHOOL header
- All other details (roll number, name, parents, subjects, etc.)

## Files Modified

1. `server/src/models/Candidate.js` - Added class field
2. `server/src/controllers/candidateController.js` - Improved class detection
3. `server/test-pdf-parsing.js` - Updated test script
4. `client/src/components/candidates/CandidateTable.tsx` - Added Class column
5. `client/src/pages/Candidates.tsx` - Updated interface
6. `server/update-candidate-class.js` - Migration script (for future use)
