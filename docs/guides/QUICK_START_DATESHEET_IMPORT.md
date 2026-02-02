# Quick Start: Datesheet PDF Import

## 🚀 Getting Started in 3 Steps

### Step 1: Check Your PDF Format

Your PDF should look like this:

```
TUESDAY 17TH FEBRUARY, 2026
09:00 AM - 12:00 PM 041 MATHEMATICS STANDARD
02:00 PM - 05:00 PM 042 PHYSICS

WEDNESDAY 18TH FEBRUARY, 2026
09:00 AM - 12:00 PM 043 CHEMISTRY
```

**Key requirements:**
- ✅ Text must be selectable (not a scanned image)
- ✅ Date format: `DAY DDth MONTH, YYYY`
- ✅ Time format: `HH:MM AM/PM - HH:MM AM/PM`
- ✅ Subject code (2-4 digits) + subject name

### Step 2: Upload Your PDF

1. Go to `/datesheets` page
2. Click "Import PDF" button
3. Drag & drop your PDF or click to select
4. Click "Import Datesheet"

### Step 3: Check Results

**Success:** You'll see "Datesheet imported successfully! Found X entries."

**Error:** You'll see detailed error information with:
- What went wrong
- Debug information
- Sample lines from your PDF
- Suggestions to fix

## 🔧 Troubleshooting

### Error: "Text length: 0"

**Problem:** Your PDF has no extractable text

**Solutions:**
1. Check if text is selectable in PDF viewer
2. If not, re-export as text-based PDF from source
3. Or use OCR tools (see troubleshooting guide)

### Error: "No entries found"

**Problem:** PDF format doesn't match expected pattern

**Solutions:**
1. Check date format matches: `TUESDAY 17TH FEBRUARY, 2026`
2. Check time format matches: `09:00 AM - 12:00 PM`
3. Ensure subject codes are present
4. Run debug tool to see what was extracted

### Error: "OCR unavailable"

**Problem:** PDF is scanned image and OCR tools not installed

**Solutions:**
1. Use text-based PDF instead (recommended)
2. Or install Ghostscript + GraphicsMagick for OCR

## 🧪 Test with Sample

Want to test the feature first?

```bash
# Generate sample datesheet
cd server
node generate-sample-datesheet.js

# This creates sample-datesheet.txt
# Convert it to PDF and upload
```

## 🐛 Debug Your PDF

Having issues? Debug your PDF to see what's being extracted:

```bash
cd server
node debug-datesheet-pdf.js path/to/your/datesheet.pdf
```

This shows:
- How much text was extracted
- What the parser sees
- Which entries were found
- Why parsing might fail

## 📚 More Help

- **Format guide:** See `DATESHEET_PDF_FORMAT.md` for detailed format rules
- **Troubleshooting:** See `DATESHEET_PDF_TROUBLESHOOTING.md` for common issues
- **Technical details:** See `DATESHEET_IMPORT_FIXES.md` for implementation

## ✅ Checklist Before Upload

- [ ] PDF is text-based (text is selectable)
- [ ] Dates are in format: `TUESDAY 17TH FEBRUARY, 2026`
- [ ] Times are in format: `09:00 AM - 12:00 PM`
- [ ] Subject codes are 2-4 digits
- [ ] Subject names follow codes
- [ ] PDF is not password-protected
- [ ] File size is under 10MB

## 💡 Pro Tips

1. **Export from source:** Always export PDF from original document (Word, Excel, etc.) rather than scanning
2. **Test first:** Use the debug tool before uploading to catch format issues
3. **Check logs:** If upload fails, check browser console and server logs for details
4. **Use sample:** Generate and test with sample datesheet first

## 🆘 Still Having Issues?

1. Run the debug tool and save output
2. Check browser console (F12) for errors
3. Check server logs for detailed parsing info
4. Review the troubleshooting guide
5. Ensure PDF matches format examples exactly

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

Save this as text, convert to PDF, and upload to test!
