# Answer Sheets Serial Number Format

## Overview

Answer sheet serial numbers are stored as **STRINGS** to preserve leading zeros and support alphanumeric formats.

## Format Specification

### Valid Formats

Serial numbers can be in the following formats:

1. **Numeric with leading zeros**
   - Example: `001245`, `000001`, `009999`
   - Leading zeros are preserved
   - Used when serial numbers need fixed-width formatting

2. **Numeric without leading zeros**
   - Example: `1001`, `2500`, `10050`
   - Standard numeric format
   - Most common format

3. **Alphanumeric with letter prefix and leading zeros**
   - Example: `A001245`, `O000001`, `P009999`
   - Letter prefix (typically the suffix) + numeric with leading zeros
   - Used for categorization

4. **Alphanumeric with letter prefix**
   - Example: `A1001`, `O1500`, `P2500`
   - Letter prefix + numeric without leading zeros
   - Alternative categorization format

### Validation Rules

- **Pattern**: `^[A-Z]?\d+$`
- Optional single uppercase letter prefix
- Followed by one or more digits
- Leading zeros are allowed and preserved
- No spaces or special characters

## Storage

### Database Storage

```javascript
{
  serialFrom: String,  // e.g., "001245" or "A001245"
  serialTo: String,    // e.g., "001500" or "A001500"
  total: Number        // Calculated from numeric portion
}
```

### Why String Type?

**CRITICAL**: Serial numbers MUST be stored as strings because:

1. **Preserve Leading Zeros**: `"001245"` stored as number becomes `1245`
2. **Support Alphanumeric**: `"A001245"` cannot be stored as number
3. **Display Consistency**: Original format is maintained for printing/display
4. **Data Integrity**: No loss of information during storage/retrieval

## Calculation

### Total Calculation

When calculating the total number of sheets:

```javascript
// Extract numeric portion only
const from = parseInt(serialFrom.replace(/\D/g, ''))  // Remove non-digits
const to = parseInt(serialTo.replace(/\D/g, ''))      // Remove non-digits

// Calculate total
const total = to - from + 1
```

### Examples

| Serial From | Serial To | Calculation | Total |
|-------------|-----------|-------------|-------|
| `001001` | `001500` | 1500 - 1001 + 1 | 500 |
| `1001` | `1500` | 1500 - 1001 + 1 | 500 |
| `A001001` | `A001500` | 1500 - 1001 + 1 | 500 |
| `O1001` | `O1500` | 1500 - 1001 + 1 | 500 |

## Display

### Frontend Display

Always display serial numbers as-is (preserve original format):

```typescript
// ✅ CORRECT
<td>{entry.serialFrom}</td>  // Shows "001245"

// ❌ WRONG
<td>{parseInt(entry.serialFrom)}</td>  // Shows "1245" (loses leading zeros)
```

### Monospace Font

Use monospace font for serial numbers to maintain alignment:

```css
.serial-number {
  font-family: 'Courier New', monospace;
}
```

## Input Handling

### User Input

When users enter serial numbers:

1. **Accept as string**: Don't convert to number
2. **Trim whitespace**: Remove leading/trailing spaces
3. **Validate format**: Check against pattern
4. **Preserve zeros**: Keep original format

### Example Input Component

```typescript
<input
  type="text"
  value={serialFrom}
  onChange={(e) => setSerialFrom(e.target.value.trim())}
  placeholder="e.g., 001001 or A001001"
  pattern="^[A-Z]?\d+$"
  className="font-mono"
/>
```

## API Handling

### Request/Response

Serial numbers are always transmitted as strings:

```json
{
  "serialFrom": "001245",
  "serialTo": "001500",
  "total": 256
}
```

### Validation

Backend validates format before saving:

```javascript
// Validation regex
const serialPattern = /^[A-Z]?\d+$/

if (!serialPattern.test(serialFrom)) {
  throw new Error('Invalid serial number format')
}
```

## Common Patterns by Answer Sheet Type

### Current Seeded Data

| Type | Suffix | Serial Format | Example Range |
|------|--------|---------------|---------------|
| Main 32 Red (10) | O | Numeric | 1001-1500 |
| Main 32 Blue (12) | P | Numeric | 2001-2500 |
| Main 20 Red (10) | A | Numeric | 3001-3300 |
| Main 20 Blue (12) | A | Numeric | 4001-4250 |
| Graph 40 Red (10) | A | Numeric | 5001-5200 |
| Graph 40 Blue (12) | A | Numeric | 6001-6150 |
| Supplementary 16 Yellow (10) | G | Numeric | 7001-7100 |
| Supplementary 16 Pink (12) | H | Numeric | 8001-8100 |
| For Blind 32 Red (10) | B | Numeric | 9001-9050 |
| For Blind 32 Blue (12) | B | Numeric | 10001-10050 |
| Drawing Sheets 21 White (12) | D | Numeric | 11001-11200 |

### Alternative Formats (Supported)

You can also use these formats:

```
O001001-O001500  (with prefix)
001001-001500    (with leading zeros)
A001001-A001500  (prefix + leading zeros)
```

## Best Practices

### DO ✅

1. Store serial numbers as strings
2. Preserve leading zeros
3. Use monospace fonts for display
4. Validate format on input
5. Extract numeric portion for calculations only
6. Keep original format in database

### DON'T ❌

1. Convert serial numbers to integers
2. Remove leading zeros
3. Use proportional fonts for display
4. Allow invalid characters
5. Modify format during storage
6. Lose original formatting

## Migration Notes

If you have existing data with serial numbers as integers:

```javascript
// Convert integer to string with leading zeros (if needed)
const serialFrom = String(1245).padStart(6, '0')  // "001245"

// Or keep as-is if no leading zeros needed
const serialFrom = String(1245)  // "1245"
```

## Testing

### Test Cases

```javascript
// Valid formats
"001245"     ✅
"1245"       ✅
"A001245"    ✅
"O1245"      ✅

// Invalid formats
"12 45"      ❌ (space)
"12-45"      ❌ (hyphen)
"AB1245"     ❌ (multiple letters)
"1245A"      ❌ (letter at end)
"A"          ❌ (no digits)
""           ❌ (empty)
```

## Summary

- **Storage**: Always use String type
- **Format**: `[A-Z]?\d+` (optional letter + digits)
- **Leading Zeros**: Preserved in storage and display
- **Calculation**: Extract numeric portion only
- **Display**: Use monospace font, show original format
- **Validation**: Check pattern before saving

This ensures data integrity and maintains the exact format of serial numbers as they appear on physical answer sheets.
