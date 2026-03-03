const fs = require('fs').promises;
const { AttendanceRecord, AttendanceUpload } = require('../models/AttendanceRecord');
const Candidate = require('../models/Candidate');
const { cloudinary, uploadDocumentToCloudinary, uploadToCloudinary } = require('../config/cloudinary');
const { parseAttendanceSheetPdf } = require('../utils/attendanceSheetParser');

/**
 * Save absentees (bulk upsert).
 * Body: { absentees: [{ candidateId, examDate, subjectCode, class, isAbsent }] }
 *
 * Records with isAbsent=true are upserted; records with isAbsent=false are removed
 * so the collection only stores actual absences.
 */
exports.saveAbsentees = async (req, res) => {
  try {
    const { absentees } = req.body;

    if (!Array.isArray(absentees)) {
      return res.status(400).json({ message: 'absentees must be an array' });
    }

    const AttendanceRecordModel = req.models?.AttendanceRecord || AttendanceRecord;

    const toUpsert = absentees.filter((a) => a.isAbsent);
    const toRemove = absentees.filter((a) => !a.isAbsent);

    // Bulk upsert absent records
    const bulkOps = toUpsert.map((a) => ({
      updateOne: {
        filter: {
          candidateId: a.candidateId,
          examDate: a.examDate,
          subjectCode: a.subjectCode,
        },
        update: {
          $set: {
            candidateId: a.candidateId,
            examDate: a.examDate,
            subjectCode: a.subjectCode,
            class: a.class,
            isAbsent: true,
          },
        },
        upsert: true,
      },
    }));

    // Remove records that are no longer absent
    const removeOps = toRemove.map((a) => ({
      deleteOne: {
        filter: {
          candidateId: a.candidateId,
          examDate: a.examDate,
          subjectCode: a.subjectCode,
        },
      },
    }));

    const allOps = [...bulkOps, ...removeOps];

    let result = { modifiedCount: 0, upsertedCount: 0, deletedCount: 0 };
    if (allOps.length > 0) {
      result = await AttendanceRecordModel.bulkWrite(allOps, { ordered: false });
    }

    res.json({
      success: true,
      message: 'Attendance saved successfully',
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      removed: result.deletedCount || 0,
    });
  } catch (error) {
    console.error('Save Absentees Error:', error);
    res.status(500).json({
      message: 'Failed to save attendance',
      error: error.message,
    });
  }
};

/**
 * Get absentees, optionally filtered by class.
 * Query params: ?class=X or ?class=XII
 * Returns all attendance records (isAbsent=true) for the current academic session.
 */
exports.getAbsentees = async (req, res) => {
  try {
    const AttendanceRecordModel = req.models?.AttendanceRecord || AttendanceRecord;

    const filter = { isAbsent: true };
    if (req.query.class) {
      filter.class = req.query.class;
    }

    const records = await AttendanceRecordModel.find(filter).lean();

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Get Absentees Error:', error);
    res.status(500).json({
      message: 'Failed to fetch absentees',
      error: error.message,
    });
  }
};

/**
 * Upload candidate photo buffer to Cloudinary as an image.
 * Uses upload_stream since we have a Buffer, not a file path.
 */
const uploadPhotoBufferToCloudinary = async (buffer, rollNumber) => {
  const folder = 'sems/candidate-photos';
  const publicId = `${rollNumber}_${Date.now()}`;

  const options = {
    folder,
    public_id: publicId,
    resource_type: 'image',
    transformation: [
      { width: 300, height: 300, crop: 'limit' },
      { quality: 'auto' },
    ],
  };

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }).end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

/**
 * Upload attendance sheet document (image or PDF) for a class.
 * If it's a PDF, also extract candidate photos and update Candidate records.
 * Expects: file in req.files.file, class in req.body.class ('X' or 'XII')
 */
