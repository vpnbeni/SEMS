# Datesheet PDF Tools

This folder contains utility scripts for working with datesheet PDF imports.

## Available Tools

### 1. Debug PDF Parsing
**File:** `debug-datesheet-pdf.js`

Test PDF parsing without running the full server.

```bash
node debug-datesheet-pdf.js path/to/your/datesheet.pdf
```

**What it does:**
- Extracts text from PDF
- Shows parsing attempts line by line
- Displays found entries
- Helps identify format issues

**Example output:**
```
=== PDF PARSING RESULTS ===
Total pages: 3
Text length: 1234
Has text: true

=== FIRST 30 NORMALIZED LINES ===
1: EXAMINATION SCHEDULE - CLASS 12
2: TUESDAY 17TH FEBRUARY, 2026
3: 09:00 AM - 12:00 PM 041 MATHEMATICS STANDARD
...

=== PARSING ATTEMPTS ===
Line 2: Found date header - 2026-02-17 (TUESDAY)
Line 3: Found complete entry - 09:00 AM to 12:00 PM, 041 MATHEMATICS
...

=== PARSING RESULTS ===
Total entries found: 15
```

### 2. Generate Sample Datesheet
**File:** `generate-sample-datesheet.js`

Creates a valid sample datesheet text file.

```bash
node generate-sample-datesheet.js
```

**What it does:**
- Creates `sample-datesheet.txt` with valid format
- Can be converted to PDF for testing
- Shows correct format examples

**Next steps after running:**
1. Open `sample-datesheet.txt` in any text editor
2. Save/Export as PDF (File → Save As → PDF)
3. Upload the PDF to test import feature

### 3. Test Candidate PDF Parsing
**File:** `test-pdf-parsing.js`

Tests candidate list PDF parsing (different from datesheet).

```bash
node test-pdf-parsing.js
```

## Common Issues

### Issue: "PDF has no text"
**Cause:** PDF is image-based or scanned
**Solution:** 
- Use text-based PDF export
- Or install OCR tools (Ghostscript + GraphicsMagick)

### Issue: "No entries found"
**Cause:** PDF format doesn't match expected pattern
**Solution:**
- Run debug script to see what was extracted
- Check format against examples in `DATESHEET_PDF_FORMAT.md`
- Ensure dates are in format: `TUESDAY 17TH FEBRUARY, 2026`
- Ensure times are in format: `09:00 AM - 12:00 PM`

### Issue: "OCR unavailable"
**Cause:** Ghostscript or GraphicsMagick not installed
**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install ghostscript graphicsmagick

# macOS
brew install ghostscript graphicsmagick

# Windows
# Download and install from official websites
```

## Documentation

See project root for detailed guides:
- `DATESHEET_PDF_FORMAT.md` - Format requirements and examples
- `DATESHEET_PDF_TROUBLESHOOTING.md` - Troubleshooting guide
- `DATESHEET_IMPORT_FIXES.md` - Technical implementation details

## Quick Test

1. Generate sample:
   ```bash
   node generate-sample-datesheet.js
   ```

2. Convert `sample-datesheet.txt` to PDF

3. Test parsing:
   ```bash
   node debug-datesheet-pdf.js sample-datesheet.pdf
   ```

4. Should see 9 entries found

## Need Help?

Check the troubleshooting guide in the project root:
```bash
cat ../DATESHEET_PDF_TROUBLESHOOTING.md
```
