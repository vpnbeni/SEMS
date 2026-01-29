# Seating Plan HTML Templates

This folder contains HTML templates for generating seating plan PDFs.

## Templates

Each template corresponds to one of the four seating plan formats:

1. **main-gate.html**
   - Main gate / Notice board format
   - Master format with complete seating arrangement

2. **room-folder-slip.html**
   - Room supervisor folder format
   - Generated per room from master plan

3. **room-door-slip.html**
   - Room door display format
   - Generated per room from master plan

4. **cbse-copy.html**
   - CBSE submission format
   - Official format for board submission

## Template Structure

Each HTML template includes:
- CSS styling to match reference PDF exactly
- Placeholders for dynamic data ({{variable}})
- A4 page size specifications
- Print-optimized layout

## Usage

Templates are used by `seatingPlanPDFGenerator.js` to:
1. Load template HTML
2. Replace placeholders with actual data
3. Generate PDF using Puppeteer
4. Return formatted PDF file

## Development

When creating/updating templates:
- Match reference PDF exactly (margins, fonts, spacing)
- Use A4 page size (210mm × 297mm)
- Test with actual data
- Verify print output
- Ensure all placeholders are replaced

---

**Status**: Templates will be created after analyzing reference PDFs
