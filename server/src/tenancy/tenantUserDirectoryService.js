const { getRequestContext } = require('./requestContext');
const { getPlatformModels } = require('./platformModels');

const identityCache = new Map();

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const TENANT_IDENTITY_CACHE_TTL_MS = parsePositiveInt(
  process.env.TENANT_IDENTITY_CACHE_TTL_MS,
  5 * 60 * 1000
);

const getPlatformModelsSafe = () => {
  try {
    return getPlatformModels();
  } catch {
    // This can happen in legacy scripts where platform connection is not initialized.
    return null;
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getIdentityFromContext = () => {
  const context = getRequestContext();
  if (!context?.tenant?.slug || !context?.tenant?.dbName) {
    return null;
  }

  return {
    tenantSlug: context.tenant.slug,
    tenantDbName: context.tenant.dbName
  };
};

const readCachedIdentity = (tenantDbName) => {
  const cached = identityCache.get(tenantDbName);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    identityCache.delete(tenantDbName);
    return null;
  }

  return cached.value;
};

const resolveIdentityByDbName = async (tenantDbName) => {
  if (!tenantDbName) {
    return null;
  }

  const cached = readCachedIdentity(tenantDbName);
  if (cached) {
    return cached;
  }

  const platformModels = getPlatformModelsSafe();
  if (!platformModels) {
    return null;
  }

  const tenantRecord = await platformModels.Tenant.findOne({ dbName: tenantDbName })
    .select('slug dbName')
    .lean();

  if (!tenantRecord) {
    return null;
  }

  const identity = {
    tenantSlug: tenantRecord.slug,
    tenantDbName: tenantRecord.dbName
  };

  identityCache.set(tenantDbName, {
    value: identity,
    expiresAt: Date.now() + TENANT_IDENTITY_CACHE_TTL_MS
  });

  return identity;
};

const resolveTenantIdentity = async ({ tenantSlug, tenantDbName } = {}) => {
  if (tenantSlug && tenantDbName) {
    return { tenantSlug, tenantDbName };
  }

  const contextIdentity = getIdentityFromContext();
  if (contextIdentity) {
    return contextIdentity;
  }

  if (tenantDbName) {
    return resolveIdentityByDbName(tenantDbName);
  }

  return null;
};

const syncTenantUserDirectoryEntry = async ({
  tenantSlug,
  tenantDbName,
  tenantUserId,
  email,
  role = null,
  isActive = true
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!tenantSlug || !tenantDbName || !tenantUserId || !normalizedEmail) {
    return false;
  }

  const platformModels = getPlatformModelsSafe();
  if (!platformModels) {
    return false;
  }

  await platformModels.TenantUserDirectory.findOneAndUpdate(
    {
      tenantSlug,
      tenantUserId: tenantUserId.toString()
    },
    {
      $set: {
        tenantDbName,
        email: normalizedEmail,
        role,
        isActive: Boolean(isActive),
        lastSyncedAt: new Date()
      }
    },
    {
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return true;
};

const syncTenantUserDirectoryFromUser = async ({
  user,
  tenantSlug,
  tenantDbName
}) => {
  if (!user?._id) {
    return false;
  }

  const identity = await resolveTenantIdentity({
    tenantSlug,
    tenantDbName: tenantDbName
      || user.constructor?.db?.name
      || user.db?.name
      || null
  });

  if (!identity) {
    return false;
  }

  return syncTenantUserDirectoryEntry({
    tenantSlug: identity.tenantSlug,
    tenantDbName: identity.tenantDbName,
    tenantUserId: user._id,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  });
};

const removeTenantUserDirectoryEntry = async ({ tenantSlug, tenantUserId }) => {
  if (!tenantSlug || !tenantUserId) {
    return false;
  }

  const platformModels = getPlatformModelsSafe();
  if (!platformModels) {
    return false;
  }

  await platformModels.TenantUserDirectory.deleteOne({
    tenantSlug,
    tenantUserId: tenantUserId.toString()
  });

  return true;
};

const removeTenantUserDirectoryFromUser = async ({
  user,
  tenantSlug,
  tenantDbName
}) => {
  if (!user?._id) {
    return false;
  }

  const identity = await resolveTenantIdentity({
    tenantSlug,
    tenantDbName: tenantDbName
      || user.constructor?.db?.name
      || user.db?.name
      || null
  });

  if (!identity) {
    return false;
  }

  return removeTenantUserDirectoryEntry({
    tenantSlug: identity.tenantSlug,
    tenantUserId: user._id
  });
};

const removeTenantUserDirectoryBySlug = async (tenantSlug) => {
  if (!tenantSlug) {
    return false;
  }

  const platformModels = getPlatformModelsSafe();
  if (!platformModels) {
    return false;
  }

  await platformModels.TenantUserDirectory.deleteMany({
    tenantSlug
  });

  return true;
};

module.exports = {
  syncTenantUserDirectoryEntry,
  syncTenantUserDirectoryFromUser,
  removeTenantUserDirectoryEntry,
  removeTenantUserDirectoryFromUser,
  removeTenantUserDirectoryBySlug
};
