const { resolveTenantFromRequest } = require('./resolveTenantFromRequest');
const { getTenantConnectionAndModels } = require('./tenantConnectionManager');
const { setRequestContext } = require('./requestContext');
const { getPlatformModels } = require('./platformModels');
const { TENANT_STATUS } = require('../models/platform/Tenant');

const platformContextMiddleware = async (req, res, next) => {
  try {
    const resolution = resolveTenantFromRequest(req);

    // Platform admin routes must be served only from root API host (or localhost).
    if (!resolution.isPlatformHost && !resolution.isLocalHost) {
      return res.status(404).json({
        success: false,
        message: 'Platform admin routes are not available on tenant API hosts',
      });
    }

    req.platformModels = getPlatformModels();

    setRequestContext({
      scope: 'platform',
      platformModels: req.platformModels,
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

const tenantContextMiddleware = async (req, res, next) => {
  try {
    const resolution = resolveTenantFromRequest(req);

    if (!resolution.tenantSlug) {
      return res.status(400).json({
        success: false,
        message: 'Tenant could not be resolved from request host/header/query',
      });
    }

    const { Tenant } = getPlatformModels();
    const tenantRecord = await Tenant.findOne({ slug: resolution.tenantSlug }).lean();

    if (!tenantRecord) {
      return res.status(404).json({
        success: false,
        message: `Tenant '${resolution.tenantSlug}' not found`,
      });
    }

    if (tenantRecord.status !== TENANT_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: `Tenant '${resolution.tenantSlug}' is not active`,
      });
    }

    const { connection, models } = getTenantConnectionAndModels(tenantRecord.dbName);

    req.tenant = {
      id: tenantRecord._id,
      slug: tenantRecord.slug,
      name: tenantRecord.name,
      dbName: tenantRecord.dbName,
      status: tenantRecord.status,
      source: resolution.source,
      host: resolution.host,
    };

    req.models = models;
    req.tenantConnection = connection;

    setRequestContext({
      scope: 'tenant',
      tenant: req.tenant,
      models,
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  platformContextMiddleware,
  tenantContextMiddleware,
};
