const { getPlatformConnection } = require('../config/platformDatabase');
const { getTenantModel } = require('../models/platform/Tenant');
const { getPlatformAdminModel } = require('../models/platform/PlatformAdmin');
const { getTenantOnboardingTicketModel } = require('../models/platform/TenantOnboardingTicket');
const { getTenantUserDirectoryModel } = require('../models/platform/TenantUserDirectory');

const getPlatformModels = () => {
  const connection = getPlatformConnection();

  return {
    Tenant: getTenantModel(connection),
    PlatformAdmin: getPlatformAdminModel(connection),
    TenantOnboardingTicket: getTenantOnboardingTicketModel(connection),
    TenantUserDirectory: getTenantUserDirectoryModel(connection)
  };
};

module.exports = {
  getPlatformModels
};
