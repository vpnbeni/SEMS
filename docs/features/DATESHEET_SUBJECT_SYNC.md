# Datesheet Subject Synchronization

## Problem
When updating a subject name or code in the Subject collection, the changes were not reflected in the CBSE Datesheet because the datesheet stores subject information as embedded documents rather than references.

## Solution Implemented

### 1. Automatic Synchronization Hooks
Added post-save hooks to the Subject model (`server/src/models/Subject.js`) that automatically update all related datesheet entries when a subject is modified:

- **Post-save hook**: Triggers after `subject.save()` is called
- **Post-findOneAndUpdate hook**: Triggers after `Subject.findOneAndUpdate()` is called

These hooks update the following fields in datesheet entries:
- `entries.$[].subject.name`
- `entries.$[].subject.duration`

The hooks match entries by:
- Subject code
- Subject class (10th or 12th)

### 2. Manual Sync Script
Created `server/sync-subjects-to-datesheet.js` to manually sync all existing datesheet entries with the current subject data.

**Usage:**
```bash
node server/sync-subjects-to-datesheet.js
```

**What it does:**
- Fetches all active subjects from the Subject collection
- Fetches the active CBSE datesheet
- Compares each datesheet entry with the master subject data
- Updates any mismatched names or durations
- Reports the number of updates made

### 3. Initial Sync Results
Successfully synchronized 203 datesheet entries, including:
- Subject code 843 (12th): "ARTICICIAL INTELLIGENCE" → "Artificial Intelligence"
- All other subjects with formatting differences (e.g., "HINDI COURSE - A" → "Hindi Course - A")

## How It Works

### Automatic Updates (Going Forward)
When you update a subject in the Subjects page:
1. The subject is saved to the database
2. The post-save hook automatically triggers
3. All matching datesheet entries are updated
4. Changes appear immediately in the datesheet

### Manual Sync (For Existing Data)
If you need to sync existing data or fix inconsistencies:
1. Run the sync script: `node server/sync-subjects-to-datesheet.js`
2. The script will report all changes made
3. Refresh the datesheet page to see updates

## Technical Details

### Database Query Used
```javascript
await CBSEDatesheet.updateMany(
  {
    'entries.subject.code': subjectCode,
    'entries.subject.class': subjectClass
  },
  {
    $set: {
      'entries.$[elem].subject.name': newName,
      'entries.$[elem].subject.duration': newDuration
    }
  },
  {
    arrayFilters: [
      { 
        'elem.subject.code': subjectCode,
        'elem.subject.class': subjectClass
      }
    ],
    multi: true
  }
);
```

### Fields Synchronized
- ✅ Subject Name
- ✅ Subject Duration
- ❌ Subject Code (not synchronized to prevent breaking references)
- ❌ Subject Class (not synchronized to prevent breaking references)

## Benefits
1. **Consistency**: Subject data is always consistent across the system
2. **Automatic**: No manual intervention needed for updates
3. **Real-time**: Changes reflect immediately
4. **Safe**: Only updates matching entries, doesn't affect other data
5. **Logged**: All updates are logged to the console for tracking

## Notes
- Subject code and class are used as identifiers and should not be changed after datesheet import
- If you need to change a subject code, you'll need to re-import the datesheet
- The sync is one-way: Subject → Datesheet (not the other way around)
