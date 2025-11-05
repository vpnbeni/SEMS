# Calendar System Implementation

## Overview

The calendar system stores the complete calendar for the current year (and other years as needed) in the backend database. This allows for automatic day name lookup for any date and provides a foundation for holiday management and exam scheduling.

## Backend Components

### 1. Calendar Model (`server/src/models/Calendar.js`)

**Schema Structure:**
```javascript
{
  year: Number,           // Calendar year (e.g., 2024)
  dates: [{
    date: Date,           // Actual date
    dayName: String,      // Day name (Monday, Tuesday, etc.)
    dayNumber: Number,    // Day number (0=Sunday, 1=Monday, etc.)
    isWeekend: Boolean,   // True for Saturday/Sunday
    isHoliday: Boolean,   // True for holidays
    holidayName: String   // Name of the holiday (if applicable)
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Key Methods:**
- `getDayForDate(date)` - Get day name for a specific date
- `generateYearCalendar(year)` - Static method to generate all dates for a year

### 2. Calendar Controller (`server/src/controllers/calendarController.js`)

**API Endpoints:**
- `GET /api/calendar/current` - Get current year calendar
- `GET /api/calendar/year/:year` - Get specific year calendar
- `GET /api/calendar/day/:date` - Get day name for specific date
- `POST /api/calendar/days` - Get day names for multiple dates
- `PUT /api/calendar/holidays` - Update holiday information

### 3. Calendar Utilities (`server/src/utils/calendarSeeder.js`)

**Functions:**
- `initializeCurrentYearCalendar()` - Auto-create current year calendar
- `initializeMultipleYears(start, end)` - Create calendars for multiple years
- `addCommonHolidays(year, holidays)` - Add holiday information
- `getDayNameForDate(date)` - Utility function for day lookup

## Frontend Integration

### Calendar Service (`client/src/services/calendarService.ts`)

**Methods:**
- `getCurrentYearCalendar()` - Fetch current year calendar
- `getDayForDate(date)` - Get day name for specific date
- `getDaysForDates(dates[])` - Batch day name lookup
- `getDayNameFromDate(date)` - Client-side fallback calculation

## Usage in DateSheets

### Automatic Day Calculation

When displaying exam dates in the DateSheets table:

```typescript
// The getDayName function now uses the calendar service
const getDayName = (dateString: string) => {
  return calendarService.getDayNameFromDate(dateString)
}
```

### Date Display in Table

```jsx
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
  {row.examDate ? getDayName(row.examDate) : '—'}
</td>
```

## Server Initialization

The calendar system automatically initializes when the server starts:

```javascript
// In server.js
const initializeServer = async () => {
  await connectDB();
  await initializeCurrentYearCalendar(); // Auto-creates current year calendar
};
```

## Features

### 1. **Automatic Calendar Generation**
- Generates complete calendar for any year on-demand
- Includes all 365/366 days with day names and numbers
- Automatically identifies weekends

### 2. **Holiday Management**
- Support for marking holidays
- Holiday names and descriptions
- Common holidays pre-configured (New Year, Independence Day, etc.)

### 3. **Efficient Lookups**
- Database indexes for fast date lookups
- Batch processing for multiple dates
- Client-side fallback for offline scenarios

### 4. **Year Management**
- Supports multiple years simultaneously
- Auto-generates calendars as needed
- Persistent storage in MongoDB

## API Examples

### Get Day for Single Date
```bash
GET /api/calendar/day/2024-08-15
Response: {
  "success": true,
  "data": {
    "date": "2024-08-15T00:00:00.000Z",
    "dayName": "Thursday",
    "year": 2024
  }
}
```

### Get Days for Multiple Dates
```bash
POST /api/calendar/days
Body: {
  "dates": ["2024-08-15", "2024-12-25", "2024-01-01"]
}
Response: {
  "success": true,
  "data": [
    { "date": "2024-08-15", "dayName": "Thursday", "year": 2024 },
    { "date": "2024-12-25", "dayName": "Wednesday", "year": 2024 },
    { "date": "2024-01-01", "dayName": "Monday", "year": 2024 }
  ]
}
```

## Testing

Run the calendar test script:
```bash
cd server
node test-calendar.js
```

This will:
1. Initialize the current year calendar
2. Test day lookups for various dates
3. Add common holidays
4. Display sample calendar entries

## Benefits

1. **Consistency** - All date/day calculations use the same source
2. **Performance** - Pre-calculated days avoid repeated calculations
3. **Flexibility** - Easy to add holidays and special dates
4. **Reliability** - Backend storage ensures data persistence
5. **Scalability** - Supports multiple years and bulk operations

## Future Enhancements

1. **Academic Calendar Integration** - Link with school academic calendars
2. **Regional Holidays** - Support for different regional holiday sets
3. **Exam Scheduling Rules** - Avoid scheduling exams on holidays/weekends
4. **Calendar Sync** - Integration with external calendar systems
5. **Time Zone Support** - Multi-timezone calendar support