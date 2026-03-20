const {
  DEFAULT_MASTER_PACKING_DISPATCH,
} = require('../../services/masterPackingDispatchService');

const normalizePayload = (body = {}) => ({
  packingClothColor: String(body.packingClothColor || ''),
  packingMarker: String(body.packingMarker || ''),
  packingClothColorClass10: String(body.packingClothColorClass10 || ''),
  packingMarkerClass10: String(body.packingMarkerClass10 || ''),
  packingClothColorClass12: String(body.packingClothColorClass12 || ''),
  packingMarkerClass12: String(body.packingMarkerClass12 || ''),
  dispatchSlipToAddress: String(body.dispatchSlipToAddress || ''),
  dispatchSlipFromAddress: String(body.dispatchSlipFromAddress || ''),
  dispatchSlipInsuredAmount: String(body.dispatchSlipInsuredAmount || '1000'),
});

exports.getCurrentSettings = async (req, res) => {
  try {
    const { MasterPackingDispatch } = req.platformModels;
    const doc = await MasterPackingDispatch.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1 }).lean();

    res.json({
      success: true,
      data: doc ? normalizePayload(doc) : { ...DEFAULT_MASTER_PACKING_DISPATCH },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packing and dispatch settings',
      error: error.message,
    });
  }
};

exports.upsertSettings = async (req, res) => {
  try {
    const { MasterPackingDispatch } = req.platformModels;
    const payload = normalizePayload(req.body || {});

    const doc = await MasterPackingDispatch.findOneAndUpdate(
      { isActive: true },
      {
        $set: {
          ...payload,
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
      message: 'Packing and dispatch settings updated',
      data: normalizePayload(doc),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update packing and dispatch settings',
      error: error.message,
    });
  }
};
