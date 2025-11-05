# Centre Datesheet UI Fixes

## Changes Made

### 1. **Removed Sorting Filters from Centre Datesheet Tab**

**Problem**: The Centre Datesheet tab had sorting buttons on all column headers, which was unnecessary since the data is already sorted by date by default.

**Solution**: Made table headers conditional - Centre Datesheet tab now shows plain text headers without sorting buttons.

**Code Change**:
```typescript
// Before: All tabs had sorting buttons
<button onClick={() => handleSort('date')}>Date</button>

// After: Conditional rendering
{activeTab === 'centre' ? (
  <span>Date</span>  // Plain text for centre tab
) : (
  <button onClick={() => handleSort('date')}>Date</button>  // Sorting for other tabs
)}
```

**Applied to columns**:
- Date
- Class
- Subject Name
- Subject Code
- Duration

**Result**: Centre Datesheet tab now has clean, non-interactive headers.

### 2. **Fixed Duration Display (Minutes → Hours)**

**Problem**: Duration was showing as "3m" (3 minutes) instead of "3h" (3 hours) in the Centre Datesheet tab.

**Root Cause**: The `formatDuration` function was only treating Full Datesheet (`activeTab === 'all'`) durations as hours. Centre Datesheet durations were being treated as minutes.

**Solution**: Updated the duration formatting logic to treat both Full Datesheet and Centre Datesheet durations as hours.

**Code Change**:
```typescript
// Before
{formatDuration(row.duration, activeTab === 'all')}

// After
{formatDuration(row.duration, activeTab === 'all' || activeTab === 'centre')}
```

**Result**: Centre Datesheet now correctly displays "3h" instead of "3m".

## Technical Details

### **Duration Format Logic**

The `formatDuration` function has two modes:

1. **Hours Mode** (for Full Datesheet and Centre Datesheet):
   - Input: `3` → Output: `"3h"`
   - Input: `2` → Output: `"2h"`
   - Used when duration is stored in hours

2. **Minutes Mode** (for other datesheet tabs):
   - Input: `180` → Output: `"3h"`
   - Input: `90` → Output: `"1h 30m"`
   - Used when duration is stored in minutes

### **Why Centre Datesheet Uses Hours**

Centre Datesheet data comes from CBSE datesheet entries, where:
- Duration is stored in the Subject model
- Subject duration is in hours (e.g., 3 hours for most exams)
- This matches the CBSE Full Datesheet format

## Files Modified

**File**: `client/src/pages/DateSheets.tsx`

**Changes**:
1. Table headers: Made conditional based on `activeTab`
2. Duration display: Updated to include centre tab in hours mode

## User Experience

### **Before Fixes**

**Centre Datesheet Tab**:
- ❌ Had sorting arrows on all column headers
- ❌ Duration showed as "3m" (incorrect)
- ❌ Clicking headers would try to sort (but sorting was already handled server-side)

### **After Fixes**

**Centre Datesheet Tab**:
- ✅ Clean headers without sorting arrows
- ✅ Duration shows as "3h" (correct)
- ✅ Headers are non-interactive (as intended)
- ✅ Data is sorted by date by default (server-side)

## Comparison with Other Tabs

### **Full Datesheet Tab**
- Has sorting buttons (kept)
- Duration in hours: "3h"
- Server-side sorting enabled

### **Centre Datesheet Tab**
- No sorting buttons (removed)
- Duration in hours: "3h"
- Pre-sorted by date

### **Centre 10th/12th Tabs**
- Has sorting buttons (kept)
- Duration in minutes: "180m" or "3h"
- Client-side sorting

## Testing

### **Test Sorting Removal**
1. Go to Centre Datesheet tab
2. Verify column headers are plain text
3. Verify no sorting arrows appear
4. Verify clicking headers does nothing

### **Test Duration Display**
1. Go to Centre Datesheet tab
2. Check Duration column
3. Verify all durations show as "Xh" (e.g., "3h", "2h")
4. Verify no durations show as "Xm"

## Benefits

1. **Cleaner UI**: Centre Datesheet has simpler, cleaner headers
2. **Correct Information**: Duration displays accurately in hours
3. **Better UX**: No confusion about sorting (data is already sorted)
4. **Consistency**: Duration format matches Full Datesheet tab

## Future Considerations

If sorting is needed for Centre Datesheet in the future:
1. Can be re-enabled by removing the conditional
2. Would need to implement server-side sorting (already available in API)
3. Would need to add sorting state management for centre tab