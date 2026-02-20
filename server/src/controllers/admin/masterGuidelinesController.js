const fs = require('fs');
const path = require('path');
const { uploadDocumentToCloudinary, deleteRawFromCloudinary } = require('../../config/cloudinary');
const { parseGuidelinesPdf } = require('../../utils/guidelinesParser');

const getFileBuffer = (file) => {
  if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
    return fs.readFileSync(file.tempFilePath);
  }

  if (file?.data && Buffer.isBuffer(file.data) && file.data.length > 0) {
    return file.data;
  }

  throw new Error('Uploaded file is empty or unavailable');
};

const isValidPdfBuffer = (buffer) => {
  if (!buffer || buffer.length < 8) return false;
  const header = buffer.subarray(0, 5).toString('utf8');
  if (!header.startsWith('%PDF-')) return false;
  const trailerProbe = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('utf8');
  return trailerProbe.includes('%%EOF');
};

const saveGuidelinesPdfLocally = (buffer, req) => {
  const uploadsRoot = path.resolve(__dirname, '../../../uploads');
  const guidelinesDir = path.join(uploadsRoot, 'guidelines');
  if (!fs.existsSync(guidelinesDir)) {
    fs.mkdirSync(guidelinesDir, { recursive: true });
  }

  const fileName = `centre-guidelines-${Date.now()}.pdf`;
  const absolutePath = path.join(guidelinesDir, fileName);
  fs.writeFileSync(absolutePath, buffer);

  const apiBaseUrl = String(process.env.API_URL || '').trim();
  const originFromRequest = req?.get ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5000';
  const publicBase = apiBaseUrl ? apiBaseUrl.replace(/\/api\/?$/, '') : originFromRequest;
  const publicUrl = `${publicBase.replace(/\/+$/, '')}/uploads/guidelines/${fileName}`;

  return {
    url: publicUrl,
    publicId: `local:guidelines/${fileName}`,
  };
};

const withTimeout = async (promise, timeoutMs) => {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// Upload guidelines PDF
exports.uploadGuidelines = async (req, res) => {
  let file = null;

  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    file = req.files.file;
    if (file.truncated) {
      return res.status(413).json({
        success: false,
        message: 'Uploaded file exceeds the server size limit. Please upload a smaller PDF.',
      });
    }
    const fileName = String(file.name || '').toLowerCase();
    const isPdf = file.mimetype === 'application/pdf' || fileName.endsWith('.pdf');
    if (!isPdf) {
      return res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
    }

    const { title, academicYear } = req.body;
    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic year is required' });
    }

    const { MasterGuideline } = req.platformModels;

    // Upload to shared Cloudinary path (overwrites existing)
    const fileBuffer = getFileBuffer(file);
    if (!isValidPdfBuffer(fileBuffer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or corrupted PDF. Please upload a valid PDF file.',
      });
    }
    const fileInput = file.tempFilePath || fileBuffer;
    let uploadResult = null;
    try {
      uploadResult = await uploadDocumentToCloudinary(
        fileInput,
        'guidelines',
        'centre-guidelines'
      );
    } catch (uploadError) {
      const message = String(uploadError?.message || '').toLowerCase();
      const isCloudinarySizeError = message.includes('file size too large') || message.includes('failed to upload document to cloudinary');
      if (!isCloudinarySizeError) {
        throw uploadError;
      }
      // Fallback to local storage when Cloudinary plan/file-size limits reject large PDFs.
      uploadResult = saveGuidelinesPdfLocally(fileBuffer, req);
    }

    const { url, publicId } = uploadResult;

    // Parse PDF for structured content
    let parsedStructure = { chapters: [], appendices: [], guidelines: [], headings: [] };
    let metadata = { pages: 0, fileSize: file.size || 0, totalCharacters: 0 };

    try {
      const parsed = await withTimeout(parseGuidelinesPdf(fileBuffer), 12000);
      parsedStructure = parsed.structure;
      metadata = { ...metadata, pages: parsed.metadata.pages, totalCharacters: parsed.metadata.totalCharacters };
    } catch (parseErr) {
      console.warn('Guidelines parsing skipped/failed (non-critical):', parseErr.message);
    }

    // Deactivate previous active guidelines
    await MasterGuideline.updateMany({ isActive: true }, { isActive: false });

    // Create new master guideline
    const guideline = await MasterGuideline.create({
      title: title || 'Centre Examination Guidelines',
      academicYear,
      cloudinaryUrl: url,
      cloudinaryPublicId: publicId,
      metadata,
      parsedStructure,
      isActive: true,
      uploadedBy: req.platformUser?._id || null,
    });

    res.json({
      success: true,
      message: 'Guidelines uploaded successfully. PDF is now available to all tenants.',
      data: guideline,
    });
  } catch (error) {
    console.error('Guidelines upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading guidelines', error: error.message });
  } finally {
    if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
  }
};

// List all master guidelines
exports.listGuidelines = async (req, res) => {
  try {
    const { MasterGuideline } = req.platformModels;

    const guidelines = await MasterGuideline.find()
      .select('-parsedStructure')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: guidelines });
  } catch (error) {
    console.error('List guidelines error:', error);
    res.status(500).json({ success: false, message: 'Error listing guidelines', error: error.message });
  }
};

// Get a single guideline with parsed structure
exports.getGuideline = async (req, res) => {
  try {
    const { MasterGuideline } = req.platformModels;
    const { id } = req.params;

    const guideline = await MasterGuideline.findById(id).lean();
    if (!guideline) {
      return res.status(404).json({ success: false, message: 'Guideline not found' });
    }

    res.json({ success: true, data: guideline });
  } catch (error) {
    console.error('Get guideline error:', error);
    res.status(500).json({ success: false, message: 'Error getting guideline', error: error.message });
  }
};

// Get current active guideline
exports.getCurrentGuideline = async (req, res) => {
  try {
    const { MasterGuideline } = req.platformModels;

    const guideline = await MasterGuideline.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: guideline || null });
  } catch (error) {
    console.error('Get current guideline error:', error);
    res.status(500).json({ success: false, message: 'Error getting current guideline', error: error.message });
  }
};

// Soft delete a guideline
exports.deleteGuideline = async (req, res) => {
  try {
    const { MasterGuideline } = req.platformModels;
    const { id } = req.params;
    const removeCloudinary = String(req.query.removeFromCloudinary || '').toLowerCase() === 'true';

    const guideline = await MasterGuideline.findById(id);
    if (!guideline) {
      return res.status(404).json({ success: false, message: 'Guideline not found' });
    }

    if (removeCloudinary && guideline.cloudinaryPublicId && !String(guideline.cloudinaryPublicId).startsWith('local:')) {
      await deleteRawFromCloudinary(guideline.cloudinaryPublicId);
    }

    guideline.isActive = false;
    await guideline.save();

    res.json({
      success: true,
      message: removeCloudinary ? 'Guideline deleted and Cloudinary asset removed' : 'Guideline deleted',
      data: { _id: guideline._id },
    });
  } catch (error) {
    console.error('Delete guideline error:', error);
    res.status(500).json({ success: false, message: 'Error deleting guideline', error: error.message });
  }
};
