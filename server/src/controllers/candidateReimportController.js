const asyncHandler = require('../middleware/asyncHandler');
const pdfParse = require('pdf-parse');
const {
  extractCandidatesFromText,
  normalizeSubjectCode,
  normalizeSubjectClass,
  buildSubjectKey,
  readUploadedFileBuffer,
} = require('../utils/candidatePdfParser');

// @desc    Dry-run: parse PDF and compare with existing candidates
// @route   POST /api/candidates/reimport-compare
// @access  Private/Admin
const reimportCompare = asyncHandler(async (req, res) => {
  const pdfFile = req.files?.pdf;
  if (!pdfFile) {
    return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
  }

  const Candidate = req.models?.Candidate || require('../models/Candidate');

  // Parse PDF
  const dataBuffer = readUploadedFileBuffer(pdfFile);
  const pdfData = await pdfParse(dataBuffer);
  const parsedCandidates = extractCandidatesFromText(pdfData.text);

  if (parsedCandidates.length === 0) {
    return res.status(400).json({ success: false, message: 'No candidates found in the PDF' });
  }

  // Fetch existing candidates from DB
  const dbCandidates = await Candidate.find({ status: 'active' }).lean();
  const dbMap = new Map();
  for (const c of dbCandidates) {
    dbMap.set(c.rollNumber, c);
  }

  // Build parsed map
  const pdfMap = new Map();
  for (const c of parsedCandidates) {
    pdfMap.set(c.rollNumber, c);
  }

  const differences = [];
  const newCandidates = [];
  const missingFromPdf = [];

  // Compare: PDF candidates vs DB
  for (const pdfCandidate of parsedCandidates) {
    const dbCandidate = dbMap.get(pdfCandidate.rollNumber);
    if (!dbCandidate) {
      newCandidates.push({
        rollNumber: pdfCandidate.rollNumber,
        name: pdfCandidate.name,
        class: pdfCandidate.class,
        schoolCode: pdfCandidate.schoolCode,
        schoolName: pdfCandidate.schoolName,
        subjectCodes: pdfCandidate.subjectCodes,
      });
      continue;
    }

    // Compare subject codes
    const pdfCodes = new Set(
      (pdfCandidate.subjectCodes || []).map((s) => normalizeSubjectCode(s.code))
    );
    const dbCodes = new Set(
      (dbCandidate.subjectCodes || []).map((s) => normalizeSubjectCode(s.code))
    );

    const added = []; // in PDF, not in DB
    const removed = []; // in DB, not in PDF (phantom)
    const unchanged = [];

    for (const code of pdfCodes) {
      if (!code) continue;
      if (dbCodes.has(code)) {
        unchanged.push({ code });
      } else {
        const pdfEntry = pdfCandidate.subjectCodes.find(
          (s) => normalizeSubjectCode(s.code) === code
        );
        added.push({ code, medium: pdfEntry?.medium || '' });
      }
    }

    for (const code of dbCodes) {
      if (!code) continue;
      if (!pdfCodes.has(code)) {
        const dbEntry = dbCandidate.subjectCodes.find(
          (s) => normalizeSubjectCode(s.code) === code
        );
        removed.push({ code, medium: dbEntry?.medium || '' });
      }
    }

    // Compare basic fields
    const fieldChanges = {};
    const fieldsToCompare = ['name', 'motherName', 'fatherName', 'sex', 'category'];
    for (const field of fieldsToCompare) {
      const dbVal = (dbCandidate[field] || '').trim();
      const pdfVal = (pdfCandidate[field] || '').trim();
      if (dbVal !== pdfVal && (dbVal || pdfVal)) {
        fieldChanges[field] = { db: dbVal, pdf: pdfVal };
      }
    }

    if (added.length > 0 || removed.length > 0 || Object.keys(fieldChanges).length > 0) {
      differences.push({
        rollNumber: dbCandidate.rollNumber,
        candidateName: dbCandidate.name,
        dbCandidateId: dbCandidate._id.toString(),
        class: dbCandidate.class,
        type:
          (added.length > 0 || removed.length > 0) && Object.keys(fieldChanges).length > 0
            ? 'both'
            : added.length > 0 || removed.length > 0
              ? 'subject_mismatch'
              : 'field_mismatch',
        subjectChanges: { added, removed, unchanged },
        fieldChanges,
      });
    }
  }

  // Find candidates in DB but not in PDF
  for (const dbCandidate of dbCandidates) {
    if (!pdfMap.has(dbCandidate.rollNumber)) {
      // Only flag candidates whose class matches the parsed PDF's class
      const pdfClass = parsedCandidates[0]?.class;
      if (!pdfClass || dbCandidate.class === pdfClass) {
        missingFromPdf.push({
          rollNumber: dbCandidate.rollNumber,
          name: dbCandidate.name,
          class: dbCandidate.class,
          dbCandidateId: dbCandidate._id.toString(),
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      parseStats: {
        totalParsed: parsedCandidates.length,
        totalInDb: dbCandidates.length,
        matchedCount: parsedCandidates.length - newCandidates.length,
        pdfClass: parsedCandidates[0]?.class || '',
      },
      differences,
      newCandidates,
      missingFromPdf,
    },
  });
});

// @desc    Check impact of proposed changes on downstream data
// @route   POST /api/candidates/reimport-impact
// @access  Private/Admin
const reimportImpact = asyncHandler(async (req, res) => {
  const { changes } = req.body;

  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ success: false, message: 'changes array is required' });
  }

  const SeatingPlanAllocation =
    req.models?.SeatingPlanAllocation || require('../models/SeatingPlanAllocation');
  const Form66 = req.models?.Form66 || require('../models/Form66');
  const AnswerSheet = req.models?.AnswerSheet || require('../models/AnswerSheet');

  const impacts = [];

  for (const change of changes) {
    const { rollNumber, subjectCodes = [], action } = change;

    for (const code of subjectCodes) {
      const normalizedCode = normalizeSubjectCode(code);

      const [seatingCount, form66Count, answerSheetCount] = await Promise.all([
        SeatingPlanAllocation.countDocuments({
          rollNo: rollNumber,
          subjectCode: normalizedCode,
        }),
        Form66.countDocuments({ subjectCode: normalizedCode }),
        AnswerSheet.countDocuments({ subjectCode: normalizedCode }),
      ]);

      let severity = 'none';
      if (form66Count > 0 || answerSheetCount > 0) {
        severity = 'high';
      } else if (seatingCount > 0) {
        severity = 'low';
      }

      impacts.push({
        rollNumber,
        subjectCode: normalizedCode,
        action,
        seatingPlanAllocations: seatingCount,
        form66Records: form66Count,
        answerSheetLinks: answerSheetCount,
        severity,
      });
    }
  }

  const summary = {
    totalSeatingAllocationsAffected: impacts.reduce((s, i) => s + i.seatingPlanAllocations, 0),
    totalForm66Affected: impacts.reduce((s, i) => s + i.form66Records, 0),
    totalAnswerSheetsAffected: impacts.reduce((s, i) => s + i.answerSheetLinks, 0),
    overallSeverity: impacts.some((i) => i.severity === 'high')
      ? 'high'
      : impacts.some((i) => i.severity === 'low')
        ? 'low'
        : 'none',
  };

  res.status(200).json({ success: true, data: { impacts, summary } });
});