exports.uploadAttendanceSheet = async (req, res) => {
  let tempFilePath = null;

  try {
    const AttendanceUploadModel = req.models?.AttendanceUpload || AttendanceUpload;
    const CandidateModel = req.models?.Candidate || Candidate;

    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const classValue = req.body.class;
    if (!classValue || !['X', 'XII'].includes(classValue)) {
      return res.status(400).json({ message: `class must be "X" or "XII", got: "${classValue}"` });
    }

    const { file } = req.files;
    tempFilePath = file.tempFilePath;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';

    // Try uploading the file itself to Cloudinary (best-effort for large files)
    let fileUrl = null;
    let filePublicId = null;
    try {
      const folder = 'sems/attendance-sheets';
      const uploadResult = await uploadDocumentToCloudinary(tempFilePath, folder);
      fileUrl = uploadResult.url;
      filePublicId = uploadResult.publicId;
    } catch (cloudErr) {
      console.warn(`[Attendance Upload] Cloudinary raw upload skipped (${cloudErr.message}). Proceeding with photo extraction.`);
    }

    // Save upload record (fileUrl/publicId will be null if Cloudinary upload was skipped)
    const uploadRecord = await AttendanceUploadModel.create({
      class: classValue,
      fileUrl: fileUrl || null,
      publicId: filePublicId || null,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    // If it's a PDF, extract candidate photos
    let photoResults = { extracted: 0, updated: 0, errors: [] };

    if (isPdf) {
      console.log('[Attendance Upload] PDF detected — extracting candidate photos...');
      const pdfBuffer = await fs.readFile(tempFilePath);
      const parseResult = await parseAttendanceSheetPdf(pdfBuffer);

      if (parseResult.success && parseResult.data.length > 0) {
        console.log(`[Attendance Upload] Extracted ${parseResult.data.length} candidate photos, uploading to Cloudinary...`);

        let updatedCount = 0;

        // Process photos in batches of 5 to avoid overwhelming Cloudinary
        const batchSize = 5;
        for (let i = 0; i < parseResult.data.length; i += batchSize) {
          const batch = parseResult.data.slice(i, i + batchSize);

          const batchPromises = batch.map(async ({ rollNumber, imageBuffer }) => {
            try {
              // Upload photo to Cloudinary
              const photoUpload = await uploadPhotoBufferToCloudinary(imageBuffer, rollNumber);

              // Update the matching Candidate record
              const result = await CandidateModel.findOneAndUpdate(
                { rollNumber: rollNumber.toUpperCase() },
                {
                  $set: {
                    photoUrl: photoUpload.url,
                    photoPublicId: photoUpload.publicId,
                  },
                },
                { new: true }
              );

              if (result) {
                updatedCount++;
                return { rollNumber, status: 'updated' };
              }
              return { rollNumber, status: 'not_found' };
            } catch (err) {
              console.warn(`[Attendance Upload] Failed to process photo for roll ${rollNumber}:`, err.message);
              return { rollNumber, status: 'error', error: err.message };
            }
          });

          await Promise.all(batchPromises);
        }

        photoResults = {
          extracted: parseResult.data.length,
          updated: updatedCount,
          errors: parseResult.errors,
        };

        console.log(`[Attendance Upload] Photo extraction complete: ${parseResult.data.length} extracted, ${updatedCount} candidates updated`);
      } else {
        photoResults.errors = parseResult.errors;
        console.warn('[Attendance Upload] No photos extracted from PDF:', parseResult.errors.slice(0, 3));
      }
    }

    // Clean up temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    const parts = [`Attendance sheet processed for Class ${classValue}.`];
    if (!fileUrl) parts.push('PDF too large for cloud storage — stored locally.');
    if (isPdf) parts.push(`${photoResults.extracted} photos extracted, ${photoResults.updated} candidates updated.`);

    res.json({
      success: true,
      message: parts.join(' '),
      data: uploadRecord,
      photoResults: isPdf ? photoResults : undefined,
    });
  } catch (error) {
    console.error('[Attendance Upload] Error:', error.message);
    console.error('[Attendance Upload] Stack:', error.stack);

    // Clean up temp file on error
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    res.status(500).json({
      message: 'Failed to upload attendance sheet',
      error: error.message,
    });
  }
};

/**
 * Get uploaded attendance sheets, optionally filtered by class.
 * Query params: ?class=X or ?class=XII
 */
exports.getAttendanceSheets = async (req, res) => {
  try {
    const AttendanceUploadModel = req.models?.AttendanceUpload || AttendanceUpload;

    const filter = {};
    if (req.query.class) {
      filter.class = req.query.class;
    }

    const uploads = await AttendanceUploadModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: uploads,
    });
  } catch (error) {
    console.error('Get Attendance Sheets Error:', error);
    res.status(500).json({
      message: 'Failed to fetch attendance sheets',
      error: error.message,
    });
  }
};
