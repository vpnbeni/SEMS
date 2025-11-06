# Excel Upload Instructions for Answer Sheets

## Quick Start Guide

### Step 1: Download Template
1. Click the **"Download Template"** button
2. Save the `Answer_Sheets_Template.xlsx` file to your computer
3. Open the file in Microsoft Excel or Google Sheets

### Step 2: Fill in Serial Numbers
The template comes pre-filled with all answer sheet types. You only need to fill in:

**Required Columns:**
- **Serial From**: Starting serial number (e.g., `1001` or `001001`)
- **Serial To**: Ending serial number (e.g., `1500` or `001500`)

**Optional Columns:**
- **Exam**: Exam name (e.g., `Annual Examination 2025`)
- **Subject**: Subject name (e.g., `All Subjects`)

### Step 3: Upload Filled Template
1. Save your changes in Excel
2. Click the **"Upload Excel"** button
3. Select your filled Excel file
4. Click **"Upload & Import"**
5. Wait for success message

## Template Structure

| Sr No | Type | Pages | Class | Colour | Suffix | Serial From | Serial To | Exam | Subject |
|-------|------|-------|-------|--------|--------|-------------|-----------|------|---------|
| 1 | Main | 32 | 10 | Red | O | **[FILL THIS]** | **[FILL THIS]** | Optional | Optional |
| 2 | Main | 32 | 12 | Blue | P | **[FILL THIS]** | **[FILL THIS]** | Optional | Optional |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

## Example: Filled Template

| Sr No | Type | Pages | Class | Colour | Suffix | Serial From | Serial To | Exam | Subject |
|-------|------|-------|-------|--------|--------|-------------|-----------|------|---------|
| 1 | Main | 32 | 10 | Red | O | **1001** | **1500** | Term 1 | All Subjects |
| 2 | Main | 32 | 12 | Blue | P | **2001** | **2500** | Term 1 | All Subjects |
| 3 | Main | 20 | 10 | Red | A | **3001** | **3300** | Term 1 | All Subjects |

## Serial Number Format

Serial numbers support multiple formats:
- `1001` - Simple numeric
- `001001` - With leading zeros (preserved)
- `A1001` - With letter prefix
- `A001001` - With letter prefix and leading zeros

**Important:** Leading zeros will be preserved exactly as entered.

## What Gets Imported

For each row with filled serial numbers, the system will:
1. ✅ Validate the data
2. ✅ Calculate total quantity (Serial To - Serial From + 1)
3. ✅ Create database entry
4. ✅ Display in "Received" tab

## Common Issues

### Issue: "Successfully added 0 entries"
**Cause:** Serial numbers are empty
**Solution:** Fill in the "Serial From" and "Serial To" columns

### Issue: "Invalid file type"
**Cause:** Wrong file format
**Solution:** Make sure file is .xlsx or .xls format

### Issue: "Some entries failed"
**Cause:** Invalid data in some rows
**Solution:** Check that:
- Serial From and Serial To are filled
- Serial To is greater than Serial From
- Answer sheet type matches exactly (Main, Graph, Supplementary, For Blind, Drawing Sheets)
- Colour matches exactly (Red, Blue, Yellow, Pink, White)

## Tips

1. **Don't modify pre-filled columns**: Type, Pages, Class, Colour, Suffix are already correct
2. **Fill all rows**: You can fill serial numbers for all 11 types at once
3. **Skip rows**: Leave Serial From/To empty for types you don't want to add
4. **Save before upload**: Make sure to save your Excel file after filling
5. **Keep a copy**: Save your filled template for future reference

## Sample File

A pre-filled sample file is available at:
`client/public/Answer_Sheets_Filled_Sample.xlsx`

This shows exactly how the template should look when filled.

## Validation Rules

The system validates:
- ✅ File must be Excel format (.xlsx or .xls)
- ✅ Serial From and Serial To must be filled
- ✅ Serial To must be ≥ Serial From
- ✅ Answer sheet type must be valid
- ✅ Colour must be valid
- ✅ Class must be filled

## Result

After successful upload, you'll see:
```
Successfully added 11 answer sheet entries!
```

All entries will appear in the "Received" tab with:
- Answer sheet type and details
- Serial number range
- Total quantity (auto-calculated)
- Exam and subject (if provided)
