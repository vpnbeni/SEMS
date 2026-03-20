const { Worker } = require('bullmq');
const fs = require('fs');
const { getRedisConnection } = require('../queues/attendanceQueue');
const { getTenantConnectionAndModels } = require('../tenancy/tenantConnectionManager');
const { parseAttendanceSheetPdf } = require('../utils/attendanceSheetParser');
const { cloudinary } = require('../config/cloudinary');

/**
 * Read PDF from a temp file path, extract photos, upload each to Cloudinary,
 * link to candidate records.
 *
 * @param {string} tempFilePath    - Local temp file path (from express-fileupload)
 * @param {string} candidateClass  - '10th' or '12th' (matches Candidate.class schema)
 * @param {string} stagePrefix     - 'x' or 'xii' (used in progress stage names)
 * @param {object} CandidateModel  - tenant-scoped Mongoose Candidate model
 * @param {object} job             - BullMQ job (for progress updates)
 * @param {number} progressStart   - percent to report at start of this phase
 * @param {number} progressEnd     - percent to report when this phase finishes
 */
const processClassPhotos = async (
  tempFilePath,
  candidateClass,
  stagePrefix,
  CandidateModel,
  job,
  progressStart,
  progressEnd
) => {
  const warnings = [];

  await job.updateProgress({ stage: `reading_${stagePrefix}`, percent: progressStart });

  let pdfBuffer;
  try {
    pdfBuffer = await fs.promises.readFile(tempFilePath);
  } catch (err) {
    throw new Error(`Failed to read ${stagePrefix.toUpperCase()} PDF from temp path: ${err.message}`);
  }

  await job.updateProgress({ stage: `parsing_${stagePrefix}`, percent: progressStart + 8 });

  const { data: photoRecords, errors: parseErrors } = await parseAttendanceSheetPdf(pdfBuffer);

  if (parseErrors?.length > 0) {
    warnings.push(`Parse issues on ${parseErrors.length} page(s)`);
  }

  // Build set of valid roll numbers for this class
  const candidates = await CandidateModel.find({ class: candidateClass }, { rollNumber: 1 }).lean();
  const rollSet = new Set(candidates.map((c) => c.rollNumber.toUpperCase()));

  const classPhotos = (photoRecords || []).filter((r) =>
    rollSet.has((r.rollNumber || '').toUpperCase())
  );

  if (classPhotos.length === 0) {
    warnings.push(
      `No embedded photos found for Class ${candidateClass} candidates. ` +
        `This is normal for tabular attendance sheets.`
    );
    await job.updateProgress({ stage: `done_${stagePrefix}`, percent: progressEnd });
    return { uploaded: 0, warnings };
  }

  const uploadRangeSize = progressEnd - (progressStart + 10);
  let uploaded = 0;

  for (let i = 0; i < classPhotos.length; i++) {
    const record = classPhotos[i];
    try {
      const photoUpload = await cloudinary.uploader.upload(
        `data:${record.mimeType};base64,${record.imageBuffer.toString('base64')}`,
        {
          folder: 'onboarding/attendance',
          public_id: `photo_${record.rollNumber}_${Date.now()}`,
        }
      );

      await CandidateModel.findOneAndUpdate(
        { rollNumber: record.rollNumber.toUpperCase() },
        {
          $set: {
            photoUrl: photoUpload.secure_url,
            photoPublicId: photoUpload.public_id,
          },
        }
      );

      uploaded++;
    } catch (err) {
      warnings.push(`Failed to process photo for ${record.rollNumber}: ${err.message}`);
    }

    // Update progress proportionally through the upload range
    const pct =
      progressStart + 10 + Math.round(((i + 1) / classPhotos.length) * uploadRangeSize);
    await job.updateProgress({
      stage: `uploading_${stagePrefix}`,
      percent: pct,
      processed: i + 1,
      total: classPhotos.length,
    });
  }

  return { uploaded, warnings };
};

// ─── Worker ──────────────────────────────────────────────────────────────────

const worker = new Worker(
  'attendance-processing',
  async (job) => {
    const { tenantDbName, sessionId, classXTempPath, classXIITempPath } = job.data;

    await job.updateProgress({ stage: 'connecting', percent: 2 });

    // Get tenant DB connection + only the models we need
    const { models } = getTenantConnectionAndModels(tenantDbName, [
      'Candidate',
      'OnboardingSession',
    ]);
    const { Candidate, OnboardingSession } = models;

    // ── Phase 1: Class X (10th) ──────────────────────────────────────────────
    const resultX = await processClassPhotos(
      classXTempPath,
      '10th',
      'x',
      Candidate,
      job,
      5,   // progressStart
      48   // progressEnd
    );

    await OnboardingSession.findByIdAndUpdate(sessionId, {
      $set: {
        'steps.attendanceUploadX.status': 'completed',
        'steps.attendanceUploadX.completedAt': new Date(),
        'steps.attendanceUploadX.recordCount': resultX.uploaded,
        'steps.attendanceUploadX.validationWarnings': resultX.warnings,
      },
    });

    await job.updateProgress({ stage: 'phase_x_done', percent: 50 });

    // ── Phase 2: Class XII (12th) ────────────────────────────────────────────
    const resultXII = await processClassPhotos(
      classXIITempPath,
      '12th',
      'xii',
      Candidate,
      job,
      52,  // progressStart
      97   // progressEnd
    );

    await OnboardingSession.findByIdAndUpdate(sessionId, {
      $set: {
        'steps.attendanceUploadXII.status': 'completed',
        'steps.attendanceUploadXII.completedAt': new Date(),
        'steps.attendanceUploadXII.recordCount': resultXII.uploaded,
        'steps.attendanceUploadXII.validationWarnings': resultXII.warnings,
      },
    });

    await job.updateProgress({ stage: 'done', percent: 100 });

    // Clean up temp files — they're no longer needed after processing
    await Promise.allSettled([
      fs.promises.unlink(classXTempPath),
      fs.promises.unlink(classXIITempPath),
    ]);

    return {
      classX: { uploaded: resultX.uploaded, warnings: resultX.warnings },
      classXII: { uploaded: resultXII.uploaded, warnings: resultXII.warnings },
    };
  },
  {
    connection: getRedisConnection(),
    concurrency: 2, // process up to 2 tenants' PDFs in parallel
  }
);

worker.on('completed', (job, result) => {
  console.log(
    `[attendance-worker] Job ${job.id} completed — X: ${result.classX.uploaded} photos, XII: ${result.classXII.uploaded} photos`
      .green
  );
});

worker.on('failed', (job, err) => {
  console.error(`[attendance-worker] Job ${job?.id} failed: ${err.message}`.red);
});

worker.on('error', (err) => {
  console.error('[attendance-worker] Worker error:', err.message);
});

module.exports = worker;
