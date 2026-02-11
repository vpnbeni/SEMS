const { uploadDocumentToCloudinary, deleteRawFromCloudinary } = require('../../config/cloudinary');
const { parseGuidelinesPdf } = require('../../utils/guidelinesParser');

// Upload guidelines PDF
exports.uploadGuidelines = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const file = req.files.file;
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
    }

    const { title, academicYear } = req.body;
    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic year is required' });
    }

    const { MasterGuideline } = req.platformModels;

    // Upload to shared Cloudinary path (overwrites existing)
    const fileInput = file.tempFilePath || file.data;
    const { url, publicId } = await uploadDocumentToCloudinary(
      fileInput,
      'guidelines',
      'centre-guidelines'
    );

    // Parse PDF for structured content
    let parsedStructure = { chapters: [], appendices: [], guidelines: [], headings: [] };
    let metadata = { pages: 0, fileSize: file.size || 0, totalCharacters: 0 };

    try {
      const parsed = await parseGuidelinesPdf(file.data);
      parsedStructure = parsed.structure;
      metadata = { ...metadata, pages: parsed.metadata.pages, totalCharacters: parsed.metadata.totalCharacters };
    } catch (parseErr) {
      console.warn('Guidelines parsing failed (non-critical):', parseErr.message);
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

    if (removeCloudinary && guideline.cloudinaryPublicId) {
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
