const {
  DEFAULT_GOVT_SCHOOL_KEYWORDS,
} = require('../../models/platform/SchoolDirectoryTypeSettings');

const normalizeKeywords = (keywords = []) => Array.from(new Set(
  (Array.isArray(keywords) ? keywords : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
));

exports.getSettings = async (req, res) => {
  try {
    const { SchoolDirectoryTypeSettings } = req.platformModels;
    const doc = await SchoolDirectoryTypeSettings.findOne({ isActive: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        govtKeywords: doc?.govtKeywords?.length ? doc.govtKeywords : [...DEFAULT_GOVT_SCHOOL_KEYWORDS],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school directory type settings',
      error: error.message,
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { SchoolDirectoryTypeSettings } = req.platformModels;
    const govtKeywords = normalizeKeywords(req.body?.govtKeywords);

    if (govtKeywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one government-school keyword is required',
      });
    }

    const doc = await SchoolDirectoryTypeSettings.findOneAndUpdate(
      { isActive: true },
      {
        $set: {
          govtKeywords,
          isActive: true,
          updatedBy: req.platformUser?._id || null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    res.json({
      success: true,
      message: 'School type keywords updated',
      data: {
        govtKeywords: doc.govtKeywords,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update school directory type settings',
      error: error.message,
    });
  }
};
