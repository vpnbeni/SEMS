# Seating Plan Master Plan

## Architecture Overview

### Master-Slave Relationship
```
Master Plan (Notice Board)
    ↓
    ├── Invigilator Slip (derived)
    ├── Room Door Slip (derived)
    └── CBSE Copy (derived)
```

## Implementation Strategy

### Phase 1: Master Plan Generation (Notice Board)
1. **Generate Master Seating Plan**
   - This is the PRIMARY source of truth
   - Contains complete seating arrangement data
   - Stored in database with all details
   - Generated once per exam

2. **Master Plan Data Structure**
```javascript
{
  _id: ObjectId,
  examDate: Date,
  dayName: String,
  subjectCode: String,
  subjectName: String,
  class: String,
  totalCandidates: Number,
  roomsAllocated: Number,
  rooms: [
    {
      roomNo: String,
      floor: String,
      seats: [
        {
          seatNumber: Number,
          rollNumber: String,
          candidateName: String
        }
      ]
    }
  ],
  status: 'draft' | 'published',
  generatedAt: Date
}
```

### Phase 2: Format Templates (PDF-Based)

#### Workflow
1. **User provides 4 PDF templates**:
   - Notice Board format
   - Invigilator Slip format
   - Room Door Slip format
   - CBSE Copy format

2. **We analyze each PDF**:
   - Extract exact margins
   - Identify font families and sizes
   - Measure spacing and layout
   - Note page dimensions
   - Document all styling details

3. **Create PDF generators** that replicate exact format

#### Template Analysis Required

**Standard Page Size: A4 (210mm × 297mm)**

For each PDF format, we need to document:
- **Page Size**: A4 (210mm × 297mm) - FIXED STANDARD
- **Margins**: Top, Bottom, Left, Right (in mm)
- **Font Family**: Times New Roman, Arial, etc.
- **Font Sizes**: Headers, body text, footers
- **Line Spacing**: Single, 1.5, Double
- **Alignment**: Left, Center, Right, Justified
- **Borders**: Thickness, style, color
- **Tables**: Column widths, row heights
- **Headers/Footers**: Content and positioning
- **Logo/Watermark**: Position and size

### Phase 3: Data Flow

```
1. Generate Master Plan (Notice Board)
   ↓
2. Save to Database
   ↓
3. User selects format to export
   ↓
4. System reads Master Plan data
   ↓
5. Apply selected format template
   ↓
6. Generate PDF with exact formatting
   ↓
7. Download/Print
```

### Phase 4: PDF Generation Technology Stack

#### Option 1: PDFKit (Node.js)
```javascript
const PDFDocument = require('pdfkit')

// Precise control over:
- Font selection
- Exact positioning (x, y coordinates)
- Margins and spacing
- Tables and borders
- Headers and footers
```

#### Option 2: Puppeteer (HTML to PDF)
```javascript
const puppeteer = require('puppeteer')

// Benefits:
- HTML/CSS for layout
- Easier to match complex designs
- Better for tables and formatting
- Can replicate PDF exactly using CSS
```

#### Recommended: Puppeteer + HTML Templates
- Create HTML template for each format
- Use CSS to match exact PDF styling
- Convert to PDF with precise settings

## Implementation Steps

### Step 1: Receive PDF Templates
**Action Required**: Please provide 4 PDF files
- `notice-board-format.pdf`
- `room-folder-slip-format.pdf`
- `room-door-slip-format.pdf`
- `cbse-copy-format.pdf`

### Step 2: Analyze Templates
For each PDF, we will document:
```markdown
## Notice Board Format Analysis
- Page Size: A4 (210mm × 297mm) - STANDARD
- Orientation: Portrait
- Margins: Top 20mm, Bottom 20mm, Left 25mm, Right 25mm
- Header Font: Times New Roman Bold, 16pt
- Body Font: Times New Roman Regular, 12pt
- Line Spacing: 1.5
- Table Border: 1pt solid black
- Column Widths: [specific measurements]
- etc.
```

### Step 3: Create HTML Templates
```html
<!-- notice-board-template.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* A4 Standard: 210mm × 297mm */
    @page {
      size: A4 portrait;
      margin: 20mm 25mm 20mm 25mm;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.5;
    }
    .header {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20px;
    }
    /* Exact CSS to match PDF */
  </style>
</head>
<body>
  <!-- Template content with placeholders -->
  <div class="header">{{schoolName}}</div>
  <div class="title">EXAMINATION SEATING PLAN</div>
  <!-- More content -->
</body>
</html>
```

