# Centre Datesheet Implementation

## Overview
The Centre Datesheet feature automatically generates a centre-specific examination datesheet based on the subjects that candidates from that centre have actually chosen. This ensures that only relevant exam dates are displayed for each examination centre.

## How It Works

### 1. **Automatic Generation**
- The system fetches all active candidates and their subject choices
- Extracts unique subject codes from all candidates
- Filters the CBSE Full Datesheet to show only subjects that candidates have selected
- Displays the filtered datesheet with actual exam dates and day names

### 2. **Dynamic Updates**
- The centre datesheet automatically updates when:
  - New candidates are registered
  - Candidates modify their subject choices
  - New subjects are added to the CBSE datesheet

## Implementation Details

### **Backend API** (`/api/datesheets/centre-datesheet`)

#### Endpoint
```
GET /api/datesheets/centre-datesheet?page=1&limit=50&sortField=date&sortOrder=asc
```

#### Process Flow
1. **Fetch CBSE Datesheet**: Gets the active CBSE datesheet with all subjects
2. **Get Candidates**: Retrieves all active candidates with their subject choices
3. **Extract Subject Codes**: Collects unique subject codes from all candidates
4. **Filter Datesheet**: Filters CBSE datesheet to include only candidate-chosen subjects
5. **Apply Sorting**: Sorts the filtered results by requested field
6. **Apply Pagination**: Returns paginated results

#### Code Implementation
```javascript
// Get all candidates with their subject choices
const candidates = await Candidate.find({ isActive: true })
  .populate('subjects.subject', 'code name class')
  .lean()

// Extract unique subject codes from candidates
const candidateSubjectCodes = new Set()
candidates.forEach(candidate => {
  candidate.subjects.forEach(subjectEntry => {
    if (subjectEntry.subject && subjectEntry.subject.code) {
      candidateSubjectCodes.add(subjectEntry.subject.code)
    }
  })
})

// Filter CBSE datesheet entries
const centreEntries = cbseDatesheet.entries.filter(entry => {
  return candidateSubjectCodes.has(entry.subject.code)
})
```

#### Response Format
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
    "totalPages": 3,
    "totalCount": 125,
    "limit": 50
  },
  "stats": {
    "total": 125,
    "class10th": 65,
    "class12th": 60,
    "uniqueDates": 25,
    "candidateCount": 507
  },
  "message": "Generated centre datesheet with 125 subjects based on 507 candidates"
}
```

### **Frontend Implementation**

#### State Management
```typescript
const [centreDatesheet, setCentreDatesheet] = useState<any[]>([])
const [centreLoading, setCentreLoading] = useState<boolean>(false)
```

#### Data Loading
```typescript
const loadCentreDatesheet = async () => {
  // Fetch centre datesheet from API
  // Apply sorting and pagination parameters
  // Update state with results
}
```

#### Tab Integration
- Centre Datesheet tab automatically loads when selected
- Supports server-side sorting and pagination
- Shows loading states and empty states appropriately

## Features

### **Automatic Subject Filtering**
- Only shows subjects that candidates have actually chosen
- Eliminates irrelevant exam dates from the centre's view
- Reduces clutter and focuses on relevant information

### **Real-time Updates**
- Automatically reflects changes in candidate registrations
- Updates when candidates modify their subject selections
- No manual intervention required

### **Complete Exam Information**
- Shows actual exam dates from CBSE datesheet
- Displays day names (Monday, Tuesday, etc.)
- Includes exam duration and time slots
- Shows class information (10th/12th)

### **Sorting and Pagination**
- Server-side sorting by date, class, subject name, subject code, duration
- Pagination support for large datasets
- Consistent with other datesheet tabs

### **Statistics**
- Total subjects for the centre
- Class-wise breakdown (10th/12th)
- Number of unique exam dates
- Total candidate count

## User Experience

### **Centre Datesheet Tab**
1. **Click "Centre Datesheet" tab**
2. **System automatically generates** centre-specific datesheet
3. **View filtered results** showing only relevant subjects
4. **Sort and paginate** through the results
5. **See statistics** about centre's exam schedule

### **Information Displayed**
- **Sr No**: Sequential number for each entry
- **Date**: Actual exam date (DD/MM/YYYY format)
- **Day**: Day name (Monday, Tuesday, etc.)
- **Class**: 10th or 12th
- **Subject Name**: Full subject name
- **Subject Code**: CBSE subject code
- **Duration**: Exam duration in hours

### **Empty State**
If no centre datesheet is available:
- Shows informative message explaining the feature
- Guides users to ensure candidates are registered
- Explains that subject choices are required

## Benefits

### **For Examination Centres**
- **Focused View**: Only see relevant exam dates
- **Reduced Complexity**: No need to filter through all subjects
- **Automatic Updates**: Always current with candidate choices
- **Better Planning**: Clear view of centre's exam schedule

### **For Administrators**
- **Accurate Scheduling**: Based on actual candidate needs
- **Resource Planning**: Know exactly which subjects are needed
- **Efficient Management**: Automated generation saves time
- **Data Integrity**: Always synchronized with candidate data

## Integration Points

### **Candidate Management**
- Reads candidate subject choices from the database
- Updates automatically when candidates are modified
- Supports both 10th and 12th class candidates

### **CBSE Datesheet**
- Uses imported CBSE datesheet as the source of truth
- Maintains all original exam information (dates, times, duration)
- Filters based on subject code matching

### **Subject Management**
- Links with subject database for validation
- Ensures subject codes match between systems
- Maintains class and duration information

## Technical Considerations

### **Performance**
- Efficient database queries with proper indexing
- Server-side filtering and sorting
- Pagination to handle large datasets
- Caching of candidate subject choices

### **Data Consistency**
- Real-time synchronization with candidate data
- Automatic updates when underlying data changes
- Proper error handling for missing data

### **Scalability**
- Handles large numbers of candidates efficiently
- Supports multiple examination centres
- Optimized queries for performance

## Future Enhancements

### **Potential Improvements**
1. **Centre-specific Filtering**: Filter by specific examination centre
2. **Date Range Filtering**: Show datesheet for specific date ranges
3. **Export Functionality**: Export centre datesheet to PDF/Excel
4. **Notifications**: Alert when centre datesheet changes
5. **Conflict Detection**: Identify scheduling conflicts for candidates

### **Advanced Features**
1. **Room Allocation Integration**: Link with room allocation system
2. **Invigilator Assignment**: Assign invigilators based on centre datesheet
3. **Resource Planning**: Calculate required resources per centre
4. **Analytics**: Generate reports on centre exam patterns