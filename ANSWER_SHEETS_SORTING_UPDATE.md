# Answer Sheets Sorting Update ✅

## Changes Made

Added default sorting to match the PDF template order for answer sheets.

## What Changed

### 1. Database Model
- **Added field**: `sortOrder` (Number, default: 999)
- **Added index**: `sortOrder` for efficient sorting
- New entries without sortOrder will appear at the end (999)

### 2. Seeder Script
- Updated `server/seed-answer-sheets.js`
- Each answer sheet type now has a `sortOrder` field (1-11)
- Order matches the PDF template exactly

### 3. Controller
- Updated `server/src/controllers/answerSheetController.js`
- Default sort changed from `receivedDate: -1` to `sortOrder: 1, receivedDate: -1`
- Primary sort: by sortOrder (ascending)
- Secondary sort: by receivedDate (descending)

### 4. TypeScript Interface
- Updated `client/src/services/answerSheetService.ts`
- Added `sortOrder?: number` to `AnswerSheetEntry` interface

## Sort Order Mapping

| Sort Order | Answer Sheet Type |
|------------|-------------------|
| 1 | Main 32 Pages Red (Class 10) |
| 2 | Main 32 Pages Blue (Class 12) |
| 3 | Main 20 Pages Red (Class 10) |
| 4 | Main 20 Pages Blue (Class 12) |
| 5 | Graph 40 Pages Red (Class 10) |
| 6 | Graph 40 Pages Blue (Class 12) |
| 7 | Supplementary 16 Pages Yellow (Class 10) |
| 8 | Supplementary 16 Pages Pink (Class 12) |
| 9 | For Blind 32 Pages Red (Class 10) |
| 10 | For Blind 32 Pages Blue (Class 12) |
| 11 | Drawing Sheets 21 Pages White (Class 12) |

## Testing

Run the sorting test to verify:

```bash
node server/test-answer-sheets-sorting.js
```

Expected output:
- All 11 answer sheets listed in PDF order
- Sort order numbers 1-11 displayed correctly
- Matches the PDF template sequence

## Benefits

1. **Consistent Display**: Answer sheets always appear in the same order as the PDF
2. **Easy Reference**: Users can quickly find answer sheets matching the PDF template
3. **Flexible**: New entries can be added with custom sort orders
4. **Backward Compatible**: Existing entries without sortOrder appear at the end

## Migration

If you have existing data:

1. **Option 1**: Re-run the seeder (clears and re-adds all data)
   ```bash
   node server/seed-answer-sheets.js
   ```

2. **Option 2**: Update existing records manually
   ```javascript
   // Example: Update a specific record
   await AnswerSheet.findByIdAndUpdate(id, { sortOrder: 1 })
   ```

## Files Modified

- `server/src/models/AnswerSheet.js` - Added sortOrder field and index
- `server/src/controllers/answerSheetController.js` - Updated default sort
- `server/seed-answer-sheets.js` - Added sortOrder to all entries
- `client/src/services/answerSheetService.ts` - Updated TypeScript interface
- `ANSWER_SHEETS_FEATURE.md` - Updated documentation
- `ANSWER_SHEETS_SEEDED.md` - Updated inventory table

## Files Created

- `server/test-answer-sheets-sorting.js` - Test script for sorting verification
- `ANSWER_SHEETS_SORTING_UPDATE.md` - This document

## Result

✅ Answer sheets now display in the exact same order as the PDF template
✅ Sorting is consistent across all views (Received, Used, Balance, Discarded)
✅ New entries can specify custom sort order or default to end of list
✅ All tests passing
