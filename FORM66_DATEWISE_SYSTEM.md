# Form 66 Date-wise System

## Overview
Form 66 PDF contains date-wise roll numbers of candidates for each exam. The system now stores and organizes this data by exam date and subject, making it easy to link with seating plans.

## Data Structure

### Form 66 Model Fields
```javascript
{
  rollNo: String,           // Candidate roll number
  centreNo: String,         // Centre number (e.g., "827403")
  centreName: String,       // Centre name
  examDate: String,         // Exam date in DD.MM.YYYY format
  subjectCode: String,      // Subject code (e.g., "184")
  subject: String,          // Subject name (e.g., "ENGLISH")
  class: String,            // Class X or XII
  candidateName: String,    // Optional
  isActive: Boolean         // Soft delete flag
}
```

### Indexes
- `examDate + subjectCode` - For efficient date and subject queries
- `rollNo` - For quick roll number lookups

## API Endpoints

### 1. Upload Form 66 PDF
```
POST /api/form66/upload
Content-Type: multipart/form-data

Body: { file: <PDF file> }
```

### 2. Get All Records
```
GET /api/form66/records
Returns: Array of all Form 66 records sorted by date and roll number
```

### 3. Get Unique Exam Dates
```
GET /api/form66/dates
Returns: Array of unique exam dates in DD.MM.YYYY format
Example: ["15.02.2025", "17.02.2025", "19.02.2025"]
```

### 4. Get Subjects for a Date
```
GET /api/form66/dates/:date/subjects
Example: GET /api/form66/dates/15.02.2025/subjects
Returns: [
  { code: "184", name: "ENGLISH (LANGUAGE AND LITERATURE)", count: 315 },
  { code: "041", name: "MATHEMATICS", count: 280 }
]
```

### 5. Get Records by Date
```
GET /api/form66/dates/:date/records
Example: GET /api/form66/dates/15.02.2025/records
Returns: Array of all records for that date
```

### 6. Get Records by Date and Subject
```
GET /api/form66/dates/:date/subjects/:subjectCode/records
Example: GET /api/form66/dates/15.02.2025/subjects/184/records
Returns: Array of records for specific date and subject
```

## Integration with Seating Plan

### How It Works
1. **Form 66 Upload**: Admin uploads Form 66 PDF containing date-wise roll numbers
2. **Data Extraction**: System extracts:
   - Exam dates
   - Subject codes and names
   - Roll number ranges
   - Centre information
3. **Storage**: Each roll number is stored with its exam date and subject
4. **Seating Plan Generation**: When generating seating plan for a specific date/subject:
   ```javascript
   // In seatingPlanBuilder.js
   const form66Records = await Form66.find({
     examDate: entry.examDate,
     subjectCode: entry.subject.code,
     isActive: true
   }).sort({ rollNo: 1 });
   ```

### Seating Plan Builder Logic
The `seatingPlanBuilder.js` already uses Form 66 data:

```javascript
// Get Form 66 records for this exam date and subject
const form66Records = await Form66.find({
  examDate: entry.examDate,
  subjectCode: entry.subject.code,
  isActive: true
}).sort({ rollNo: 1 });

// If no Form 66 records, fall back to candidates
if (form66Records.length === 0) {
  candidates = await Candidate.find({
    class: entry.class,
    subjects: entry.subject.code,
    isActive: true
  }).sort({ rollNo: 1 });
}
```

## PDF Format Example

```
SECONDARY SCHOOL CERTIFICATE EXAMINATION 2025
**CBSE-66/ CENTRE MEMO**

CENTRE - 827403 INTL BHARTI SCHOOL GOHANA ROAD ROHTAK HARYANA

DATE OF  SUBJECT DESCRIPTION
EXAM

15.02.2025 184 ENGLISH (LANGUAGE AND LITERATURE)
                17248737-17248800  64 I
                17248801-17248900 100 I
                17248901-17249000 100 I
                17249001-17249051  51 I
                
** SUBJECT-TOTAL**                315 I
```

## Parser Logic

### Key Features
1. **Centre Detection**: Extracts centre number and name
2. **Date & Subject Parsing**: Identifies exam date and subject details
3. **Roll Range Expansion**: Converts ranges (e.g., 17248737-17248800) to individual roll numbers
4. **Subject Totals**: Recognizes section boundaries

### Example Parsing Flow
```
Input: "17248737-17248800  64 I"
Output: 64 individual records with roll numbers from 17248737 to 17248800
Each record includes:
- rollNo: "17248737", "17248738", ..., "17248800"
- examDate: "15.02.2025"
- subjectCode: "184"
- subject: "ENGLISH (LANGUAGE AND LITERATURE)"
- class: "XII" (detected from subject code)
```

## Usage Workflow

### 1. Upload Form 66
- Navigate to Form 66 page
- Click "Upload Form 66 (.pdf)"
- Select PDF file
- System automatically parses and stores data

### 2. View Date-wise Data
- Records are displayed sorted by exam date
- Each record shows: Roll No, Exam Date, Subject, Class

### 3. Generate Seating Plan
- Go to Seating Plan page
- Select exam date from CBSE datesheet
- System automatically fetches Form 66 records for that date
- Generates seating arrangement using actual roll numbers

## Benefits

1. **Accurate Roll Numbers**: Uses official Form 66 data instead of candidate database
2. **Date-wise Organization**: Easy to find candidates for specific exam dates
3. **Subject Filtering**: Can filter by subject code for multi-subject exams
4. **Automatic Integration**: Seating plans automatically use Form 66 data when available
5. **Fallback Support**: Falls back to candidate database if Form 66 data not available

## Testing

### Test PDF Parsing
```bash
cd server
node test-form66-pdf.js
```

Place a sample Form 66 PDF at `server/sample-form66.pdf` before running.

### Test API Endpoints
```bash
# Get all dates
curl http://localhost:5000/api/form66/dates

# Get subjects for a date
curl http://localhost:5000/api/form66/dates/15.02.2025/subjects

# Get records for date and subject
curl http://localhost:5000/api/form66/dates/15.02.2025/subjects/184/records
```

## Notes

- Date format is DD.MM.YYYY (e.g., "15.02.2025")
- Subject codes are numeric strings (e.g., "184", "041")
- Class detection: Codes 1-99 = Class X, 100+ = Class XII
- Records are soft-deleted (isActive flag) for data integrity
