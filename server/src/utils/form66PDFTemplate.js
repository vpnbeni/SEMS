/**
 * Form 66 PDF Template Generator
 * Generates HTML template for Form 66 data to be rendered as PDF
 */

/**
 * Generate HTML template for Form 66 PDF
 * @param {Object} data - Form 66 data grouped by subject
 * @param {string} data.examDate - The exam date
 * @param {string} data.centreNo - Centre number
 * @param {string} data.centreName - Centre name
 * @param {string} data.examType - SECONDARY or SR SECONDARY
 * @param {Array} data.subjects - Array of subject data
 * @returns {string} HTML string for PDF generation
 */
function generateForm66HTML(data) {
    const { examDate, centreNo, centreName, examType = 'SECONDARY', subjects } = data;

    // Generate subject rows
    const subjectRows = subjects.map(subject => {
        const rollRangesHtml = subject.rollRanges.map(range => `
      <tr class="roll-row">
        <td class="roll-range">${range.start}-${range.end}</td>
        <td class="count">${range.count} I</td>
        <td class="empty-col">I</td>
        <td class="empty-col">I</td>
        <td class="empty-col">I</td>
      </tr>
    `).join('');

        return `
      <tr class="subject-header">
        <td colspan="5" class="subject-info">${examDate} ${subject.code} ${subject.name}</td>
      </tr>
      ${rollRangesHtml}
      <tr class="divider-row">
        <td colspan="5" class="divider">----------------------------------------------------------------------------</td>
      </tr>
      <tr class="subject-total">
        <td class="total-label">** SUBJECT-TOTAL**</td>
        <td class="total-count">${subject.totalCount} I</td>
        <td class="empty-col">I</td>
        <td class="empty-col">I</td>
        <td class="empty-col">I</td>
      </tr>
      <tr class="divider-row">
        <td colspan="5" class="divider">----------------------------------------------------------------------------</td>
      </tr>
    `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Form 66 - ${examDate}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.2;
      color: #000;
      background: #fff;
    }
    
    .page {
      width: 100%;
      padding: 10px;
      page-break-after: always;
    }
    
    .header {
      text-align: center;
      margin-bottom: 15px;
    }
    
    .exam-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .form-title {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .centre-info {
      text-align: center;
      font-size: 10px;
      margin-bottom: 10px;
    }
    
    .table-header {
      font-size: 9px;
      border-bottom: 1px dashed #000;
      padding-bottom: 5px;
      margin-bottom: 5px;
    }
    
    .table-header-row {
      display: flex;
      justify-content: space-between;
    }
    
    .main-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    .main-table td {
      padding: 2px 5px;
      vertical-align: top;
    }
    
    .subject-header td {
      font-weight: bold;
      padding-top: 10px;
    }
    
    .roll-range {
      padding-left: 30px;
    }
    
    .count {
      text-align: right;
      width: 80px;
    }
    
    .empty-col {
      text-align: center;
      width: 60px;
    }
    
    .divider {
      text-align: center;
      color: #666;
      padding: 3px 0;
    }
    
    .subject-total .total-label {
      padding-left: 15px;
      font-weight: bold;
    }
    
    .subject-total .total-count {
      font-weight: bold;
      text-align: right;
    }
    
    .footer {
      margin-top: 20px;
      font-size: 9px;
    }
    
    .footer-note {
      margin-bottom: 10px;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="exam-title">${examType} SCHOOL CERTIFICATE EXAMINATION 2025</div>
      <div class="form-title">**CBSE-66/ CENTRE MEMO**</div>
    </div>
    
    <div class="centre-info">
      CENTRE - ${centreNo} ${centreName}
    </div>
    
    <div class="table-header">
      <div class="table-header-row">
        <span>DATE OF SUBJECT DESCRIPTION</span>
        <span>ROLL NOS REGISTERED</span>
        <span>|ROLL NOS OF CANDIDATES |ROLL NOS OF UNFAIR MEANS|TOTAL NO OF ANSWER BOOKS|</span>
      </div>
      <div class="table-header-row">
        <span>EXAM.</span>
        <span></span>
        <span>|ABSENT, IF ANY         |CASES, IF ANY          |SENT TO REGIONAL OFFICE |</span>
      </div>
      <div style="border-bottom: 1px dashed #000; margin-top: 5px;"></div>
    </div>
    
    <table class="main-table">
      <tbody>
        ${subjectRows}
      </tbody>
    </table>
    
    <div class="footer">
      <div class="footer-note">
        NOTE :- ONE COPY TO BE PLACED IN THE ANSWER BOOKS BAG<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ONE TO BE DELIVERED AT THE RECEIVING CENTRE AND<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ONE TO BE RETAINED BY THE CENTRE FOR RECORD
      </div>
      <div class="signature-section">
        <span></span>
        <span>SIGNATURE OF THE CENTRE SUPDT.<br><br>RUBBER STAMP AND DATE</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Convert Form 66 records to roll ranges for PDF
 * @param {Array} records - Form 66 records from database
 * @returns {Array} Roll ranges with start, end, count
 */
function recordsToRollRanges(records) {
    if (!records || records.length === 0) return [];

    // Sort records by roll number
    const sortedRecords = [...records].sort((a, b) =>
        parseInt(a.rollNo) - parseInt(b.rollNo)
    );

    const ranges = [];
    let rangeStart = parseInt(sortedRecords[0].rollNo);
    let rangeEnd = rangeStart;
    let count = 1;

    for (let i = 1; i < sortedRecords.length; i++) {
        const currentRoll = parseInt(sortedRecords[i].rollNo);

        if (currentRoll === rangeEnd + 1) {
            // Continue the range
            rangeEnd = currentRoll;
            count++;
        } else {
            // Save current range and start new one
            ranges.push({
                start: rangeStart.toString(),
                end: rangeEnd.toString(),
                count
            });
            rangeStart = currentRoll;
            rangeEnd = currentRoll;
            count = 1;
        }
    }

    // Don't forget the last range
    ranges.push({
        start: rangeStart.toString(),
        end: rangeEnd.toString(),
        count
    });

    return ranges;
}

module.exports = {
    generateForm66HTML,
    recordsToRollRanges
};
