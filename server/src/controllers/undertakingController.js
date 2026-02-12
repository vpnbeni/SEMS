const sanitizeFileName = (value) => String(value || 'undertaking-form')
  .replace(/[^a-zA-Z0-9-_ ]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .toLowerCase();

// Get current rolled-out undertaking metadata
exports.getCurrentUndertaking = async (req, res) => {
  try {
    const Undertaking = req.models.Undertaking;
    const undertaking = await Undertaking.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: undertaking || null,
    });
  } catch (error) {
    console.error('Get current undertaking error:', error);
    res.status(500).json({ success: false, message: 'Error fetching undertaking', error: error.message });
  }
};

// Download current undertaking PDF
exports.downloadCurrentUndertaking = async (req, res) => {
  try {
    const Undertaking = req.models.Undertaking;
    const undertaking = await Undertaking.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    if (!undertaking?.cloudinaryUrl) {
      return res.status(404).json({ success: false, message: 'No undertaking has been rolled out yet' });
    }

    const response = await fetch(undertaking.cloudinaryUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch undertaking file (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const baseName = sanitizeFileName(`${undertaking.title || 'undertaking'}-${undertaking.academicYear || ''}`);
    const filename = `${baseName || 'undertaking-form'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Download undertaking error:', error);
    res.status(500).json({ success: false, message: 'Error downloading undertaking', error: error.message });
  }
};
