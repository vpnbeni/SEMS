# Subject Medium Display

## Overview
Subject codes are now displayed with different colors based on the medium of instruction (language) in which the student will attempt the paper.

## Medium Codes
- **1** = English Medium
- **2** = Hindi Medium

## Color Scheme

### English Medium (Code: 1)
- **Color**: Blue
- **Badge**: `bg-blue-100 text-blue-800` (light mode)
- **Badge**: `bg-blue-900 text-blue-200` (dark mode)
- **Display**: Shows "E" or "English" in the badge

### Hindi Medium (Code: 2)
- **Color**: Orange/Amber
- **Badge**: `bg-orange-100 text-orange-800` (light mode)
- **Badge**: `bg-orange-900 text-orange-200` (dark mode)
- **Display**: Shows "H" or "Hindi" in the badge

## Implementation

### Candidates List Page
On the `/candidates` page, subject codes are displayed in the "Subject Codes" column:

**English Medium Example:**
```
🏫 827403 INTL BHARTI SCHOOL GOHANA ROAD
─────────────────────────────────────────
[301] [042] [043(E)] [044(E)] [034(E)]
 Blue   Blue   Blue      Blue      Blue
```

**Hindi Medium Example:**
```
🏫 40442 THE SANSKRITI SCHOOL GOHANA ROAD
─────────────────────────────────────────
[301] [042] [043(H)] [044(H)] [034(H)]
 Blue   Blue  Orange   Orange   Orange
```

### Candidate Detail Page
On the `/candidates/:id` detail page, subject codes are displayed in larger badges with full medium names:

**English Medium:**
- Background: Light blue
- Text: Dark blue
- Label: "English"

**Hindi Medium:**
- Background: Light orange
- Text: Dark orange
- Label: "Hindi"

## Visual Distinction

The color coding provides immediate visual feedback:
- **Blue badges** = English medium subjects
- **Orange badges** = Hindi medium subjects
- Subjects without medium codes remain blue (default)

## Benefits

1. **Quick Identification**: Teachers and administrators can quickly identify which language medium students are using for each subject
2. **Visual Clarity**: Color coding makes it easy to spot patterns (e.g., all subjects in Hindi vs. mixed)
3. **Accessibility**: Both color and text labels ensure information is accessible
4. **Consistency**: Same color scheme used across both list and detail views
5. **Dark Mode Support**: Colors are optimized for both light and dark themes

## Example Scenarios

### Scenario 1: All English Medium
Student taking all subjects in English:
- All subject badges appear in blue
- Each shows "(E)" or "(English)"

### Scenario 2: All Hindi Medium
Student taking all subjects in Hindi:
- All subject badges appear in orange
- Each shows "(H)" or "(Hindi)"

### Scenario 3: Mixed Medium
Student taking some subjects in English and some in Hindi:
- English subjects appear in blue
- Hindi subjects appear in orange
- Easy to distinguish at a glance

## Technical Details

### Data Structure
Subject codes are stored as:
```javascript
subjectCodes: [
  { code: "301", medium: "" },      // No medium specified
  { code: "042", medium: "" },      // No medium specified
  { code: "043", medium: "1" },     // English
  { code: "044", medium: "2" },     // Hindi
  { code: "034", medium: "1" }      // English
]
```

### Display Logic
```javascript
const isHindi = medium === '2';
const isEnglish = medium === '1';
const mediumLabel = isHindi ? 'Hindi' : isEnglish ? 'English' : '';
```

### Color Classes
```javascript
className={`${
  isHindi 
    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
}`}
```

## Files Modified

1. `client/src/components/candidates/CandidateTable.tsx` - List view
2. `client/src/pages/CandidateDetail.tsx` - Detail view

## Future Enhancements

Potential future improvements:
- Add filter to show only English or Hindi medium students
- Statistics showing distribution of medium preferences
- Bulk update medium for multiple subjects
- Support for additional languages/mediums
