const { uploadDocumentToCloudinary, cloudinary, deleteRawFromCloudinary } = require('../config/cloudinary');
const { parseGuidelinesPdf } = require('../utils/guidelinesParser');

const GUIDELINES_PUBLIC_ID = 'guidelines/centre-guidelines';

const isValidPdfBuffer = (buffer) => {
  if (!buffer || buffer.length < 8) return false;
  const header = buffer.subarray(0, 5).toString('utf8');
  if (!header.startsWith('%PDF-')) return false;
  const trailerProbe = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('utf8');
  return trailerProbe.includes('%%EOF');
};

async function getActiveTenantGuideline(req) {
  try {
    const Guideline = req.models?.Guideline;
    if (!Guideline) return null;
    return await Guideline.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();
  } catch {
    return null;
  }
}

async function resolveGuidelinesSource(req) {
  const tenantGuideline = await getActiveTenantGuideline(req);
  if (tenantGuideline?.cloudinaryUrl || tenantGuideline?.cloudinaryPublicId) {
    return {
      publicId: tenantGuideline.cloudinaryPublicId || null,
      url: tenantGuideline.cloudinaryUrl || null,
    };
  }

  return {
    publicId: GUIDELINES_PUBLIC_ID,
    url: null,
  };
}

/**
 * Fetch the guidelines PDF buffer from Cloudinary (if uploaded).
 * @param {{ publicId?: string|null, url?: string|null }} source
 * @returns {Promise<Buffer|null>} - PDF buffer or null if not found
 */
async function getGuidelinesPdfBuffer(source = {}) {
  const publicId = source?.publicId ? String(source.publicId) : '';
  const isLocalReference = publicId.startsWith('local:');
  if (publicId && !isLocalReference) {
    try {
      const resource = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
      const response = await fetch(resource.secure_url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err.error?.http_code === 404) return null;
      throw err;
    }
  }

  const directUrl = source?.url ? String(source.url) : '';
  if (directUrl) {
    const response = await fetch(directUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  try {
    const resource = await cloudinary.api.resource(GUIDELINES_PUBLIC_ID, { resource_type: 'raw' });
    const response = await fetch(resource.secure_url);
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
    if (pdfFile.truncated) {
      return res.status(413).json({
        success: false,
        message: 'Uploaded file exceeds the server size limit. Please upload a smaller PDF.'
      });
    }

    if (pdfFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    const fileBuffer = pdfFile.tempFilePath
      ? require('fs').readFileSync(pdfFile.tempFilePath)
      : pdfFile.data;

    if (!isValidPdfBuffer(fileBuffer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or corrupted PDF. Please upload a valid PDF file.'
      });
    }

    const fileInput = pdfFile.tempFilePath || fileBuffer;
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
    const source = await resolveGuidelinesSource(req);
    const dataBuffer = await getGuidelinesPdfBuffer(source);
    if (!dataBuffer) {
      return res.status(404).json({
        success: false,
        message: 'Guidelines PDF not found'
      });
    }

    let parsed = null;
    try {
      parsed = await parseGuidelinesPdf(dataBuffer);
    } catch (parseError) {
      console.warn('Guidelines parse failed; returning fallback structure:', parseError.message);
      parsed = {
        metadata: {
          pages: 0,
          totalCharacters: 0,
        },
        structure: {
          chapters: [],
          appendices: [],
          guidelines: [],
          headings: [],
        },
        fullText: '',
      };
    }

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
    const source = await resolveGuidelinesSource(req);
    const dataBuffer = await getGuidelinesPdfBuffer(source);
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
    const source = await resolveGuidelinesSource(req);
    const buffer = await getGuidelinesPdfBuffer(source);
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
    const source = await resolveGuidelinesSource(req);
    const publicId = String(source?.publicId || GUIDELINES_PUBLIC_ID);
    const isLocalReference = publicId.startsWith('local:');

    if (!isLocalReference) {
      const resource = await cloudinary.api.resource(publicId, { resource_type: 'raw' }).catch((err) => {
        if (err.error?.http_code === 404) return null;
        throw err;
      });
      if (resource?.secure_url) {
        return res.json({
          success: true,
          exists: true,
          path: resource.secure_url
        });
      }
    }

    if (source?.url) {
      return res.json({
        success: true,
        exists: true,
        path: source.url
      });
    }

    return res.json({ success: true, exists: false });
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
