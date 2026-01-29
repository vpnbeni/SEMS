# Automatic Day Name Feature

## Overview
The system now automatically calculates and stores day names (Monday, Tuesday, etc.) whenever a date is used in the datesheet system. This ensures consistency across all features and eliminates manual entry errors.

## Implementation

### 1. Date Helper Utility (`server/src/utils/dateHelper.js`)
A new utility module provides functions to:
- Calculate day name from any date
- Format dates consistently
- Add day names to single or multiple entries

### 2. Model-Level Automation

#### CBSEDatesheet Model
- **Pre-save hook**: Automatically calculates `dayName` for all entries before saving
- Ensures all CBSE datesheet entries have day names

#### DateSheet Model
- **Pre-save hook**: Automatically calculates `dayName` for all subject entries
- Added `dayName` field to subject schema
- Validates and adds day names during save operations

### 3. Parser Integration

#### CBSE Datesheet Parser
- Automatically adds `dayName` when parsing PDF files
- Uses `getDayName()` utility function
- Day names are calculated during import process

### 4. Controller Updates

#### Datesheet Controller
- Imports `getDayName` and `addDayNameToEntry` utilities
- Automatically adds day names when creating/updating datesheets
- Ensures consistency across all API operations

## Features

### Automatic Calculation
- Day names are calculated from dates automatically
- No manual entry required
- Consistent across all modules

### Data Integrity
- Pre-save hooks ensure day names are always present
- Existing entries without day names are updated on save
- New entries always include day names

### Consistency
- All datesheet entries (CBSE and custom) use the same logic
- Day names are standardized (Sunday, Monday, Tuesday, etc.)
- Timezone-aware calculations

## Usage

### For Developers

When creating or updating datesheet entries, you don't need to manually add day names:

```javascript
// Before - Manual day name entry (NO LONGER NEEDED)
const entry = {
  examDate: '2026-02-17',
  dayName: 'Tuesday', // Manual entry
  subject: { ... }
}

// After - Automatic day name calculation
const entry = {
  examDate: '2026-02-17',
  // dayName will be automatically added
  subject: { ... }
}
```

### Using the Date Helper

```javascript
const { getDayName, addDayNameToEntry } = require('./utils/dateHelper')

// Get day name from date
const dayName = getDayName('2026-02-17') // Returns "Tuesday"

// Add day name to entry
const entry = { examDate: '2026-02-17', subject: {...} }
const entryWithDay = addDayNameToEntry(entry)
// Returns: { examDate: '2026-02-17', dayName: 'Tuesday', subject: {...} }
```

## Benefits

1. **Eliminates Errors**: No more manual day name entry mistakes
2. **Consistency**: All dates have corresponding day names
3. **Automatic**: Works transparently in the background
4. **Maintainable**: Centralized logic in one utility module
5. **Reliable**: Pre-save hooks ensure data integrity

## Testing

To verify the feature is working:

1. Import a CBSE datesheet PDF - day names should be automatically added
2. Create a custom datesheet - day names should be calculated on save
3. Update existing entries - day names should be added if missing
4. Check API responses - all entries should include `dayName` field

## Files Modified

- `server/src/utils/dateHelper.js` (NEW)
- `server/src/utils/cbseDatesheetParser.js`
- `server/src/models/CBSEDatesheet.js`
- `server/src/models/DateSheet.js`
- `server/src/controllers/datesheetController.js`

## Future Enhancements

- Support for different locales (day names in other languages)
- Holiday detection and marking
- Working day calculations
- Custom day name formats
