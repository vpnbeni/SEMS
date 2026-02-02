# CBSE Datesheet Integration Guide

## Overview

The system now supports importing CBSE Full Datesheet PDFs with automatic date extraction and calendar integration. This allows for seamless import of official CBSE examination schedules with proper date and day name mapping.

## CBSE Datesheet Format

### Structure
The CBSE Full Datesheet follows this format:
```
DATE | Sub Code | Subject Name | Class | Duration (Hours) | Answer Sheet
3/2/2026 | 002 | HINDI COURSE - A | 10th | 3 | 32 Pages
2/23/2026 | 003 | URDU COURSE - A | 10th | 3 | 32 Pages
```

### Key Features
- **Date Format**: M/D/YYYY (e.g., 3/2/2026, 2/23/2026)
- **Subject Codes**: 3-digit numbers (002, 003, 041, etc.)
- **Classes**: 10th and 12th
- **Duration**: Single digit hours (2, 3, 4)
- **Answer Sheets**: 32 Pages, 20 Pages, 40 Graph

## Implementation Components

### 1. CBSE Parser (`server/src/utils/cbseDatesheetParser.js`)

**Purpose**: Specialized parser for CBSE datesheet format

**Key Methods**:
- `parsePDF(buffer)` - Main parsing function
- `parseTextContent(text)` - Extract exam entries from text
- `parseExamEntry(line)` - Parse individual exam lines
- `convertDateFormat(dateStr)` - Convert M/D/YYYY to YYYY-MM-DD
- `getStatistics(entries)` - Generate parsing statistics

**Features**:
- Handles CBSE-specific date format
- Extracts subject codes, names, classes, and durations
- Maps answer sheet types to standard formats
- Provides detailed parsing statistics

### 2. Enhanced Datesheet Controller

**Integration**: The datesheet controller now tries CBSE parsing first, then falls back to standard parsing.

**Process**:
1. Receive PDF upload
2. Extract text from PDF
3. **Try CBSE parser first**
4. If CBSE parsing succeeds → return CBSE format results
5. If CBSE parsing fails → fallback to standard parser
6. Return parsed results with format indication

### 3. Calendar Integration

**Calendar System**: Automatic day name lookup for exam dates

**Components**:
- `Calendar` model stores yearly calendars
- `calendarService` provides day name lookup
- Auto-initialization on server startup
- Support for multiple years

**Day Name Resolution**:
```javascript
// Example: 2026-03-02 → "Monday"
const dayName = await calendarService.getDayForDate('2026-03-02')
```

### 4. Frontend Integration

**DateSheets Page Updates**:
- Enhanced Full Datesheet tab
- Calendar service integration
- Proper duration formatting (hours vs minutes)
- Support for CBSE format display

## Usage Instructions

### 1. Importing CBSE Datesheet

1. **Navigate** to DateSheets page
2. **Click** "Import PDF" button
3. **Select** CBSE Full Datesheet PDF file
4. **Upload** - system automatically detects CBSE format
5. **Review** imported entries with dates and day names

### 2. Viewing Full Datesheet

1. **Click** "Full Datesheet" tab
2. **View** all subjects with:
   - Exam dates (from CBSE import)
   - Day names (from calendar)
   - Subject codes and names
   - Class levels (10th/12th)
   - Duration in hours
3. **Use** pagination to browse through subjects
4. **Sort** by date, class, subject name, etc.

## API Endpoints

### Import CBSE Datesheet
```http
POST /api/datesheets/import-pdf
Content-Type: multipart/form-data

{
  "file": "CBSE Full Datesheet.pdf"
}
```

**Response** (CBSE format detected):
```json
{
  "success": true,
  "message": "Successfully imported 203 exam entries from CBSE datesheet",
  "data": {
    "count": 203,
    "format": "CBSE Full Datesheet",
    "entries": [...],
    "stats": {
      "total": 203,
      "class10th": 83,
      "class12th": 120,
      "dates": 39,
      "subjects": 189
    }
  }
}
```

### Calendar Day Lookup
```http
GET /api/calendar/day/2026-03-02
```

**Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-03-02",
    "dayName": "Monday",
    "year": 2026
  }
}
```

## Testing

### Test CBSE Parser
```bash
cd server
node test-cbse-parser.js
```

**Expected Output**:
```
✅ Parsing successful!
📊 Found 203 exam entries
📈 Statistics:
   Total entries: 203
   Class 10th: 83
   Class 12th: 120
   Unique dates: 39
   Unique subjects: 189
📅 Date range: 2026-02-17 to 2026-04-09
```

### Test Calendar System
```bash
cd server
node test-calendar.js
```

## File Structure

```
server/
├── src/
│   ├── utils/
│   │   ├── cbseDatesheetParser.js     # CBSE parser
│   │   └── calendarSeeder.js          # Calendar utilities
│   ├── models/
│   │   └── Calendar.js                # Calendar model
│   ├── controllers/
│   │   ├── datesheetController.js     # Enhanced with CBSE support
│   │   └── calendarController.js      # Calendar API
│   └── routes/
│       └── calendar.js                # Calendar routes
├── test-cbse-parser.js                # CBSE parser test
└── analyze-cbse-datesheet.js          # PDF analysis tool

client/
├── src/
│   ├── services/
│   │   └── calendarService.ts         # Calendar API client
│   └── pages/
│       └── DateSheets.tsx             # Enhanced datesheet page
└── public/
    └── CBSE Full Datesheet.pdf        # Sample CBSE datesheet
```

## Benefits

### 1. **Automatic Format Detection**
- System automatically detects CBSE vs standard format
- No manual format selection required
- Seamless user experience

### 2. **Accurate Date Handling**
- Proper date format conversion (M/D/YYYY → YYYY-MM-DD)
- Automatic day name lookup from calendar
- Support for leap years and date validation

### 3. **Comprehensive Data Extraction**
- Subject codes, names, classes, durations
- Answer sheet type mapping
- Statistical analysis of imported data

### 4. **Calendar Integration**
- Persistent calendar storage in database
- Fast day name lookups
- Support for multiple years
- Holiday management capability

### 5. **Robust Error Handling**
- Fallback to standard parser if CBSE parsing fails
- Detailed error messages and debugging info
- Graceful handling of malformed PDFs

## Future Enhancements

### 1. **Database Storage**
- Store imported CBSE datesheets in database
- Link subjects with exam dates
- Historical datesheet management

### 2. **Advanced Calendar Features**
- Holiday integration
- Academic calendar support
- Regional calendar variations

### 3. **Enhanced UI**
- Date range filtering
- Calendar view of exam schedule
- Export functionality

### 4. **Validation & Verification**
- Cross-reference with subject database
- Duplicate detection
- Data validation rules

## Troubleshooting

### Common Issues

**1. CBSE Parser Not Working**
```bash
# Test the parser directly
node test-cbse-parser.js

# Check PDF format
node analyze-cbse-datesheet.js
```

**2. Calendar Day Names Missing**
```bash
# Initialize calendar
node test-calendar.js

# Check calendar API
curl http://localhost:5000/api/calendar/day/2026-03-02
```

**3. Import Fails**
- Ensure PDF is text-based (not scanned image)
- Check file size and format
- Verify server logs for detailed errors

### Debug Tools

**Analyze PDF Structure**:
```bash
node analyze-cbse-datesheet.js
```

**Test Calendar System**:
```bash
node test-calendar.js
```

**Test CBSE Parser**:
```bash
node test-cbse-parser.js
```

This integration provides a complete solution for importing and managing CBSE examination schedules with proper calendar integration and day name resolution.