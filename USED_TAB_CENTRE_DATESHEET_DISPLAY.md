# Used Tab - Centre Datesheet Display

## Overview

The "Used Answer Sheets" tab now displays **all exam dates from the centre datesheet**, regardless of whether answer sheets have been marked as used or not. This provides a complete view of the exam schedule and allows tracking of answer sheet usage per exam.

## New Behavior

### Before
- Used tab showed only answer sheets that had been marked as "used"
- Empty if no answer sheets were marked as used
- No visibility into upcoming exams

### After
- Used tab shows **all exams from the centre datesheet**
- Displays exam schedule sorted by date
- Shows how many answer sheets have been used for each exam
- Always populated (as long as centre datesheet exists)

## Table Structure

### Columns in Used Tab

| Column | Description | Source |
|--------|-------------|--------|
| Sr No | Sequential number | Auto-generated |
| Date | Exam date | Centre Datesheet |
| Class | Class level (10 or 12) | Centre Datesheet |
| Subject Code | Subject code | Centre Datesheet |
| Subject Name | Full subject name | Centre Datesheet |
| Candidates | Number of candidates | Centre Datesheet (calculated) |
| Received | Not applicable | Shows "-" |
| Used | Answer sheets used | Calculated from linked answer sheets |
| Balance | Not applicable | Shows "-" |
| Discarded | Not applicable | Shows "-" |
| Actions | Mark Used button | Action button |

## How It Works

### Data Flow

```
Centre Datesheet (CBSE)
         ↓
Filter by Candidates
         ↓
Sort by Exam Date
         ↓
Display in Used Tab
         ↓
Calculate Used Sheets per Exam
```

### Calculation Logic

For each exam in the centre datesheet:
1. Find all answer sheets linked to that exam date and subject
2. Sum up the "used" quantity from those answer sheets
3. Display the total in the "Used" column

```typescript
const usedSheets = entries.filter(e => 
  e.linkedExamDate && 
  new Date(e.linkedExamDate).toDateString() === new Date(datesheetEntry.examDate).toDateString() &&
  e.linkedSubjectCode === datesheetEntry.subjectCode
)
const totalUsed = usedSheets.reduce((sum, e) => sum + e.used, 0)
```

## Example Display

### With Candidates

```
┌────┬────────────┬───────┬──────┬─────────────────┬────────────┬──────────┬──────┬─────────┬──────────┬────────────┐
│ Sr │ Date       │ Class │ Code │ Subject Name    │ Candidates │ Received │ Used │ Balance │ Discarded│ Actions    │
├────┼────────────┼───────┼──────┼─────────────────┼────────────┼──────────┼──────┼─────────┼──────────┼────────────┤
│ 1  │ 17/2/2026  │ 10    │ 041  │ MATHEMATICS     │ 45         │ -        │ 50   │ -       │ -        │ Mark Used  │
│ 2  │ 18/2/2026  │ 12    │ 042  │ PHYSICS         │ 38         │ -        │ 0    │ -       │ -        │ Mark Used  │
│ 3  │ 19/2/2026  │ 10    │ 086  │ SCIENCE         │ 42         │ -        │ 45   │ -       │ -        │ Mark Used  │
└────┴────────────┴───────┴──────┴─────────────────┴────────────┴──────────┴──────┴─────────┴──────────┴────────────┘
```

### Without Candidates

```
┌─────────────────────────────────────────────────────────────────┐
│  No exam schedule found. Please ensure:                         │
│  • CBSE datesheet is imported                                   │
│  • Candidates have subjects linked                              │
└─────────────────────────────────────────────────────────────────┘
```

## Benefits

### 1. Complete Exam Schedule Visibility
- See all upcoming exams at a glance
- Know which exams need answer sheets
- Plan answer sheet distribution in advance

### 2. Usage Tracking
- Track how many sheets have been used per exam
- Identify exams that still need answer sheets
- Monitor answer sheet consumption

### 3. Date-Based Organization
- Exams sorted chronologically
- Easy to find exams by date
- Clear timeline of examinations

### 4. Candidate Information
- See how many candidates are taking each exam
- Plan answer sheet quantities accordingly
- Calculate rooms needed (shown in link modal)

