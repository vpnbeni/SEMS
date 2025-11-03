# Datesheet PDF Format Guide

## Quick Reference

This guide shows the exact format your datesheet PDF should follow for successful import.

## ✅ Valid Format Example

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
```

## Format Rules

### 1. Date Headers
**Format:** `DAY DDth MONTH, YYYY`

**Valid examples:**
- `TUESDAY 17TH FEBRUARY, 2026`
- `MONDAY 3RD MARCH, 2026`
- `FRIDAY 21ST APRIL, 2026`

**Requirements:**
- Day name in FULL (MONDAY, TUESDAY, etc.)
- Day number (1-31)
- Ordinal suffix (ST, ND, RD, TH) - optional
- Month name in FULL (JANUARY, FEBRUARY, etc.)
- 4-digit year
- Comma after month is optional

### 2. Exam Entries
**Format:** `HH:MM AM/PM - HH:MM AM/PM CODE SUBJECT NAME`

**Valid examples:**
- `09:00 AM - 12:00 PM 041 MATHEMATICS STANDARD`
- `02:00 PM - 05:00 PM 042 PHYSICS`
- `10:30 AM - 01:30 PM 043 CHEMISTRY PRACTICAL`

**Requirements:**
- Start time with AM/PM
- Dash or hyphen separator (-, –, —)
- End time with AM/PM
- Subject code (2-4 digits)
- Subject name (letters, numbers, spaces, &, /, -)

### 3. Alternative Multi-Line Format

The parser also supports entries split across multiple lines:

```
TUESDAY 17TH FEBRUARY, 2026
09:00 AM - 12:00 PM
041
MATHEMATICS STANDARD
```

Or:

```
TUESDAY 17TH FEBRUARY, 2026
09:00 AM - 12:00 PM
041 MATHEMATICS STANDARD
```

## ❌ Common Mistakes

### Wrong date format
```
❌ 17/02/2026
❌ Feb 17, 2026
❌ 17-02-2026
✅ TUESDAY 17TH FEBRUARY, 2026
```

### Wrong time format
```
❌ 9-12 (missing AM/PM)
❌ 09:00-12:00 (missing AM/PM)
❌ 9am-12pm (lowercase)
✅ 09:00 AM - 12:00 PM
```

### Missing subject code
```
❌ 09:00 AM - 12:00 PM MATHEMATICS
✅ 09:00 AM - 12:00 PM 041 MATHEMATICS
```

## PDF Requirements

### Must be Text-Based
- Text must be selectable/copyable in PDF viewer
- NOT a scanned image (unless OCR is available)
- NOT password-protected
- NOT corrupted

### How to Check
1. Open PDF in any viewer
2. Try to select text with your cursor
3. Try to copy and paste text
4. If you can't select text → it's an image-based PDF

### How to Create Text-Based PDF

**From Word/Excel:**
- File → Save As → PDF
- File → Export → PDF

**From Google Docs/Sheets:**
- File → Download → PDF

**From existing image/scan:**
- Use OCR software (Adobe Acrobat, Google Drive OCR, etc.)
- Or install Ghostscript + GraphicsMagick for automatic OCR

## Testing Your PDF

Before uploading, you can test your PDF format:

```bash
cd server
node debug-datesheet-pdf.js path/to/your/datesheet.pdf
```

This will show:
- How much text was extracted
- What the parser sees
- Which entries were found
- Why parsing might fail

## Need Help?

See [DATESHEET_PDF_TROUBLESHOOTING.md](./DATESHEET_PDF_TROUBLESHOOTING.md) for detailed troubleshooting steps.
