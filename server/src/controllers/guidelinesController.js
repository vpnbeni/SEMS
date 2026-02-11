const { uploadDocumentToCloudinary, cloudinary, deleteRawFromCloudinary } = require('../config/cloudinary');
const { parseGuidelinesPdf } = require('../utils/guidelinesParser');

const GUIDELINES_PUBLIC_ID = 'guidelines/centre-guidelines';

/**
 * Fetch the guidelines PDF buffer from Cloudinary (if uploaded).
 * @returns {Promise<Buffer|null>} - PDF buffer or null if not found
 */
async function getGuidelinesPdfBuffer() {
  try {
    const resource = await cloudinary.api.resource(GUIDELINES_PUBLIC_ID, { resource_type: 'raw' });
    const url = resource.secure_url;
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    if (err.error?.http_code === 404) return null;
    throw err;
  }
}

// Upload guidelines PDF
exports.uploadGuidelines = async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const pdfFile = req.files.pdf;

    if (pdfFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    const fileInput = pdfFile.tempFilePath || pdfFile.data;
    const { url } = await uploadDocumentToCloudinary(
      fileInput,
      'guidelines',
      'centre-guidelines'
    );

    res.json({
      success: true,
      message: 'Guidelines uploaded successfully',
      path: url
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading guidelines',
      error: error.message
    });
  }
};

// Parse and extract guidelines structure
exports.parseGuidelines = async (req, res) => {
  try {
    const dataBuffer = await getGuidelinesPdfBuffer();
    if (!dataBuffer) {
      return res.status(404).json({
        success: false,
        message: 'Guidelines PDF not found'
      });
    }

    const parsed = await parseGuidelinesPdf(dataBuffer);

    res.json({
      success: true,
      data: parsed
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      success: false,
      message: 'Error parsing guidelines',
      error: error.message
    });
  }
};

// Search within guidelines
exports.searchGuidelines = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 3 characters'
      });
    }

    const pdf = require('pdf-parse');
    const dataBuffer = await getGuidelinesPdfBuffer();
    if (!dataBuffer) {
      return res.status(404).json({
        success: false,
        message: 'Guidelines PDF not found'
      });
    }
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Search for the query (case-insensitive)
    const searchRegex = new RegExp(`.{0,100}${query}.{0,100}`, 'gi');
    const matches = [];
    let match;

    while ((match = searchRegex.exec(text)) !== null) {
      matches.push({
        text: match[0].trim(),
        index: match.index
      });

      if (matches.length >= 20) break; // Limit to 20 results
    }

    res.json({
      success: true,
      query,
      totalMatches: matches.length,
      results: matches
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching guidelines',
      error: error.message
    });
  }
};

// Stream PDF for in-browser viewing (inline, not download)
exports.getGuidelinesFile = async (req, res) => {
  try {
    const buffer = await getGuidelinesPdfBuffer();
    if (!buffer) {
      return res.status(404).json({
        success: false,
        message: 'Guidelines PDF not found'
      });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Get guidelines file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving guidelines PDF',
      error: error.message
    });
  }
};

// Check if guidelines exist
exports.checkGuidelines = async (req, res) => {
  try {
    const resource = await cloudinary.api.resource(GUIDELINES_PUBLIC_ID, { resource_type: 'raw' }).catch((err) => {
      if (err.error?.http_code === 404) return null;
      throw err;
    });
    if (!resource) {
      return res.json({ success: true, exists: false });
    }
    res.json({
      success: true,
      exists: true,
      path: resource.secure_url
    });
  } catch (error) {
    console.error('Check guidelines error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking guidelines',
      error: error.message
    });
  }
};

// Delete guidelines
exports.deleteGuidelines = async (req, res) => {
  try {
    await deleteRawFromCloudinary(GUIDELINES_PUBLIC_ID);
    res.json({
      success: true,
      message: 'Guidelines deleted successfully'
    });
  } catch (error) {
    if (error.message && error.message.includes('Failed to delete')) {
      return res.status(404).json({
        success: false,
        message: 'Guidelines PDF not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error deleting guidelines',
      error: error.message
    });
  }
};
