const CBSEDatesheetParser = require('../../utils/cbseDatesheetParser');
const { uploadDocumentToCloudinary } = require('../../config/cloudinary');

// Upload and parse CBSE datesheet PDF
exports.uploadDatesheet = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const file = req.files.file;
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
    }

    const { academicYear, title } = req.body;
    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic year is required' });
    }

    const { MasterCBSEDatesheet } = req.platformModels;

    // Parse PDF using existing parser
    const parser = new CBSEDatesheetParser();
    const result = await parser.parsePDF(file.data);

    if (!result.success || result.data.entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse datesheet PDF or no entries found',
        error: result.error,
      });
    }

    const entries = result.data.entries;
    const statistics = parser.getStatistics(entries);

    // Calculate date range
    const dates = entries.map(e => new Date(e.examDate)).filter(d => !isNaN(d));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));

    // Optionally upload PDF to Cloudinary for archival
    let cloudinaryUrl, cloudinaryPublicId;
    try {
      const fileInput = file.tempFilePath || file.data;
      const cloudResult = await uploadDocumentToCloudinary(
        fileInput,
        'master-datesheets',
        `datesheet-${academicYear.replace(/\//g, '-')}-${Date.now()}`
      );
      cloudinaryUrl = cloudResult.url;
      cloudinaryPublicId = cloudResult.publicId;
    } catch (cloudErr) {
      console.warn('Cloudinary archival failed (non-critical):', cloudErr.message);
    }

    // Deactivate previous active datesheets
    await MasterCBSEDatesheet.updateMany({ isActive: true }, { isActive: false });

    // Create new master datesheet
    const datesheet = await MasterCBSEDatesheet.create({
      title: title || 'CBSE Full Datesheet',
      academicYear,
      totalEntries: entries.length,
      dateRange: { startDate, endDate },
      statistics: {
        total: statistics.total,
        class10th: statistics.class10th,
        class12th: statistics.class12th,
        uniqueDates: statistics.dates,
        uniqueSubjects: statistics.subjects,
      },
      entries,
      isActive: true,
      uploadedBy: req.platformUser?._id || null,
      cloudinaryUrl,
      cloudinaryPublicId,
    });

    res.json({
      success: true,
      message: `Datesheet uploaded with ${entries.length} entries`,
      data: {
        datesheet: {
          _id: datesheet._id,
          title: datesheet.title,
          academicYear: datesheet.academicYear,
          totalEntries: datesheet.totalEntries,
          dateRange: datesheet.dateRange,
          statistics: datesheet.statistics,
        },
      },
    });
  } catch (error) {
    console.error('Datesheet upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading datesheet', error: error.message });
  }
};

// List all master datesheets
exports.listDatesheets = async (req, res) => {
  try {
    const { MasterCBSEDatesheet } = req.platformModels;

    const datesheets = await MasterCBSEDatesheet.find()
      .select('-entries')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: datesheets });
  } catch (error) {
    console.error('List datesheets error:', error);
    res.status(500).json({ success: false, message: 'Error listing datesheets', error: error.message });
  }
};

// Get a single datesheet with all entries
exports.getDatesheet = async (req, res) => {
  try {
    const { MasterCBSEDatesheet } = req.platformModels;
    const { id } = req.params;

    const datesheet = await MasterCBSEDatesheet.findById(id).lean();
    if (!datesheet) {
      return res.status(404).json({ success: false, message: 'Datesheet not found' });
    }

    res.json({ success: true, data: datesheet });
  } catch (error) {
    console.error('Get datesheet error:', error);
    res.status(500).json({ success: false, message: 'Error getting datesheet', error: error.message });
  }
};

// Soft delete a datesheet
exports.deleteDatesheet = async (req, res) => {
  try {
    const { MasterCBSEDatesheet } = req.platformModels;
    const { id } = req.params;

    const datesheet = await MasterCBSEDatesheet.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!datesheet) {
      return res.status(404).json({ success: false, message: 'Datesheet not found' });
    }

    res.json({ success: true, message: 'Datesheet deleted', data: { _id: datesheet._id } });
  } catch (error) {
    console.error('Delete datesheet error:', error);
    res.status(500).json({ success: false, message: 'Error deleting datesheet', error: error.message });
  }
};
