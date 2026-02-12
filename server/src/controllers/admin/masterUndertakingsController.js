const fs = require('fs');
const { uploadDocumentToCloudinary, deleteRawFromCloudinary } = require('../../config/cloudinary');

const getFileBuffer = (file) => {
  if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
    return fs.readFileSync(file.tempFilePath);
  }

  if (file?.data && Buffer.isBuffer(file.data) && file.data.length > 0) {
    return file.data;
  }

  throw new Error('Uploaded file is empty or unavailable');
};

// Upload undertaking PDF
exports.uploadUndertaking = async (req, res) => {
  let file = null;

  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    file = req.files.file;
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
    }

    const { title, academicYear } = req.body;
    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic year is required' });
    }

    const { MasterUndertaking } = req.platformModels;

    const fileBuffer = getFileBuffer(file);
    const fileInput = file.tempFilePath || fileBuffer;
    const { url, publicId } = await uploadDocumentToCloudinary(
      fileInput,
      'undertakings',
      `undertaking-${academicYear.replace(/[^a-zA-Z0-9-]/g, '-')}`
    );

    await MasterUndertaking.updateMany({ isActive: true }, { isActive: false });

    const undertaking = await MasterUndertaking.create({
      title: title || 'Undertaking Form for Exam Functionaries',
      academicYear,
      cloudinaryUrl: url,
      cloudinaryPublicId: publicId,
      metadata: {
        fileSize: file.size || fileBuffer.length || 0,
      },
      isActive: true,
      uploadedBy: req.platformUser?._id || null,
    });

    res.json({
      success: true,
      message: 'Undertaking uploaded successfully',
      data: undertaking,
    });
  } catch (error) {
    console.error('Undertaking upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading undertaking', error: error.message });
  } finally {
    if (file?.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
  }
};

// List all master undertakings
exports.listUndertakings = async (req, res) => {
  try {
    const { MasterUndertaking } = req.platformModels;

    const undertakings = await MasterUndertaking.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: undertakings });
  } catch (error) {
    console.error('List undertakings error:', error);
    res.status(500).json({ success: false, message: 'Error listing undertakings', error: error.message });
  }
};

// Get one master undertaking
exports.getUndertaking = async (req, res) => {
  try {
    const { MasterUndertaking } = req.platformModels;
    const { id } = req.params;

    const undertaking = await MasterUndertaking.findById(id).lean();
    if (!undertaking) {
      return res.status(404).json({ success: false, message: 'Undertaking not found' });
    }

    res.json({ success: true, data: undertaking });
  } catch (error) {
    console.error('Get undertaking error:', error);
    res.status(500).json({ success: false, message: 'Error getting undertaking', error: error.message });
  }
};

// Get current active undertaking
exports.getCurrentUndertaking = async (req, res) => {
  try {
    const { MasterUndertaking } = req.platformModels;

    const undertaking = await MasterUndertaking.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: undertaking || null });
  } catch (error) {
    console.error('Get current undertaking error:', error);
    res.status(500).json({ success: false, message: 'Error getting current undertaking', error: error.message });
  }
};

// Soft delete undertaking
exports.deleteUndertaking = async (req, res) => {
  try {
    const { MasterUndertaking } = req.platformModels;
    const { id } = req.params;
    const removeCloudinary = String(req.query.removeFromCloudinary || '').toLowerCase() === 'true';

    const undertaking = await MasterUndertaking.findById(id);
    if (!undertaking) {
      return res.status(404).json({ success: false, message: 'Undertaking not found' });
    }

    if (removeCloudinary && undertaking.cloudinaryPublicId) {
      await deleteRawFromCloudinary(undertaking.cloudinaryPublicId);
    }

    undertaking.isActive = false;
    await undertaking.save();

    res.json({
      success: true,
      message: removeCloudinary ? 'Undertaking deleted and Cloudinary asset removed' : 'Undertaking deleted',
      data: { _id: undertaking._id },
    });
  } catch (error) {
    console.error('Delete undertaking error:', error);
    res.status(500).json({ success: false, message: 'Error deleting undertaking', error: error.message });
  }
};
