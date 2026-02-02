# Class-Based Statistics Update

## Overview
Updated the candidates page statistics to show class-based metrics (10th and 12th) instead of status-based metrics (active, inactive, graduated, suspended).

## Changes Made

### Backend (`server/src/controllers/candidateController.js`)

Updated the `getCandidateStats` function to return class-based statistics:

**Before:**
```javascript
const stats = await Promise.all([
  Candidate.countDocuments({ status: 'active' }),
  Candidate.countDocuments({ status: 'inactive' }),
  Candidate.countDocuments({ status: 'graduated' }),
  Candidate.countDocuments({ status: 'suspended' }),
  // ...
]);

return {
  totalCandidates: stats[0] + stats[1] + stats[2] + stats[3],
  active: stats[0],
  inactive: stats[1],
  graduated: stats[2],
  suspended: stats[3],
  // ...
};
```

**After:**
```javascript
const stats = await Promise.all([
  Candidate.countDocuments({}),
  Candidate.countDocuments({ class: '10th' }),
  Candidate.countDocuments({ class: '12th' }),
  // ...
]);

return {
  totalCandidates: stats[0],
  class10th: stats[1],
  class12th: stats[2],
  // ...
};
```

### Frontend

#### 1. Shared Types (`client/src/types/candidate.ts`)
Created a shared types file to avoid TypeScript conflicts:

```typescript
export interface CandidateStats {
  totalCandidates: number
  class10th: number
  class12th: number
  byCourse: Array<{ _id: string; count: number }>
  byDepartment: Array<{ _id: string; count: number }>
}
```

#### 2. Candidates Page (`client/src/pages/Candidates.tsx`)
Updated statistics cards:

**Removed:**
- Active (green card)
- Inactive (yellow card)
- Graduated (purple card)
- Suspended (not displayed)

**Added:**
- Class 10th (green card with book icon)
- Class 12th (purple card with graduation cap icon)

**Layout:**
- Changed from 4-column grid to 3-column grid
- Total Candidates | Class 10th | Class 12th

#### 3. Candidate Filters (`client/src/components/candidates/CandidateFilters.tsx`)
Updated to use shared CandidateStats interface.

## Statistics Cards Display

### Total Candidates
- **Icon**: Group of people
- **Color**: Blue (`bg-blue-500`)
- **Shows**: Total number of all candidates

### Class 10th
- **Icon**: Book
- **Color**: Green (`bg-green-500`)
- **Shows**: Number of candidates in 10th class (Secondary School Examination)

### Class 12th
- **Icon**: Graduation cap
- **Color**: Purple (`bg-purple-500`)
- **Shows**: Number of candidates in 12th class (Senior Secondary School Examination)

## Benefits

1. **Relevant Metrics**: Shows class distribution which is more relevant for examination management
2. **Clear Overview**: Immediately see how many students are in each class
3. **Better Organization**: Helps in planning and resource allocation for different examination levels
4. **Simplified UI**: Reduced from 4 cards to 3, making the interface cleaner
5. **Type Safety**: Shared types prevent TypeScript conflicts

## API Response

### GET /api/candidates/stats

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCandidates": 507,
    "class10th": 250,
    "class12th": 257,
    "byCourse": [],
    "byDepartment": []
  }
}
```

## Files Modified

1. `server/src/controllers/candidateController.js` - Updated stats endpoint
2. `client/src/types/candidate.ts` - Created shared types
3. `client/src/pages/Candidates.tsx` - Updated statistics cards
4. `client/src/components/candidates/CandidateFilters.tsx` - Updated interface

## Visual Changes

### Before
```
[Total: 507] [Active: 507] [Inactive: 0] [Graduated: 0]
```

### After
```
[Total: 507] [Class 10th: 250] [Class 12th: 257]
```

## Future Enhancements

Potential improvements:
- Add filter by class (10th/12th)
- Show medium distribution (English/Hindi) per class
- School-wise class distribution
- Subject-wise statistics per class
