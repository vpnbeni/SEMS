# Subject Import System

## Overview
The subject import system allows importing CBSE subjects from a PDF file. The system properly handles:
- Same subject codes across different classes (10th and 12th)
- Same subject names with different codes for different classes
- Unique constraint on code + class combination

## Database Schema Changes

### Unique Index
Changed from single field unique constraint to compound unique constraint:
- **Old**: `code` (unique)
- **New**: `code + class` (unique compound index)

This allows subjects like:
- Code `002` - "HINDI COURSE - A" (10th)
- Code `002` - "HINDI ELECTIVE" (12th)

Both can exist in the database without conflicts.

## PDF Format Expected

The system expects CBSE subject list format:
```
SubCode | SubjectName | Class | Duration(Hours) | AnswerSheet
002     | HINDI COURSE - A | 10th | 3 | 32 Pages
002     | HINDI ELECTIVE   | 12th | 3 | 32 Pages
```

## Answer Sheet Types

The system automatically detects and maps answer sheet types:
- `32 Pages` → `32_pages`
- `20 Pages` → `20_pages`
- `40 Graph` → `40_graph`
- Others → `none`

## API Endpoint

### Import Subjects from PDF
**POST** `/api/subjects/import-pdf`

**Headers:**
- `Authorization: Bearer <token>`

**Body (multipart/form-data):**
- `file`: PDF file containing CBSE subjects

**Response:**
```json
{
  "success": true,
  "message": "Subjects import completed",
  "data": {
    "total": 204,
    "inserted": 14,
    "updated": 190,
    "skipped": 0,
    "errors": 0,
    "details": {
      "inserted": [...],
      "updated": [...],
      "skipped": [],
      "errors": []
    },
    "pdfUrl": "https://cloudinary.com/..."
  }
}
```

## Import Behavior

1. **New Subjects**: Creates new subject records
2. **Existing Subjects**: Updates name, duration, and answer sheet type
3. **Duplicates**: Skips if code+class combination already exists
4. **Errors**: Reports any validation or database errors

## Statistics from Current Import

- **Total Subjects**: 204
- **Class 10th**: 83 subjects
- **Class 12th**: 121 subjects
- **Subjects with same code across classes**: 14

Examples of subjects with same code:
- Code `002`: HINDI COURSE - A (10th) + HINDI ELECTIVE (12th)
- Code `003`: URDU COURSE - A (10th) + URDU ELECTIVE (12th)
- Code `031`: CAR. MUSIC (VOCAL) in both classes
- Code `032`: CAR. MUSIC MEL. INS. in both classes
- Code `033`: CAR. MUSIC PER. INS. in both classes

## Migration Script

If you have existing subjects with the old unique constraint, run:
```bash
node server/migrate-subject-indexes.js
```

This will:
1. Drop the old `code_1` unique index
2. Create the new `code_1_class_1` compound unique index

## Testing

Test the import functionality:
```bash
node server/test-subject-import.js
```

This will:
1. Parse the PDF
2. Extract all subjects
3. Import to database
4. Show statistics and any errors
