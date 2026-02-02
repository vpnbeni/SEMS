# Answer Sheets - Centre Datesheet Linking Flow

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CBSE DATESHEET                              │
│  (Imported from PDF)                                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Entry 1: 15 Feb 2025 - Class 10 - Math (041)            │  │
│  │ Entry 2: 16 Feb 2025 - Class 12 - Physics (042)         │  │
│  │ Entry 3: 17 Feb 2025 - Class 10 - Science (086)         │  │
│  │ ...                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Filter by
                              │ Candidate Subjects
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CENTRE DATESHEET ENTRIES                       │
│  (Only exams with candidates)                                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Entry 1: 15 Feb - Class 10 - Math (041)                 │  │
│  │          45 candidates, 2 rooms                          │  │
│  │                                                          │  │
│  │ Entry 2: 17 Feb - Class 10 - Science (086)              │  │
│  │          42 candidates, 2 rooms                          │  │
│  │ ...                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User selects
                              │ when marking as used
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ANSWER SHEET ENTRY                          │
│  (Marked as Used with Linking)                                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Answer Sheet: Main - 32 Pages - Blue - Class 10         │  │
│  │ Serial: 001001 to 001500 (500 sheets)                   │  │
│  │ Used: 50 sheets                                          │  │
│  │                                                          │  │
│  │ LINKED TO:                                               │  │
│  │ ├─ Exam Date: 15 Feb 2025                               │  │
│  │ ├─ Subject: 041 - MATHEMATICS STANDARD                  │  │
│  │ ├─ Class: 10                                            │  │
│  │ └─ Candidates: 45                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## User Interaction Flow

```
┌─────────────────┐
│  Answer Sheets  │
│      Page       │
└────────┬────────┘
         │
         │ User clicks "Use" button
         ▼
┌─────────────────┐
│  Enter Quantity │
│     Prompt      │
└────────┬────────┘
         │
         │ User enters quantity (e.g., 50)
         ▼
┌─────────────────────────────────────────┐
│         Link to Exam Modal              │
│                                         │
│  Select Exam (Optional):                │
│  ┌────────────────────────────────────┐ │
│  │ -- Skip linking --                 │ │
│  │ 15 Feb - Sat - Class 10 - 041 Math│ │
│  │ 16 Feb - Sun - Class 12 - 042 Phy │ │
│  │ 17 Feb - Mon - Class 10 - 086 Sci │ │
│  └────────────────────────────────────┘ │
│                                         │
│  [Cancel]  [Confirm & Mark as Used]    │
└─────────────────────────────────────────┘
         │
         │ User selects exam and confirms
         ▼
┌─────────────────────────────────────────┐
│      Backend Processing                 │
│                                         │
│  1. Update answer sheet:                │
│     - used += quantity                  │
│     - linkedExamDate = selected date    │
│     - linkedSubjectCode = subject code  │
│     - linkedSubjectName = subject name  │
│     - linkedCandidateCount = count      │
│                                         │
│  2. Save to database                    │
└─────────────────────────────────────────┘
         │
         │ Success
         ▼
┌─────────────────────────────────────────┐
│         Used Tab Display                │
│                                         │
│  Sr | Date    | Class | Code | Subject │
│  ───┼─────────┼───────┼──────┼─────────│
│  1  | 15 Feb  | 10    | 041  | Math    │
│  2  | 17 Feb  | 10    | 086  | Science │
│  3  | -       | 12    | -    | -       │
│                                         │
│  (Row 3 was marked as used without     │
│   linking - shows "-" in detail cols)  │
└─────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                    AnswerSheet Model                        │
├─────────────────────────────────────────────────────────────┤
│ Basic Fields:                                               │
│  - answerSheetType: String (Main, Graph, etc.)             │
│  - pages: Number                                            │
│  - colour: String                                           │
│  - class: String                                            │
│  - serialFrom: String                                       │
│  - serialTo: String                                         │
│  - total: Number (calculated)                               │
│  - used: Number                                             │
│  - discarded: Number                                        │
│                                                             │
│ NEW - Linking Fields:                                       │
│  - centreDatesheetEntry: ObjectId (ref: CBSEDatesheet)     │
│  - linkedExamDate: Date                                     │
│  - linkedSubjectCode: String                                │
│  - linkedSubjectName: String                                │
│  - linkedCandidateCount: Number                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ References
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  CBSEDatesheet Model                        │
├─────────────────────────────────────────────────────────────┤
│  - title: String                                            │
│  - academicYear: String                                     │
│  - totalEntries: Number                                     │
│  - entries: [                                               │
│      {                                                      │
│        examDate: Date                                       │
│        dayName: String                                      │
│        subject: {                                           │
│          code: String                                       │
│          name: String                                       │
│          class: String                                      │
│          duration: Number                                   │
│        }                                                    │
│        timeSlot: { start: String, end: String }            │
│        answerSheet: String                                  │
│      }                                                      │
│    ]                                                        │
└─────────────────────────────────────────────────────────────┘
```

