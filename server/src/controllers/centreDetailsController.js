const asyncHandler = require('../middleware/asyncHandler');
const { generateResponse } = require('../utils/helpers');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../utils/constants');

// @desc    Get current centre details
// @route   GET /api/centre-details
// @access  Private
const getCentreDetails = asyncHandler(async (req, res) => {
  const CentreDetail = req.models.CentreDetail;
  const details = await CentreDetail.findOne({}).sort({ updatedAt: -1 }).lean();

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, details || null)
  );
});

// @desc    Save/update centre details
// @route   PUT /api/centre-details
// @access  Private
const upsertCentreDetails = asyncHandler(async (req, res) => {
  const CentreDetail = req.models.CentreDetail;

  const centreName = String(req.body.centreName || '').trim();
  const centreSchoolCode = String(req.body.centreSchoolCode || '').trim();
  const linkedCentreName = centreSchoolCode ? centreName : '';
  const linkedCentreSchoolCode = centreName ? centreSchoolCode : '';

  const payload = {
    centreNo: req.body.centreNo || '',
    centreName: linkedCentreName,
    centreSchoolCode: linkedCentreSchoolCode,
    centreSuperintendent: req.body.centreSuperintendent || '',
    centreSuperintendentContact: req.body.centreSuperintendentContact || '',
    deputyCentreSuperintendent: req.body.deputyCentreSuperintendent || '',
    deputyCentreSuperintendentContact: req.body.deputyCentreSuperintendentContact || '',
    centreClerk: req.body.centreClerk || '',
    centreClerkContact: req.body.centreClerkContact || '',
    packingClothColor: req.body.packingClothColor || '',
    packingMarker: req.body.packingMarker || '',
  };

  const existing = await CentreDetail.findOne({}).sort({ updatedAt: -1 });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return res.status(HTTP_STATUS.OK).json(
      generateResponse(true, SUCCESS_MESSAGES.UPDATED, existing)
    );
  }

  const created = await CentreDetail.create(payload);
  return res.status(HTTP_STATUS.CREATED).json(
    generateResponse(true, SUCCESS_MESSAGES.CREATED, created)
  );
});

module.exports = {
  getCentreDetails,
  upsertCentreDetails,
};
