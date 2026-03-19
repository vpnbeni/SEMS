const { connectPlatformDB } = require('../config/platformDatabase');
const { getPlatformModels } = require('../tenancy/platformModels');

const DEFAULT_MASTER_PACKING_DISPATCH = Object.freeze({
  packingClothColor: '',
  packingMarker: '',
  packingClothColorClass10: '',
  packingMarkerClass10: '',
  packingClothColorClass12: '',
  packingMarkerClass12: '',
  dispatchSlipToAddress: '',
  dispatchSlipFromAddress: '',
  dispatchSlipInsuredAmount: '1000',
});

const SHARED_PACKING_DISPATCH_FIELDS = Object.freeze(Object.keys(DEFAULT_MASTER_PACKING_DISPATCH));

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const normalizeSharedSettings = (value) => {
  const source = value && typeof value === 'object' ? value : {};

  return {
    packingClothColor: String(source.packingClothColor || ''),
    packingMarker: String(source.packingMarker || ''),
    packingClothColorClass10: String(source.packingClothColorClass10 || ''),
    packingMarkerClass10: String(source.packingMarkerClass10 || ''),
    packingClothColorClass12: String(source.packingClothColorClass12 || ''),
    packingMarkerClass12: String(source.packingMarkerClass12 || ''),
    dispatchSlipToAddress: String(source.dispatchSlipToAddress || ''),
    dispatchSlipFromAddress: String(source.dispatchSlipFromAddress || ''),
    dispatchSlipInsuredAmount: String(source.dispatchSlipInsuredAmount || '1000'),
  };
};

const pickMasterValue = (masterValue, tenantValue, fallback = '') => {
  if (String(masterValue || '').trim()) {
    return String(masterValue);
  }

  if (String(tenantValue || '').trim()) {
    return String(tenantValue);
  }

  return fallback;
};

const getCurrentMasterPackingDispatch = async () => {
  await connectPlatformDB();
  const { MasterPackingDispatch } = getPlatformModels();
  const doc = await MasterPackingDispatch.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1 }).lean();
  return normalizeSharedSettings(doc || DEFAULT_MASTER_PACKING_DISPATCH);
};

const mergePackingDispatchIntoCentreDetails = async (centreDetails) => {
  const masterSettings = await getCurrentMasterPackingDispatch();
  const tenantDetails = centreDetails && typeof centreDetails === 'object' ? centreDetails : {};
  const merged = {
    ...tenantDetails,
  };

  for (const field of SHARED_PACKING_DISPATCH_FIELDS) {
    merged[field] = pickMasterValue(
      hasOwn(masterSettings, field) ? masterSettings[field] : '',
      hasOwn(tenantDetails, field) ? tenantDetails[field] : '',
      DEFAULT_MASTER_PACKING_DISPATCH[field]
    );
  }

  return merged;
};

module.exports = {
  DEFAULT_MASTER_PACKING_DISPATCH,
  SHARED_PACKING_DISPATCH_FIELDS,
  getCurrentMasterPackingDispatch,
  mergePackingDispatchIntoCentreDetails,
};