## API Request/Response Flow

### 1. Get Centre Datesheet Entries

**Request:**
```http
GET /api/centre-datesheet/entries
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65abc123...",
      "examDate": "2025-02-15T00:00:00.000Z",
      "dayName": "SATURDAY",
      "subjectCode": "041",
      "subjectName": "MATHEMATICS STANDARD",
      "class": "10",
      "timeSlot": {
        "start": "10:30 AM",
        "end": "01:30 PM"
      },
      "duration": 180,
      "candidateCount": 45,
      "roomsNeeded": 2
    }
  ],
  "count": 15
}
```

### 2. Mark Answer Sheets as Used (with linking)

**Request:**
```http
POST /api/answersheets/65xyz789.../use
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 50,
  "centreDatesheetEntryId": "65abc123...",
  "examDate": "2025-02-15T00:00:00.000Z",
  "subjectCode": "041",
  "subjectName": "MATHEMATICS STANDARD",
  "candidateCount": 45
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65xyz789...",
    "answerSheetType": "Main",
    "pages": 32,
    "colour": "Blue",
    "class": "10",
    "serialFrom": "001001",
    "serialTo": "001500",
    "total": 500,
    "used": 50,
    "discarded": 0,
    "centreDatesheetEntry": "65abc123...",
    "linkedExamDate": "2025-02-15T00:00:00.000Z",
    "linkedSubjectCode": "041",
    "linkedSubjectName": "MATHEMATICS STANDARD",
    "linkedCandidateCount": 45
  }
}
```

## Component Hierarchy

```
AnswerSheets.tsx
├── State Management
│   ├── entries (answer sheets)
│   ├── centreDatesheetEntries (exams)
│   ├── linkingEntry (current linking operation)
│   └── selectedDatesheetEntry (selected exam)
│
├── Data Fetching
│   ├── fetchAnswerSheets()
│   └── fetchCentreDatesheet()
│
├── Event Handlers
│   ├── handleUseSheets() - Opens link modal
│   └── handleConfirmUseSheets() - Saves with linking
│
└── UI Components
    ├── Status Overview (Received, Used, Balance, Discarded)
    ├── Data Table
    │   ├── Received Tab (with Edit functionality)
    │   └── Other Tabs (with new columns for Used tab)
    │
    └── Modals
        ├── Upload Excel Modal
        ├── Add Quantity Modal
        └── Link to Exam Modal (NEW)
            ├── Exam Dropdown
            ├── Exam Details Panel
            └── Confirm/Cancel Buttons
```

## Key Features

### 1. Optional Linking
- Users can skip linking and still mark sheets as used
- Provides flexibility for different workflows

### 2. Cached Data
- Exam details are cached in answer sheet document
- Improves query performance
- Maintains data consistency

### 3. Candidate Count Calculation
- Automatically calculated from candidate-subject relationships
- Updates when candidates are added/removed
- Shows in real-time in the modal

### 4. Room Calculation
- Rooms needed = Math.ceil(candidateCount / 24)
- Standard exam room capacity of 24 students
- Helps with exam planning

### 5. Filtered Entries
- Only shows exams with candidates
- Reduces clutter in dropdown
- Makes selection easier
