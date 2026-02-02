# Used Column - Inline Editing Feature

## Overview

The "Used" column in the Used Answer Sheets tab is now editable, allowing users to directly enter or modify the number of answer sheets used for each exam without using the "Mark Used" button.

## Features

### Inline Editing
- Click on any number in the "Used" column to edit it
- Enter the new value directly
- Press Enter to save or Escape to cancel
- Visual feedback with hover effect

### Smart Answer Sheet Selection
- Automatically finds appropriate answer sheets based on:
  - Answer sheet type (matches subject requirement)
  - Class (10 or 12)
  - Available balance

### Increase/Decrease Support
- **Increase**: Marks additional sheets as used
- **Decrease**: Reduces the used count
- Validates available balance before increasing

## How to Use

### Edit Used Count

1. **Click to Edit**:
   - Click on the number in the "Used" column
   - Input field appears with current value

2. **Enter New Value**:
   - Type the new number
   - Must be 0 or positive

3. **Save**:
   - Press **Enter** key, or
   - Click the **✓** (checkmark) button

4. **Cancel**:
   - Press **Escape** key, or
   - Click the **✕** (cross) button

### Visual Indicators

```
Normal State:
┌──────┐
│  50  │  ← Hover shows it's clickable
└──────┘

Editing State:
┌────────────────────────┐
│ [75] ✓ ✕              │  ← Input with save/cancel buttons
└────────────────────────┘
```

## Behavior

### Increasing Used Count

**Example**: Change from 50 to 75 (increase by 25)

1. System finds available answer sheets:
   - Matches answer sheet type (e.g., Main 32 Pages)
   - Matches class (e.g., Class 10)
   - Has sufficient balance (≥ 25 sheets)

2. Marks 25 additional sheets as used

3. Links them to the exam (date, subject, candidates)

4. Updates the display

### Decreasing Used Count

**Example**: Change from 75 to 50 (decrease by 25)

1. System finds most recently used answer sheets for this exam

2. Reduces the used count by 25

3. Updates the display

### Validation

- ✅ Must be a valid number
- ✅ Must be 0 or positive
- ✅ Cannot exceed available balance (when increasing)
- ✅ Checks for appropriate answer sheet type
- ✅ Verifies class matches

## Answer Sheet Type Matching

The system automatically matches answer sheets based on the subject's required type:

| Required Type | Acceptable Answer Sheets |
|---------------|-------------------------|
| 32_pages (Main 32 Pages) | Main |
| 20_pages (Main 20 Pages) | Main |
| 40_graph (Graph 40 Pages) | Graph |
| none (Not Specified) | Main, Graph, Supplementary |

### Example Matching

**Subject**: Mathematics Standard (Class 10)
- **Required**: Main (32 Pages)
- **Matches**: Any "Main" answer sheet for Class 10
- **Finds**: Main - 32 Pages - Blue - Class 10

**Subject**: Physical Education (Class 12)
- **Required**: Main (20 Pages)
- **Matches**: Any "Main" answer sheet for Class 12
- **Finds**: Main - 20 Pages - Yellow - Class 12

## Error Handling

### No Available Answer Sheets

```
Error: No available answer sheets found for Main (32 Pages) in Class 10
```

**Cause**: No answer sheets of the required type with available balance

**Solution**:
1. Check Received/Balance tabs for available sheets
2. Add more answer sheets if needed
3. Verify answer sheet type matches subject requirement

### Insufficient Balance

```
Error: Not enough answer sheets available. Only 20 sheets remaining.
```

**Cause**: Trying to increase used count beyond available balance

**Solution**:
1. Enter a smaller number
2. Add more answer sheets
3. Check Balance tab for available quantity

### Invalid Number

```
Error: Please enter a valid number
```

**Cause**: Entered non-numeric value or negative number

**Solution**: Enter a valid positive number or 0

## Use Cases

### 1. Quick Entry After Exam

**Scenario**: After distributing answer sheets for an exam

**Workflow**:
1. Go to Used tab
2. Find the exam
3. Click on "0" in Used column
4. Enter actual number distributed (e.g., 268)
5. Press Enter
6. Done!

