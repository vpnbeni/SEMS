# School Name Extraction from PDF

## Overview
Enhanced the PDF parsing functionality to extract and link school names with candidate roll numbers. This is essential for exam centres that have students appearing from multiple schools.

## Changes Made

### 1. Candidate Model (`server/src/models/Candidate.js`)
Added `schoolName`, `schoolCode`, and `class` fields to store the school information and class level associated with each candidate:
```javascript
schoolName: {
  type: String,
  trim: true,
  maxlength: [200, 'School name cannot exceed 200 characters']
},
schoolCode: {
  type: String,
  trim: true,
  maxlength: [20, 'School code cannot exceed 20 characters']
},
class: {
  type: String,
  enum: ['10th', '12th', ''],
  default: ''
}
```

### 2. PDF Parsing Logic (`server/src/controllers/candidateController.js`)
Enhanced the `extractCandidatesFromText` function to:

- **Track School Names and Codes**: Added pattern matching to detect school/centre information with codes in the PDF
  ```javascript
  const schoolPattern = /(?:CENTRE|SCHOOL)\s*[:：-]\s*(\d+)\s+(.+?)(?:ROHTAK|$)/i;
  ```
  This pattern captures:
  - Group 1: School code (e.g., "827403", "40442")
  - Group 2: School name (e.g., "INTL BHARTI SCHOOL GOHANA ROAD")

- **Track Class Level**: Added pattern matching to detect examination type (Secondary/Senior Secondary)
  ```javascript
  const classPattern = /(?:SECONDARY|SENIOR\s+SECONDARY)\s+SCHOOL\s+EXAMINATION/i;
  ```

- **Maintain Context**: Tracks the current school name, school code, and class as it parses through the PDF
  ```javascript
  let currentSchoolName = '';
  let currentSchoolCode = '';
  let currentClass = '';
  ```

- **Link to Candidates**: Associates each candidate with the most recently encountered school name, code, and class
  ```javascript
  candidate.schoolName = currentSchoolName;
  candidate.schoolCode = currentSchoolCode;
  candidate.class = currentClass;
  ```

- **Class Detection Logic**:
  - "SECONDARY SCHOOL EXAMINATION" → 10th class
  - "SENIOR SECONDARY SCHOOL EXAMINATION" → 12th class

### 3. Test File (`server/test-pdf-parsing.js`)
Updated the test file to display school names when testing PDF parsing.

## How It Works

1. **School Detection**: As the parser reads through the PDF, it looks for lines containing "CENTRE" or "SCHOOL" keywords followed by the school code and name
   - Example: `CENTRE : 827403 INTL BHARTI SCHOOL GOHANA ROAD`
   - Extracts: 
     - School Code: `827403`
     - School Name: `INTL BHARTI SCHOOL GOHANA ROAD`

2. **Context Tracking**: Once a school code and name are found, they're stored and used for all subsequent candidates until a new school is encountered

3. **Candidate Association**: Each candidate record now includes:
   - Roll number
   - Name
   - School code
   - School name
   - Class level
   - Subject codes
   - All other existing fields (mother name, father name, DOB, etc.)

## Example Output

When parsing a PDF with multiple schools and classes:

```
Class: 10th
School: 827403 - INTL BHARTI SCHOOL GOHANA ROAD
- Roll: 17248737, Name: AKHIL DAHIYA REKHA
- Roll: 17248738, Name: ANJALI NISHA

Class: 12th
School: 40442 - THE SANSKRITI SCHOOL GOHANA ROAD
- Roll: 17248750, Name: STUDENT NAME
- Roll: 17248751, Name: ANOTHER STUDENT
```

## Testing

To test the enhanced parsing:

```bash
cd server
node test-pdf-parsing.js
```

The output will now show the school name for each candidate.

## API Response

When importing candidates from PDF, the response now includes school codes, names, and class information:

```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "rollNumber": "17248737",
        "name": "AKHIL DAHIYA REKHA",
        "schoolCode": "827403",
        "schoolName": "INTL BHARTI SCHOOL GOHANA ROAD",
        "class": "10th",
        "subjectCodes": [
          { "code": "184", "medium": "" },
          { "code": "002", "medium": "" },
          { "code": "041", "medium": "1" }
        ]
      }
    ]
  }
}
```

## Frontend Display

### School Name and Code
The school code and name are displayed on the `/candidates` page in the Subject Codes column:

- School code appears in bold with primary color before the school name
- School name appears with a 🏫 icon
- Separated by a border for clear visual distinction
- Only shown when school information is available

Example display:
```
🏫 827403 INTL BHARTI SCHOOL GOHANA ROAD
─────────────────────────────────────────
184  002  041 (1)  086 (1)  087 (1)
```

### Class Column
A new "Class" column has been added to the candidates table:

- Displays as a colored badge:
  - **10th** - Green badge (bg-green-100)
  - **12th** - Purple badge (bg-purple-100)
- Shows "-" if class information is not available
- Positioned between "Candidate Info" and "Parents" columns

## Benefits

1. **Multi-School Support**: Exam centres can now properly track which school each candidate belongs to
2. **Unique School Identification**: School codes provide a unique identifier for each school
3. **Class Identification**: Automatically detects and displays whether students are in 10th or 12th class
4. **Better Organization**: Easy filtering and grouping of candidates by school code, school name, and class
5. **Accurate Records**: Maintains the relationship between roll numbers, school codes, school names, and class levels as shown in the official PDF
6. **Reporting**: Enables school-wise and class-wise reports and statistics
7. **Visual Clarity**: School code (in bold primary color), school name, and class are prominently displayed for easy identification
8. **Color-Coded Badges**: Class information is displayed with distinct colors (green for 10th, purple for 12th)
9. **Data Integrity**: School codes ensure accurate linking of candidates to their respective schools