## User Workflow

### Viewing Exam Schedule

1. Go to Answer Sheets page
2. Click on **"Used"** tab
3. See complete list of exams from centre datesheet
4. Exams are sorted by date (earliest first)

### Marking Answer Sheets as Used

1. In the Used tab, find the exam
2. Click **"Mark Used"** button
3. Modal appears with:
   - Exam details (date, subject, candidates)
   - Available answer sheets to select
4. Select answer sheet type
5. Enter quantity
6. Confirm
7. Used column updates with the quantity

### Tracking Usage

1. Check the "Used" column for each exam
2. "0" means no answer sheets marked as used yet
3. Number shows total sheets used for that exam
4. Multiple answer sheet types can be used for one exam

## Technical Implementation

### Frontend Changes

**File**: `client/src/pages/AnswerSheets.tsx`

#### New Function
```typescript
const getUsedTabEntries = () => {
  if (activeTab !== 'used') return []
  
  // Return centre datesheet entries sorted by date
  return centreDatesheetEntries.sort((a, b) => 
    new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  )
}
```

#### Modified Rendering
- Used tab now renders `centreDatesheetEntries` instead of filtered answer sheets
- Calculates used sheets per exam dynamically
- Shows "-" for non-applicable columns (Received, Balance, Discarded)

### Data Sources

1. **Centre Datesheet Entries**: Fetched from `/api/centre-datesheet/entries`
   - Contains exam dates, subjects, candidates
   - Filtered to only show exams with candidates
   - Sorted by date

2. **Answer Sheets**: Fetched from `/api/answersheets`
   - Contains answer sheet inventory
   - Includes linking information (linkedExamDate, linkedSubjectCode)
   - Used to calculate usage per exam

## Empty State Handling

### No Centre Datesheet
```
No exam schedule found. Please ensure:
• CBSE datesheet is imported
• Candidates have subjects linked
```

**Action**: 
1. Import CBSE datesheet from Datesheets page
2. Add candidates and link subjects

### No Candidates
Same as above - centre datesheet is filtered to only show exams with candidates.

## Comparison: Old vs New

### Old Behavior
```
Used Tab:
- Shows: Answer sheets marked as used
- Empty: If no sheets marked as used
- Focus: Answer sheet inventory
- Sorting: By answer sheet type
```

### New Behavior
```
Used Tab:
- Shows: All exams from centre datesheet
- Empty: Only if no centre datesheet or no candidates
- Focus: Exam schedule and usage tracking
- Sorting: By exam date (chronological)
```

## Use Cases

### 1. Exam Planning
**Scenario**: Planning answer sheet distribution for upcoming exams

**Workflow**:
1. Open Used tab
2. See all upcoming exams with dates
3. Check candidate counts
4. Plan which answer sheets to use

### 2. Usage Monitoring
**Scenario**: Tracking answer sheet consumption during exams

**Workflow**:
1. Open Used tab
2. Check "Used" column for each exam
3. Identify exams that need sheets marked
4. Mark sheets as used after distribution

### 3. Audit Trail
**Scenario**: Reviewing answer sheet usage after exams

**Workflow**:
1. Open Used tab
2. See complete exam schedule
3. Review usage per exam
4. Verify all exams have sheets marked

## Future Enhancements

### Potential Features
1. **Edit Usage**: Allow editing used quantity per exam
2. **Multiple Sheet Types**: Show breakdown by answer sheet type
3. **Status Indicators**: Visual indicators for exams with/without sheets
4. **Export**: Export exam schedule with usage data
5. **Filters**: Filter by class, date range, or subject
6. **Search**: Search for specific exams or subjects

## Summary

The Used tab now provides a **complete exam schedule view** with answer sheet usage tracking. This change:

✅ Shows all exams from centre datesheet
✅ Displays exams sorted by date
✅ Tracks answer sheet usage per exam
✅ Provides better visibility and planning
✅ Maintains backward compatibility (existing linked sheets still work)

The tab is no longer just for viewing "used" answer sheets - it's now a comprehensive exam schedule and usage tracking tool.
