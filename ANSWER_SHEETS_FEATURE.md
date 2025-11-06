# Answer Sheets Management Feature

## Overview
This feature allows tracking and management of answer sheets received, used, discarded, and balance inventory for examinations.

## Features Implemented

### 1. PDF Template Parsing
- **File**: `client/src/Answer Sheets.pdf`
- **Parser**: `server/src/utils/answerSheetsParser.js`
- Automatically extracts answer sheet specifications from PDF
- Supports 11 different types of answer sheets:
  - Main (32 pages, 20 pages)
  - Graph (40 pages)
  - Supplementary (16 pages)
  - For Blind (32 pages)
  - Drawing Sheets (21 pages)

### 2. Database Model
- **Model**: `server/src/models/AnswerSheet.js`
- **Fields**:
  - `answerSheetType`: Main, Graph, Supplementary, For Blind, Drawing Sheets
  - `pages`: Number of pages (16, 20, 21, 32, 40)
  - `colour`: Red, Blue, Yellow, Pink, White
  - `class`: Any class value (10, 12, 10/12, etc.)
  - `suffix`: Single letter identifier
  - `serialFrom`: Starting serial number (String - preserves leading zeros, e.g., "001245")
  - `serialTo`: Ending serial number (String - preserves leading zeros, e.g., "001500")
  - `total`: Auto-calculated from serial range
  - `used`: Number of sheets used
  - `discarded`: Number of sheets discarded
  - `balance`: Virtual field (total - used - discarded)
  - `sortOrder`: Order as per PDF template (1-11)
  - `exam`: Optional exam name
  - `subject`: Optional subject name
  - `receivedDate`: Date received (auto-set)

**Default Sorting**: Answer sheets are sorted by `sortOrder` (matching PDF template order) then by `receivedDate`

**Serial Number Format**: Serial numbers are stored as strings to preserve leading zeros. Supports formats like:
- `001245` (numeric with leading zeros)
- `1001` (numeric without leading zeros)  
- `A001245` (alphanumeric with leading zeros)
- `O1001` (alphanumeric without leading zeros)

See [ANSWER_SHEETS_SERIAL_NUMBER_FORMAT.md](ANSWER_SHEETS_SERIAL_NUMBER_FORMAT.md) for complete documentation.

### 3. Backend API
- **Routes**: `server/src/routes/answerSheets.js`
- **Controller**: `server/src/controllers/answerSheetController.js`

#### Endpoints:
- `GET /api/answersheets` - Get all answer sheets (with filters)
- `GET /api/answersheets/:id` - Get specific answer sheet
- `POST /api/answersheets` - Create new answer sheet entry
- `PUT /api/answersheets/:id` - Update answer sheet
- `DELETE /api/answersheets/:id` - Soft delete answer sheet
- `POST /api/answersheets/:id/use` - Mark sheets as used
- `POST /api/answersheets/:id/discard` - Mark sheets as discarded
- `GET /api/answersheets/stats/summary` - Get statistics
- `GET /api/answersheets/parse/template` - Parse PDF template

### 4. Frontend Interface
- **Page**: `client/src/pages/AnswerSheets.tsx`
- **Service**: `client/src/services/answerSheetService.ts`

#### Features:
- **Four Tabs**:
  - Received: View all received answer sheets
  - Used: View sheets that have been used
  - Balance: View sheets with remaining balance
  - Discarded: View discarded sheets

- **Actions**:
  - Load from Template: Parse PDF and select answer sheet type
  - Add Received Quantity: Manually add new answer sheet entry
  - Use Sheets: Mark quantity as used
  - Discard Sheets: Mark quantity as discarded
  - Delete Entry: Remove answer sheet entry

- **Statistics Dashboard**:
  - Total Received
  - Total Used
  - Total Balance
  - Total Discarded

### 5. Data Flow

```
1. User clicks "Load from Template"
   ↓
2. Backend parses Answer Sheets.pdf
   ↓
3. Frontend displays template options
   ↓
4. User selects template and fills serial numbers
   ↓
5. Backend auto-calculates total from serial range
   ↓
6. Entry saved to database
   ↓
7. Display in "Received" tab
```

## Seeding Initial Data

To populate the database with all 11 answer sheet types from the PDF template:

```bash
node server/seed-answer-sheets.js
```

This will add:
- 2 types of Main 32-page sheets (Red/Blue for Class 10/12) - 1000 sheets
- 2 types of Main 20-page sheets (Red/Blue for Class 10/12) - 550 sheets
- 2 types of Graph 40-page sheets (Red/Blue for Class 10/12) - 350 sheets
- 2 types of Supplementary 16-page sheets (Yellow/Pink for Class 10/12) - 200 sheets
- 2 types of For Blind 32-page sheets (Red/Blue for Class 10/12) - 100 sheets
- 1 type of Additional Sheets 21-page (White for Class 10/12) - 200 sheets

**Total: 2,400 answer sheets across 11 types**

## Usage Instructions

### Adding Answer Sheets

1. **From Template**:
   - Click "Load from Template" button
   - Select the answer sheet type from the list
   - Enter serial number range (From/To)
   - Optionally add exam and subject
   - Click "Add Quantity"

2. **Manual Entry**:
   - Click "Add Received Quantity" button
   - Fill all required fields:
     - Answer Sheet Type
     - Pages
     - Colour
     - Class
     - Serial Number From
     - Serial Number To
   - Click "Add Quantity"

### Managing Answer Sheets

1. **Mark as Used**:
   - Go to any tab
   - Click "Use" button on an entry
   - Enter quantity to mark as used

2. **Mark as Discarded**:
   - Go to any tab
   - Click "Discard" button on an entry
   - Enter quantity to discard

3. **Delete Entry**:
   - Go to "Received" tab
   - Click "Delete" button on an entry
   - Confirm deletion

### Viewing Statistics

- Statistics are automatically calculated and displayed at the top
- Click on any statistic card to filter entries by that category

## Testing

Run the test script to verify functionality:

```bash
node server/test-answer-sheets.js
```

This will:
1. Parse the PDF template
2. Create sample entries
3. Test using and discarding sheets
4. Generate statistics

## Files Created/Modified

### New Files:
- `server/src/models/AnswerSheet.js`
- `server/src/controllers/answerSheetController.js`
- `server/src/routes/answerSheets.js`
- `server/src/utils/answerSheetsParser.js`
- `client/src/services/answerSheetService.ts`
- `server/test-answer-sheets.js`
- `server/analyze-answer-sheets-pdf.js`
- `server/seed-answer-sheets.js`
- `test-answer-sheets-api.html`

### Modified Files:
- `server/src/app.js` - Added answer sheets routes
- `client/src/pages/AnswerSheets.tsx` - Integrated with backend

## Database Schema

```javascript
{
  answerSheetType: String (enum),
  pages: Number,
  colour: String (enum),
  class: String,
  suffix: String,
  serialFrom: String,
  serialTo: String,
  total: Number (auto-calculated),
  used: Number (default: 0),
  discarded: Number (default: 0),
  sortOrder: Number (default: 999),
  receivedDate: Date (default: now),
  exam: String (optional),
  subject: String (optional),
  notes: String (optional),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

**Sorting**: Results are sorted by `sortOrder` (ascending) then `receivedDate` (descending)

## Future Enhancements

1. **Bulk Import**: Import multiple entries from Excel/CSV
2. **Reports**: Generate PDF reports of answer sheet usage
3. **Alerts**: Notify when balance is low
4. **History**: Track all changes to answer sheet entries
5. **Barcode Scanning**: Scan serial numbers for faster entry
6. **Integration**: Link with exam scheduling and room allocation