// @desc    Apply selected reimport fixes
// @route   POST /api/candidates/reimport-apply
// @access  Private/Admin
const reimportApply = asyncHandler(async (req, res) => {
  const { changes } = req.body;

  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ success: false, message: 'changes array is required' });
  }

  const Candidate = req.models?.Candidate || require('../models/Candidate');
  const Subject = req.models?.Subject || require('../models/Subject');
  const SeatingPlanAllocation =
    req.models?.SeatingPlanAllocation || require('../models/SeatingPlanAllocation');

  const results = [];

  for (const change of changes) {
    const { rollNumber, action, subjectCodes = [], cascadeCleanup = false } = change;

    try {
      if (action === 'remove_subjects') {
        const candidate = await Candidate.findOne({ rollNumber });
        if (!candidate) {
          results.push({ rollNumber, action, success: false, error: 'Candidate not found' });
          continue;
        }

        for (const code of subjectCodes) {
          const normalizedCode = normalizeSubjectCode(code);

          // Remove from subjectCodes array
          candidate.subjectCodes = candidate.subjectCodes.filter(
            (sc) => normalizeSubjectCode(sc.code) !== normalizedCode
          );

          // Remove Subject ObjectId from subjects array
          const subjectDoc = await Subject.findOne({
            code: normalizedCode,
            class: candidate.class,
          });
          if (subjectDoc) {
            candidate.subjects = candidate.subjects.filter(
              (id) => id.toString() !== subjectDoc._id.toString()
            );
          }

          // Cascade cleanup
          if (cascadeCleanup) {
            await SeatingPlanAllocation.deleteMany({
              rollNo: rollNumber,
              subjectCode: normalizedCode,
            });
          }
        }

        candidate.updatedBy = req.user?.id;
        await candidate.save();

        results.push({
          rollNumber,
          action,
          success: true,
          removedCodes: subjectCodes.map(normalizeSubjectCode),
        });
      } else if (action === 'add_subjects') {
        const candidate = await Candidate.findOne({ rollNumber });
        if (!candidate) {
          results.push({ rollNumber, action, success: false, error: 'Candidate not found' });
          continue;
        }

        for (const code of subjectCodes) {
          const normalizedCode = normalizeSubjectCode(code);

          // Check if already exists
          const exists = candidate.subjectCodes.some(
            (sc) => normalizeSubjectCode(sc.code) === normalizedCode
          );
          if (exists) continue;

          candidate.subjectCodes.push({ code: normalizedCode, medium: '' });

          // Find or create Subject
          let subjectDoc = await Subject.findOne({
            code: normalizedCode,
            class: candidate.class,
          });
          if (!subjectDoc) {
            subjectDoc = await Subject.create({
              code: normalizedCode,
              class: candidate.class,
              name: `Subject ${normalizedCode}`,
              duration: 3,
              answerSheet: 'none',
              isActive: true,
            });
          }
          if (!candidate.subjects.some((id) => id.toString() === subjectDoc._id.toString())) {
            candidate.subjects.push(subjectDoc._id);
          }
        }

        candidate.updatedBy = req.user?.id;
        await candidate.save();

        results.push({
          rollNumber,
          action,
          success: true,
          addedCodes: subjectCodes.map(normalizeSubjectCode),
        });
      } else {
        results.push({ rollNumber, action, success: false, error: `Unknown action: ${action}` });
      }
    } catch (err) {
      results.push({ rollNumber, action, success: false, error: err.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  res.status(200).json({
    success: true,
    message: `Applied ${successCount} change(s), ${failCount} failed`,
    data: { results, successCount, failCount },
  });
});

module.exports = {
  reimportCompare,
  reimportImpact,
  reimportApply,
};