### Step 4: Build PDF Generator
```javascript
// server/src/utils/seatingPlanPDFGenerator.js

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

class SeatingPlanPDFGenerator {
  
  async generateNoticeBoardPDF(masterPlan) {
    // Load template
    const template = fs.readFileSync(
      path.join(__dirname, '../templates/notice-board.html'),
      'utf8'
    )
    
    // Replace placeholders with actual data
    const html = this.populateTemplate(template, masterPlan)
    
    // Generate PDF with exact settings
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(html)
    
    const pdf = await page.pdf({
      format: 'A4', // 210mm × 297mm - STANDARD
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '25mm',
        right: '25mm'
      },
      printBackground: true,
      preferCSSPageSize: false // Force A4 size
    })
    
    await browser.close()
    return pdf
  }
  
  async generateRoomFolderSlipPDF(masterPlan, roomNo) {
    // Similar implementation for room folder slip
  }
  
  async generateRoomDoorSlipPDF(masterPlan, roomNo) {
    // Similar implementation for room door slip
  }
  
  async generateCBSECopyPDF(masterPlan) {
    // Similar implementation for CBSE copy
  }
  
  populateTemplate(template, data) {
    // Replace {{placeholders}} with actual data
    return template
      .replace('{{schoolName}}', data.schoolName)
      .replace('{{examDate}}', data.examDate)
      // ... more replacements
  }
}

module.exports = new SeatingPlanPDFGenerator()
```

### Step 5: API Endpoints
```javascript
// Generate Master Plan
POST /api/seating-plan/generate
Body: { examDate, subjectCode, class }
Response: { masterPlanId, roomsAllocated, candidatesAllocated }

// Export in specific format
GET /api/seating-plan/:id/export/notice-board
GET /api/seating-plan/:id/export/room-folder-slip/:roomNo
GET /api/seating-plan/:id/export/room-door-slip/:roomNo
GET /api/seating-plan/:id/export/cbse-copy
Response: PDF file download
```

## Directory Structure
```
server/
├── src/
│   ├── models/
│   │   └── SeatingPlan.js (Master Plan model)
│   ├── controllers/
│   │   └── seatingPlanController.js
│   ├── utils/
│   │   ├── seatingPlanGenerator.js (Algorithm)
│   │   └── seatingPlanPDFGenerator.js (PDF creation)
│   ├── templates/
│   │   ├── notice-board.html
│   │   ├── room-folder-slip.html
│   │   ├── room-door-slip.html
│   │   └── cbse-copy.html
│   └── routes/
│       └── seatingPlan.js
└── reference-pdfs/ (Your provided PDFs)
    ├── notice-board-format.pdf
    ├── room-folder-slip-format.pdf
    ├── room-door-slip-format.pdf
    └── cbse-copy-format.pdf
```

## Quality Assurance

### Verification Checklist
For each generated PDF, verify:
- [ ] Page size matches exactly
- [ ] Margins are identical
- [ ] Font family is correct
- [ ] Font sizes match
- [ ] Line spacing is accurate
- [ ] Table borders match
- [ ] Column widths are correct
- [ ] Headers/footers positioned correctly
- [ ] Overall layout is identical
- [ ] Print preview looks correct

### Testing Process
1. Generate PDF from master plan
2. Print both (reference and generated)
3. Overlay and compare
4. Measure with ruler if needed
5. Adjust CSS/settings until perfect match

## Benefits of This Approach

1. **Single Source of Truth**: Master plan is generated once
2. **Consistency**: All formats derive from same data
3. **Flexibility**: Easy to add new formats
4. **Accuracy**: Exact replication of provided PDFs
5. **Maintainability**: Change data once, all formats update
6. **Performance**: Generate master once, export multiple times

## Next Steps

### Immediate Actions Required:
1. **Provide 4 PDF templates** (upload to project)
2. **Specify any special requirements** (logos, watermarks, etc.)
3. **Confirm school/center details** to include in headers

### Development Sequence:
1. Analyze provided PDFs (2 hours)
2. Create HTML templates (4 hours)
3. Build PDF generator (3 hours)
4. Test and refine (2 hours)
5. Integrate with frontend (2 hours)

**Total Estimated Time: 13 hours**

---

## Ready to Proceed?

Please provide the 4 PDF format files, and I will:
1. Analyze each format in detail
2. Document exact specifications
3. Create matching HTML templates
4. Build the PDF generation system
5. Ensure pixel-perfect output

Upload the PDFs to: `server/reference-pdfs/` directory
