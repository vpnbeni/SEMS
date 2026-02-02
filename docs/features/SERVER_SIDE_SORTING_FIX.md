# Server-Side Sorting Implementation

## Problem
The sorting functionality on the Full Datesheet tab was only sorting the currently displayed 50 entries instead of all 203 entries in the database. This happened because sorting was done client-side after pagination, not server-side before pagination.

## Solution Implemented

### 1. **Backend Changes** (`server/src/controllers/datesheetController.js`)

Added server-side sorting to the `getCBSEFullDatesheet` API endpoint:

```javascript
// Get sorting parameters
const sortField = req.query.sortField || null
const sortOrder = req.query.sortOrder || 'asc'

// Apply sorting if requested
let sortedEntries = [...cbseDatesheet.entries]
if (sortField) {
  sortedEntries.sort((a, b) => {
    let comparison = 0
    
    if (sortField === 'date') {
      comparison = new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
    } else if (sortField === 'class') {
      comparison = a.subject.class.localeCompare(b.subject.class)
    } else if (sortField === 'subjectName') {
      comparison = a.subject.name.toLowerCase().localeCompare(b.subject.name.toLowerCase())
    } else if (sortField === 'subjectCode') {
      comparison = a.subject.code.localeCompare(b.subject.code)
    } else if (sortField === 'duration') {
      comparison = a.subject.duration - b.subject.duration
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })
}

// Apply pagination after sorting
const paginatedEntries = sortedEntries.slice(skip, skip + limit)
```

**Supported Sort Fields:**
- `date` - Sort by exam date
- `class` - Sort by class (10th, 12th)
- `subjectName` - Sort by subject name (case-insensitive)
- `subjectCode` - Sort by subject code
- `duration` - Sort by exam duration

**Sort Orders:**
- `asc` - Ascending order
- `desc` - Descending order

### 2. **Frontend Changes** (`client/src/pages/DateSheets.tsx`)

#### Modified API Call
Updated `loadCBSEDatesheet()` to send sorting parameters:

```typescript
const queryParams = new URLSearchParams({
  page: pagination.page.toString(),
  limit: pagination.limit.toString(),
})

// Add sorting parameters if active
if (sortField) {
  queryParams.append('sortField', sortField)
  queryParams.append('sortOrder', sortOrder)
}
```

#### Enhanced Sort Handler
Modified `handleSort()` to reset pagination and trigger server reload:

```typescript
const handleSort = (field) => {
  // Update sort state
  if (sortField === field) {
    if (sortOrder === 'asc') {
      setSortOrder('desc')
    } else {
      setSortField(null)
      setSortOrder('asc')
    }
  } else {
    setSortField(field)
    setSortOrder('asc')
  }
  
  // Reset to first page when sorting changes
  setPagination(prev => ({ ...prev, page: 1 }))
}
```

#### Added Reactive Data Loading
Added useEffect to reload data when sort parameters change:

```typescript
// Reload data when sort parameters change
useEffect(() => {
  if (activeTab === 'all') {
    loadCBSEDatesheet()
  }
}, [sortField, sortOrder])
```

#### Removed Client-Side Sorting
Removed client-side sorting for Full Datesheet tab since server handles it:

```typescript
// Apply sorting (only for non-Full Datesheet tabs)
if (activeTab !== 'all') {
  // Client-side sorting for other tabs
  if (sortField) {
    tableRows = [...tableRows].sort(...)
  }
}
// Note: Full Datesheet tab uses server-side sorting
```

## API Usage

### Request Format
```
GET /api/datesheets/cbse-full?page=1&limit=50&sortField=date&sortOrder=asc
```

### Query Parameters
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `sortField` - Field to sort by (optional)
- `sortOrder` - Sort direction: 'asc' or 'desc' (default: 'asc')

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "examDate": "2026-02-17T00:00:00.000Z",
      "dayName": "Monday",
      "subject": {
        "code": "041",
        "name": "MATHEMATICS STANDARD",
        "class": "10th",
        "duration": 3
      },
      "timeSlot": {
        "start": "09:00",
        "end": "12:00"
      }
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 203,
    "limit": 50
  }
}
```

## User Experience

### Before Fix
- Clicking sort headers only sorted the 50 visible entries
- Users couldn't see the truly earliest/latest dates or alphabetically first/last subjects
- Pagination + sorting was inconsistent

### After Fix
- Clicking sort headers sorts ALL 203 entries in the database
- Pagination shows correctly sorted results across all pages
- Users can find the actual earliest exam date, latest date, etc.
- Sorting is consistent across page navigation

## Example Scenarios

### Sort by Date (Ascending)
1. User clicks "Date" column header
2. Frontend sends: `GET /api/datesheets/cbse-full?sortField=date&sortOrder=asc&page=1&limit=50`
3. Backend sorts all 203 entries by date (earliest first)
4. Backend returns first 50 sorted entries
5. User sees earliest exam dates on page 1

### Sort by Subject Name (Descending)
1. User clicks "Subject Name" header twice (to get descending)
2. Frontend sends: `GET /api/datesheets/cbse-full?sortField=subjectName&sortOrder=desc&page=1&limit=50`
3. Backend sorts all entries by subject name (Z to A)
4. User sees subjects starting with Z, Y, X, etc. on page 1

## Testing

Run the test script to verify sorting works:
```bash
node test-sorting-api.js
```

This will test various sort combinations and show the results.

## Benefits

1. **Accurate Sorting** - Sorts all entries, not just visible ones
2. **Better Performance** - Server-side sorting is more efficient for large datasets
3. **Consistent UX** - Sorting behavior matches user expectations
4. **Scalable** - Works correctly even with thousands of entries
5. **Proper Pagination** - Pagination works correctly with sorted data