const CBSECircular = require('../models/CBSECircular');

exports.getCirculars = async (req, res) => {
  try {
    const CircularModel = req.models?.CBSECircular || CBSECircular;
    const circulars = await CircularModel.find({ isActive: true })
      .sort({ publishDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: circulars
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch CBSE circulars',
      error: error.message
    });
  }
};

exports.createCircular = async (req, res) => {
  try {
    const CircularModel = req.models?.CBSECircular || CBSECircular;
    const {
      title,
      circularNumber,
      publishDate,
      sourceUrl,
      summary
    } = req.body || {};

    if (!title || !publishDate) {
      return res.status(400).json({
        success: false,
        message: 'title and publishDate are required'
      });
    }

    const created = await CircularModel.create({
      title,
      circularNumber,
      publishDate,
      sourceUrl,
      summary
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: 'CBSE circular added successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create CBSE circular',
      error: error.message
    });
  }
};

exports.deleteCircular = async (req, res) => {
  try {
    const CircularModel = req.models?.CBSECircular || CBSECircular;
    const { id } = req.params;

    const updated = await CircularModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Circular not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'CBSE circular deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete CBSE circular',
      error: error.message
    });
  }
};
