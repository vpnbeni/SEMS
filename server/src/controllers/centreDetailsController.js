const asyncHandler = require('../middleware/asyncHandler');
const { generateResponse } = require('../utils/helpers');
const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../utils/constants');
const { mergePackingDispatchIntoCentreDetails } = require('../services/masterPackingDispatchService');

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const readBodyString = (body, key, fallback = '') => (
  hasOwn(body, key) ? String(body[key] || '') : fallback
);

// @desc    Get current centre details
// @route   GET /api/centre-details
// @access  Private
const getCentreDetails = asyncHandler(async (req, res) => {
  const CentreDetail = req.models.CentreDetail;
  const details = await CentreDetail.findOne({}).sort({ updatedAt: -1 }).lean();
  const mergedDetails = await mergePackingDispatchIntoCentreDetails(details);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, SUCCESS_MESSAGES.FETCHED, mergedDetails || null)
  );
});

// @desc    Save/update centre details
// @route   PUT /api/centre-details
// @access  Private
const upsertCentreDetails = asyncHandler(async (req, res) => {
  const CentreDetail = req.models.CentreDetail;
  const existing = await CentreDetail.findOne({}).sort({ updatedAt: -1 });

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
    packingClothColor: readBodyString(req.body, 'packingClothColor', existing?.packingClothColor || ''),
    packingMarker: readBodyString(req.body, 'packingMarker', existing?.packingMarker || ''),
    packingClothColorClass10: readBodyString(req.body, 'packingClothColorClass10', existing?.packingClothColorClass10 || ''),
    packingMarkerClass10: readBodyString(req.body, 'packingMarkerClass10', existing?.packingMarkerClass10 || ''),
    packingClothColorClass12: readBodyString(req.body, 'packingClothColorClass12', existing?.packingClothColorClass12 || ''),
    packingMarkerClass12: readBodyString(req.body, 'packingMarkerClass12', existing?.packingMarkerClass12 || ''),
    dispatchSlipToAddress: readBodyString(req.body, 'dispatchSlipToAddress', existing?.dispatchSlipToAddress || ''),
    dispatchSlipFromAddress: readBodyString(req.body, 'dispatchSlipFromAddress', existing?.dispatchSlipFromAddress || ''),
    dispatchSlipInsuredAmount: readBodyString(req.body, 'dispatchSlipInsuredAmount', existing?.dispatchSlipInsuredAmount || '1000'),
  };

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
