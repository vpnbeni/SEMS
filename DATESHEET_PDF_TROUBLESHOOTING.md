# Datesheet PDF Import Troubleshooting Guide

## Problem: Unable to Parse Data from PDF

If you're seeing the error "Could not detect any datesheet rows" when importing a PDF, follow these steps:

### 1. Check PDF Format

The PDF parser expects datesheets in this format:

```
TUESDAY 17TH FEBRUARY, 2026
10:30 AM - 01:30 PM 041 MATHEMATICS STANDARD
02:00 PM - 05:00 PM 042 PHYSICS

WEDNESDAY 18TH FEBRUARY, 2026
09:00 AM - 12:00 PM 043 CHEMISTRY
```

**Required elements:**
- Date header: `DAY DDth MONTH, YYYY` (e.g., "TUESDAY 17TH FEBRUARY, 2026")
- Exam entries: `HH:MM AM/PM - HH:MM AM/PM CODE SUBJECT NAME`
- Text must be selectable (not a scanned image)

### 2. Verify PDF is Text-Based

The PDF must contain selectable text, not scanned images. To check:
1. Open the PDF in a viewer
2. Try to select and copy text
3. If you can't select text, the PDF is an image and needs OCR

**For scanned PDFs:** The system will attempt OCR (Optical Character Recognition) but requires:
- Ghostscript installed
- GraphicsMagick installed
- Clear, high-quality scans

### 3. Debug Your PDF

Run the debug script to see what the parser is extracting:

```bash
cd server
node debug-datesheet-pdf.js path/to/your/datesheet.pdf
```

This will show:
- Total text extracted
- First 1000 characters
- Normalized lines
- Parsing attempts
- Entries found

### 4. Common Issues and Solutions

#### Issue: "Failed to parse PDF"
**Cause:** PDF is corrupted or password-protected
**Solution:** 
- Try opening the PDF in a viewer to verify it's not corrupted
- Remove password protection if present
- Re-export or re-save the PDF

#### Issue: "No text extracted" or "Text length: 0"
**Cause:** PDF contains only images
**Solution:**
- Use a text-based PDF export instead of scanning
- If scanning is necessary, ensure OCR prerequisites are installed
- Use high-quality scans (300 DPI or higher)

#### Issue: "Text extracted but no entries found"
**Cause:** PDF format doesn't match expected pattern
**Solution:**
- Check the debug output to see what text was extracted
- Verify date format matches: `DAY DDth MONTH, YYYY`
- Verify time format matches: `HH:MM AM/PM - HH:MM AM/PM`
- Ensure subject codes are 2-4 digits
- Check for special characters that might interfere

### 5. Supported Date Formats

The parser recognizes these date patterns:
- `TUESDAY 17TH FEBRUARY, 2026`
- `TUESDAY 17 FEBRUARY, 2026`
- `TUESDAY 17TH FEBRUARY 2026` (comma optional)

Ordinal suffixes supported: ST, ND, RD, TH, TM, ™

### 6. Supported Time Formats

The parser recognizes these time patterns:
- `10:30 AM - 01:30 PM`
- `10.30 AM - 01.30 PM` (dots converted to colons)
- `10 : 30 AM - 01 : 30 PM` (spaces removed)
- `A M` and `P M` (spaces removed)

### 7. Alternative Formats

If your PDF has a different format, you can:

1. **Split across lines:** The parser handles entries split across multiple lines:
   ```
   TUESDAY 17TH FEBRUARY, 2026
   10:30 AM - 01:30 PM
   041
   MATHEMATICS STANDARD
   ```

2. **Code and name on same line:**
   ```
   10:30 AM - 01:30 PM
   041 MATHEMATICS STANDARD
   ```

### 8. Getting Help

If you're still having issues:

1. Run the debug script and save the output
2. Check the browser console for error messages
3. Check the server logs for detailed parsing information
4. Provide a sample of your PDF format (first few lines)

### 9. Manual Entry Alternative

If PDF import continues to fail, you can:
- Manually create datesheets using the "Create Date Sheet" button
- Use the "Generate Date Sheet" feature to auto-generate based on subjects
- Import from Excel/CSV template (if available)

## Technical Details

### Parser Logic

The parser uses these steps:
1. Extract text from PDF using `pdf-parse`
2. Normalize text (fix special characters, spacing)
3. Split into lines
4. Identify date headers
5. Match exam entries with time, code, and subject
6. Handle multi-line entries

### OCR Fallback

If text extraction yields less than 20 characters, the system attempts OCR:
1. Convert PDF pages to images (up to 10 pages)
2. Run Tesseract OCR on each image
3. Combine OCR results
4. Parse as normal

### File Size Limits

- Maximum file size: 10MB (configurable via `MAX_FILE_SIZE` env variable)
- Timeout: 30 seconds for upload

## Example Valid PDF Content

```
EXAMINATION SCHEDULE - CLASS 12

TUESDAY 17TH FEBRUARY, 2026
09:00 AM - 12:00 PM 041 MATHEMATICS STANDARD
02:00 PM - 05:00 PM 042 PHYSICS

WEDNESDAY 18TH FEBRUARY, 2026
09:00 AM - 12:00 PM 043 CHEMISTRY
02:00 PM - 05:00 PM 044 BIOLOGY

THURSDAY 19TH FEBRUARY, 2026
09:00 AM - 12:00 PM 045 ENGLISH CORE
02:00 PM - 05:00 PM 046 COMPUTER SCIENCE
```
