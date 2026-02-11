const { connectPlatformDB, getPlatformConnection } = require('../../src/config/platformDatabase');
const { getPlatformModels } = require('../../src/tenancy/platformModels');
const { getTenantConnectionAndModels } = require('../../src/tenancy/tenantConnectionManager');
const { syncTenantUserDirectoryEntry } = require('../../src/tenancy/tenantUserDirectoryService');

const backfill = async () => {
  await connectPlatformDB();
  const { Tenant } = getPlatformModels();

  const tenants = await Tenant.find({})
    .select('slug dbName status')
    .lean();

  const tenantResults = await Promise.all(tenants.map(async (tenant) => {
    const { models } = getTenantConnectionAndModels(tenant.dbName, ['User']);
    const cursor = models.User.find({})
      .select('_id email role isActive')
      .lean()
      .cursor();

    let tenantUsers = 0;
    let tenantUsersSynced = 0;

    await cursor.eachAsync(async (user) => {
      tenantUsers += 1;
      if (user.email) {
        await syncTenantUserDirectoryEntry({
          tenantSlug: tenant.slug,
          tenantDbName: tenant.dbName,
          tenantUserId: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        });
        tenantUsersSynced += 1;
      }
    }, { parallel: 10 });

    console.log(
      `[tenant-user-directory:backfill] tenant=${tenant.slug} db=${tenant.dbName} users=${tenantUsers}`
    );

    return {
      scanned: tenantUsers,
      synced: tenantUsersSynced
    };
  }));

  const totalUsersScanned = tenantResults.reduce(
    (sum, item) => sum + item.scanned,
    0
  );
  const totalUsersSynced = tenantResults.reduce(
    (sum, item) => sum + item.synced,
    0
  );

  console.log(
    '[tenant-user-directory:backfill] completed '
      + `tenants=${tenants.length} scanned=${totalUsersScanned} synced=${totalUsersSynced}`
  );
};

backfill()
  .then(async () => {
    try {
      await getPlatformConnection().close();
    } catch {
      // Ignore connection close errors on shutdown.
    }
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`[tenant-user-directory:backfill] failed message=${error.message}`);
    try {
      await getPlatformConnection().close();
    } catch {
      // Ignore connection close errors on shutdown.
    }
    process.exit(1);
  });
