# Answer Sheet Type Column Added to Used Tab

## Overview

Added a new "Answer Sheet Type" column to the Used Answer Sheets tab that displays which type of answer sheet should be used for each subject, based on the subject module configuration.

## Changes Made

### Backend Changes

**File**: `server/src/routes/centreDatesheet.js`

- Fetches all subjects from the Subject model
- Creates a map of subject code+class to answer sheet type
- Includes `answerSheetType` in the response for each centre datesheet entry
- Cross-references subject code, name, and class combination to ensure accuracy

```javascript
// Get all subjects to fetch answer sheet types
const Subject = require('../models/Subject')
const subjects = await Subject.find({ isActive: true }).lean()

// Create a map of subject code+class to answer sheet type
const subjectAnswerSheetMap = new Map()
subjects.forEach(subject => {
  const key = `${subject.code}-${subject.class}`
  subjectAnswerSheetMap.set(key, subject.answerSheet || 'none')
})

// Include answer sheet type in response
const answerSheetType = subjectAnswerSheetMap.get(key) || 'none'
```

### Frontend Changes

**File**: `client/src/services/centreDatesheetService.ts`

- Updated `CentreDatesheetEntry` interface to include `answerSheetType: string`

**File**: `client/src/pages/AnswerSheets.tsx`

1. **Added Column Header**:
   - New "Answer Sheet Type" column after "Subject Name"

2. **Added Format Function**:
   ```typescript
   const formatAnswerSheetType = (type: string) => {
     const typeMap: Record<string, string> = {
       '32_pages': 'Main (32 Pages)',
       '20_pages': 'Main (20 Pages)',
       '40_graph': 'Graph (40 Pages)',
       'none': 'Not Specified'
     }
     return typeMap[type] || type
   }
   ```

3. **Added Column Display**:
   - Shows formatted answer sheet type with color-coded badges
   - Blue badge for 32 pages
   - Green badge for 20 pages
   - Purple badge for 40 pages (Graph)
   - Gray badge for not specified

## Table Structure

### Updated Used Tab Columns

| Column | Description | Source |
|--------|-------------|--------|
| Sr No | Sequential number | Auto-generated |
| Date | Exam date | Centre Datesheet |
| Class | Class level (10 or 12) | Centre Datesheet |
| Subject Code | Subject code | Centre Datesheet |
| Subject Name | Full subject name | Centre Datesheet |
| **Answer Sheet Type** | **Type of answer sheet to use** | **Subject Module** |
| Candidates | Number of candidates | Centre Datesheet (calculated) |
| Received | Not applicable | Shows "-" |
| Used | Answer sheets used | Calculated from linked answer sheets |
| Balance | Not applicable | Shows "-" |
| Discarded | Not applicable | Shows "-" |
| Actions | Mark Used button | Action button |

## Answer Sheet Types

### From Subject Module

The Subject model stores answer sheet types in the `answerSheet` field:

```javascript
answerSheet: {
  type: String,
  enum: ['none', '32_pages', '20_pages', '40_graph'],
  default: 'none'
}
```

### Display Mapping

| Database Value | Display Text | Badge Color |
|----------------|--------------|-------------|
| `32_pages` | Main (32 Pages) | Blue |
| `20_pages` | Main (20 Pages) | Green |
| `40_graph` | Graph (40 Pages) | Purple |
| `none` | Not Specified | Gray |

## Cross-Reference Logic

The system ensures accuracy by matching:
1. **Subject Code**: Must match exactly
2. **Class**: Must match exactly (10 or 12)
3. **Subject Name**: Verified through the same code+class combination

```typescript
// Backend matching
const key = `${subject.code}-${subject.class}`
const answerSheetType = subjectAnswerSheetMap.get(key) || 'none'

// This ensures:
// - Code 041 + Class 10 = Mathematics Standard (32 pages)
// - Code 241 + Class 10 = Mathematics Basic (32 pages)
// - Code 042 + Class 12 = Physics (32 pages)
// - Code 048 + Class 12 = Physical Education (20 pages)
```

## Example Display

