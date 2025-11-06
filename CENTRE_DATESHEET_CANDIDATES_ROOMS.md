# Datesheet UI Enhancements

## Overview
Enhanced the datesheet tables with new columns, color highlighting, and improved sorting functionality.

## Changes Made

### Backend (server/src/controllers/datesheetController.js)
- Modified the `getCentreDatesheet` controller to calculate and include:
  - `candidateCount`: Number of candidates registered for each subject
  - `roomsNeeded`: Number of rooms required (calculated as 1 room per 24 candidates)

### Frontend (client/src/pages/DateSheets.tsx)
- Added `candidateCount` and `roomsNeeded` fields to table row data for centre datesheet tabs
- Added two new table header columns: "Candidates" and "Rooms"
- Added corresponding table body cells to display the values
- These columns are only visible for centre datesheet tabs (Centre, Centre 10th, Centre 12th)

## Room Calculation Logic
- Standard exam room capacity: 24 candidates per room
- Formula: `Math.ceil(candidateCount / 24)`
- Example: 50 candidates = 3 rooms (24 + 24 + 2)

## Display Behavior
The new columns appear only in:
- Centre Datesheet tab
- Centre 10th Datesheet tab
- Centre 12th Datesheet tab

They do NOT appear in the Full Datesheet tab, as that shows all CBSE subjects regardless of candidate enrollment.

## Color Highlighting
All datesheet rows (Full Datesheet, Centre Datesheet, Centre 10th, and Centre 12th) are color-coded by class with light backgrounds and dark text:

- **Class 10th exams**: 
  - Light mode: Light green background (bg-green-100) with dark green text (text-green-800)
  - Dark mode: Dark green background (bg-green-900/30) with light green text (text-green-200)
  
- **Class 12th exams**: 
  - Light mode: Light purple background (bg-purple-100) with dark purple text (text-purple-800)
  - Dark mode: Dark purple background (bg-purple-900/30) with light purple text (text-purple-200)

This visual distinction helps quickly identify which exams belong to which class level across all datesheet views. The text is displayed in a medium font weight for better readability.

## Default Sorting
All datesheet tabs now default to sorting by date in ascending order:
- **Full Datesheet**: Server-side sorting by date (ascending)
- **Centre Datesheet**: Client-side sorting by date (ascending)
- **Centre 10th Datesheet**: Client-side sorting by date (ascending)
- **Centre 12th Datesheet**: Client-side sorting by date (ascending)

When users click on a column header to sort:
1. First click: Sort ascending by that column
2. Second click: Sort descending by that column
3. Third click: Reset to default (date ascending)

This ensures exams are always displayed in chronological order by default, making it easy to see the exam schedule timeline.
