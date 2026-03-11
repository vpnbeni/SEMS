const { getPlatformModels } = require('../tenancy/platformModels');

const buildTenantDatesheetPayload = (masterDatesheet) => ({
  title: masterDatesheet.title,
  academicYear: masterDatesheet.academicYear,
  totalEntries: masterDatesheet.totalEntries,
  dateRange: masterDatesheet.dateRange,
  statistics: masterDatesheet.statistics,
  entries: masterDatesheet.entries,
  isActive: true,
});

const getActiveMasterDatesheet = async () => {
  const { MasterCBSEDatesheet } = getPlatformModels();
  return MasterCBSEDatesheet.findOne({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();
};

const ensureTenantActiveDatesheet = async (CBSEDatesheetModel) => {
  if (!CBSEDatesheetModel) {
    throw new Error('CBSEDatesheet model is required');
  }

  let tenantDatesheet = await CBSEDatesheetModel.getActive();
  if (tenantDatesheet) {
    return { datesheet: tenantDatesheet, seeded: false };
  }

  const masterDatesheet = await getActiveMasterDatesheet();
  if (!masterDatesheet) {
    return { datesheet: null, seeded: false };
  }

  tenantDatesheet = await CBSEDatesheetModel.getActive();
  if (tenantDatesheet) {
    return { datesheet: tenantDatesheet, seeded: false };
  }

  await CBSEDatesheetModel.updateMany(
    { isActive: true },
    { $set: { isActive: false } }
  );

  const seededDatesheet = await CBSEDatesheetModel.create(
    buildTenantDatesheetPayload(masterDatesheet)
  );

  await CBSEDatesheetModel.updateMany(
    { _id: { $ne: seededDatesheet._id }, isActive: true },
    { $set: { isActive: false } }
  );

  return { datesheet: seededDatesheet, seeded: true };
};

module.exports = {
  ensureTenantActiveDatesheet,
};