```
┌────┬────────────┬───────┬──────┬─────────────────┬──────────────────┬────────────┬──────┬─────────┬──────────┬────────────┐
│ Sr │ Date       │ Class │ Code │ Subject Name    │ Answer Sheet Type│ Candidates │ Used │ Balance │ Discarded│ Actions    │
├────┼────────────┼───────┼──────┼─────────────────┼──────────────────┼────────────┼──────┼─────────┼──────────┼────────────┤
│ 1  │ 17/2/2026  │ 10    │ 041  │ MATHEMATICS STD │ Main (32 Pages)  │ 268        │ 0    │ -       │ -        │ Mark Used  │
│ 2  │ 17/2/2026  │ 10    │ 241  │ MATHEMATICS BSC │ Main (32 Pages)  │ 47         │ 0    │ -       │ -        │ Mark Used  │
│ 3  │ 18/2/2026  │ 12    │ 048  │ PHYSICAL EDUC   │ Main (20 Pages)  │ 95         │ 0    │ -       │ -        │ Mark Used  │
│ 4  │ 20/2/2026  │ 12    │ 042  │ PHYSICS         │ Main (32 Pages)  │ 98         │ 0    │ -       │ -        │ Mark Used  │
└────┴────────────┴───────┴──────┴─────────────────┴──────────────────┴────────────┴──────┴─────────┴──────────┴────────────┘
```

## Benefits

### 1. Clear Guidance
- Exam coordinators know exactly which answer sheet type to use
- No confusion about which sheets to distribute
- Reduces errors in answer sheet distribution

### 2. Visual Indicators
- Color-coded badges make it easy to scan
- Quick identification of different sheet types
- Consistent visual language

### 3. Subject-Based Configuration
- Answer sheet types are configured in the Subject module
- Centralized management
- Easy to update if requirements change

### 4. Accurate Matching
- Cross-references subject code, class, and name
- Ensures correct answer sheet type for each subject
- Prevents mismatches

## Configuration

### Setting Answer Sheet Types

To configure answer sheet types for subjects:

1. Go to **Subjects** page
2. Edit a subject
3. Set the **Answer Sheet** field:
   - `32_pages` - For most subjects (Main 32 Pages)
   - `20_pages` - For subjects with less content (Main 20 Pages)
   - `40_graph` - For subjects requiring graphs (Graph 40 Pages)
   - `none` - If not specified

4. Save the subject

The Used tab will automatically reflect the configured answer sheet type.

## Use Cases

### 1. Exam Planning
**Scenario**: Planning which answer sheets to prepare for each exam

**Workflow**:
1. Open Used tab
2. See all exams with answer sheet types
3. Note which types are needed
4. Prepare answer sheets accordingly

### 2. Answer Sheet Distribution
**Scenario**: Distributing answer sheets on exam day

**Workflow**:
1. Check Used tab for the exam date
2. See which answer sheet type is required
3. Distribute the correct type
4. Mark as used after distribution

### 3. Inventory Management
**Scenario**: Checking if you have enough of each type

**Workflow**:
1. Review Used tab to see upcoming exams
2. Count how many of each type are needed
3. Check Received/Balance tabs for inventory
4. Order more if needed

## Technical Details

### Data Flow

```
Subject Module
    ↓
Answer Sheet Type Configuration
    ↓
Centre Datesheet API
    ↓
Cross-Reference (Code + Class)
    ↓
Include in Response
    ↓
Display in Used Tab
```

### API Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "examDate": "2026-02-17T00:00:00.000Z",
      "dayName": "TUESDAY",
      "subjectCode": "041",
      "subjectName": "MATHEMATICS STANDARD",
      "class": "10",
      "timeSlot": {
        "start": "10:30 AM",
        "end": "01:30 PM"
      },
      "duration": 180,
      "candidateCount": 268,
      "roomsNeeded": 12,
      "answerSheetType": "32_pages"
    }
  ],
  "count": 15
}
```

## Troubleshooting

### Answer Sheet Type Shows "Not Specified"

**Cause**: Subject doesn't have answer sheet type configured

**Solution**:
1. Go to Subjects page
2. Find the subject (match code and class)
3. Edit and set the Answer Sheet field
4. Save
5. Refresh Answer Sheets page

### Wrong Answer Sheet Type Displayed

**Cause**: Subject code or class mismatch

**Solution**:
1. Verify subject code matches exactly
2. Verify class matches exactly
3. Check Subject module for correct configuration
4. Update if needed

### Answer Sheet Type Not Updating

**Cause**: Cache or stale data

**Solution**:
1. Refresh the page
2. Check if subject was saved correctly
3. Verify subject is active (isActive: true)

## Summary

The Answer Sheet Type column provides clear guidance on which type of answer sheet to use for each subject, based on the subject module configuration. This feature:

✅ Shows answer sheet type for each exam
✅ Cross-references subject code, class, and name
✅ Uses color-coded badges for easy identification
✅ Configured centrally in Subject module
✅ Helps prevent distribution errors
✅ Improves exam planning and coordination

The column is automatically populated from the Subject module and updates whenever subject configurations change.