### 2. Correction

**Scenario**: Entered wrong number, need to correct

**Workflow**:
1. Click on the incorrect number
2. Enter correct number
3. Press Enter
4. System adjusts automatically

### 3. Partial Distribution

**Scenario**: Distributed sheets in multiple batches

**Workflow**:
1. First batch: Enter 100
2. Second batch: Click, change to 150
3. Third batch: Click, change to 200
4. Each update adds to the total

## Technical Details

### State Management

```typescript
const [editingUsedEntry, setEditingUsedEntry] = useState<string | null>(null)
const [editUsedValue, setEditUsedValue] = useState<string>('')
```

- `editingUsedEntry`: ID of the entry being edited
- `editUsedValue`: Current value in the input field

### Handler Function

```typescript
const handleSaveUsed = async (datesheetEntry: CentreDatesheetEntry) => {
  // 1. Validate input
  // 2. Calculate difference from current total
  // 3. Find appropriate answer sheet
  // 4. Update used count
  // 5. Link to exam
  // 6. Refresh data
}
```

### Answer Sheet Selection Logic

```typescript
const targetSheet = entries.find(e => {
  const balance = e.total - e.used - e.discarded
  return balance > 0 && 
         e.class === datesheetEntry.class &&
         matchesAnswerSheetType(e.answerSheetType, answerSheetType)
})
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Click | Start editing |
| Enter | Save changes |
| Escape | Cancel editing |
| Tab | Move to next field (browser default) |

## Comparison: Button vs Inline Editing

### Using "Mark Used" Button

```
1. Click "Mark Used" button
2. Modal appears
3. Select answer sheet type
4. Enter quantity
5. Confirm
6. Done
```

**Pros**: More control, can select specific answer sheet
**Cons**: More steps, slower

### Using Inline Editing

```
1. Click on number
2. Enter new value
3. Press Enter
4. Done
```

**Pros**: Faster, fewer steps, direct
**Cons**: Less control, automatic answer sheet selection

## Best Practices

### When to Use Inline Editing

✅ Quick entry after exam
✅ Simple corrections
✅ Standard answer sheet types
✅ Single answer sheet type per exam

### When to Use "Mark Used" Button

✅ Need to select specific answer sheet
✅ Multiple answer sheet types for one exam
✅ Complex scenarios
✅ Want to see all options

## Limitations

1. **Automatic Selection**: System automatically selects answer sheet
2. **Single Type**: Best for exams using one answer sheet type
3. **Balance Check**: Cannot exceed available balance
4. **Class Match**: Must have answer sheets for the correct class

## Future Enhancements

### Potential Features

1. **Dropdown Selection**: Choose specific answer sheet while editing
2. **Batch Edit**: Edit multiple exams at once
3. **History**: View edit history
4. **Undo**: Undo last change
5. **Validation**: Warn if number doesn't match candidate count
6. **Auto-Calculate**: Suggest number based on candidates

## Troubleshooting

### Edit Not Saving

**Cause**: Validation error or network issue

**Solution**:
1. Check console for errors
2. Verify number is valid
3. Check available balance
4. Try again

### Wrong Answer Sheet Used

**Cause**: System selected different sheet than expected

**Solution**:
1. Use "Mark Used" button for more control
2. Check answer sheet type configuration in Subject module
3. Verify answer sheet inventory

### Cannot Edit

**Cause**: Loading state or permission issue

**Solution**:
1. Wait for page to load completely
2. Check if you're logged in
3. Refresh the page

## Summary

The inline editing feature for the Used column provides a fast, efficient way to record answer sheet usage. Key benefits:

✅ **Faster**: Direct editing without modals
✅ **Intuitive**: Click to edit, Enter to save
✅ **Smart**: Automatic answer sheet selection
✅ **Flexible**: Increase or decrease counts
✅ **Validated**: Checks balance and types
✅ **Linked**: Automatically links to exam details

Perfect for quick data entry after exams while maintaining accuracy and proper linking to the exam schedule.
