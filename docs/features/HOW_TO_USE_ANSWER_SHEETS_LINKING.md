# How to Use Answer Sheets - Centre Datesheet Linking

## Current Status (Based on Diagnosis)

✅ **Answer Sheets**: 8 sheets available (none used yet)
✅ **CBSE Datesheet**: Imported with 203 entries  
❌ **Candidates**: No candidates in system

## Step-by-Step Guide

### Step 1: Add Candidates (Required for Linking)

The linking feature requires candidates with subjects to work properly.

1. Go to **Candidates** page
2. Click **"Add Candidate"** or **"Import Candidates"**
3. Add candidate details including:
   - Name
   - Roll Number
   - Class (10 or 12)
   - **Subjects** (Important!)

**Why?** The centre datesheet is filtered to only show exams that your candidates are taking. Without candidates, there are no exams to link to.

### Step 2: Mark Answer Sheets as Used

Once you have candidates (or if you want to skip linking):

1. Go to **Answer Sheets** page
2. Click on **"Received"**, **"Balance"**, or **"Discarded"** tab
3. Find an answer sheet entry
4. Click the **"Use"** button
5. Enter the quantity to mark as used (e.g., 50)

**Two Options:**

#### Option A: With Linking (Recommended)
6. A modal will appear showing available exams
7. Select an exam from the dropdown
8. View exam details (date, subject, candidates)
9. Click **"Confirm & Mark as Used"**

#### Option B: Without Linking
6. In the modal, select **"-- Skip linking --"**
7. Click **"Confirm & Mark as Used"**

### Step 3: View Used Answer Sheets

1. Click on the **"Used"** tab
2. You'll see all answer sheets marked as used
3. If linked, you'll see:
   - Date of exam
   - Class
   - Subject Code
   - Subject Name
   - Number of Candidates
4. If not linked, these columns will show "-"

## Current Available Answer Sheets

Based on the diagnosis, you have these answer sheets ready to use:

| Type | Class | Total Available |
|------|-------|----------------|
| Main | 10 | 1,350 sheets |
| Main | 12 | 900 sheets |
| Main | 10 | 350 sheets |
| Main | 12 | 130 sheets |
| Graph | 10 | 340 sheets |

## Why is the "Used" Tab Empty?

The "Used" tab shows answer sheets that have been **marked as used**. Currently:
- ✅ You have 8 answer sheet entries
- ❌ None have been marked as "used" yet
- ❌ Therefore, the "Used" tab is empty

**Action**: Click the "Use" button on any answer sheet to mark it as used.

## Why is the Link Modal Empty?

The link modal shows exams from the centre datesheet. Currently:
- ✅ CBSE datesheet exists (203 entries)
- ❌ No candidates in the system
- ❌ Centre datesheet is filtered to only show exams with candidates
- ❌ Therefore, the link modal will be empty

**Action**: Add candidates with subjects to see exams in the link modal.

## Quick Test Without Candidates

If you want to test the feature without adding candidates:

1. Go to Answer Sheets page
2. Click "Use" on any answer sheet
3. Enter quantity (e.g., 50)
4. Select "-- Skip linking --" in the modal
5. Click "Confirm & Mark as Used"
6. Go to "Used" tab
7. You'll see the entry with "-" in the detail columns

## Full Test With Candidates

For the complete experience:

1. **Add Candidates**:
   - Go to Candidates page
   - Add at least one candidate
   - Link subjects to the candidate (e.g., Mathematics, Science)

2. **Mark Answer Sheets as Used**:
   - Go to Answer Sheets page
   - Click "Use" on an answer sheet
   - Select an exam from the dropdown
   - Confirm

3. **View Results**:
   - Go to "Used" tab
   - See the linked exam details

## Troubleshooting

### "No answer sheets found for this category"
**Cause**: No answer sheets have been marked as used yet  
**Solution**: Click "Use" button on answer sheets in other tabs

### Link modal shows "-- Skip linking --" only
**Cause**: No candidates with subjects in the system  
**Solution**: Add candidates and link subjects to them

### Used tab shows "-" in detail columns
**Cause**: Answer sheets were marked as used without linking  
**Solution**: This is normal if you skipped linking. Future entries can be linked.

## Benefits of Linking

When you link answer sheets to exams:
- ✅ Track which sheets were used for which exam
- ✅ See candidate counts per exam
- ✅ Better audit trail
- ✅ Link sheets to specific dates and subjects
- ✅ Calculate rooms needed per exam

## Next Steps

1. **Immediate**: Mark some answer sheets as used (with or without linking)
2. **Recommended**: Add candidates with subjects for full functionality
3. **Optional**: Run diagnostic script to verify setup:
   ```bash
   node server/diagnose-answer-sheets-linking.js
   ```

## Summary

The feature is working correctly! The "Used" tab is empty because:
1. No answer sheets have been marked as "used" yet
2. You need to click the "Use" button first

The linking feature requires candidates to work, but you can still mark answer sheets as used without linking.
