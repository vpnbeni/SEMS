/* eslint-disable no-console */
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { connectPlatformDB, getPlatformConnection } = require('../../src/config/platformDatabase');
const { getPlatformModels } = require('../../src/tenancy/platformModels');
const { getTenantConnectionAndModels } = require('../../src/tenancy/tenantConnectionManager');

const toDigitsOnly = (value) => String(value || '').replace(/\D/g, '');

const sanitizeTenantTeacherAccounts = async (tenant) => {
  const { models } = getTenantConnectionAndModels(tenant.dbName, ['Teacher']);
  const Teacher = models.Teacher;

  const cursor = Teacher.find({})
    .select('_id accountNumber')
    .lean()
    .cursor();

  let scanned = 0;
  let updated = 0;
  let forcedFallback = 0;
  const bulkOps = [];

  await cursor.eachAsync(async (teacher) => {
    scanned += 1;
    const current = String(teacher?.accountNumber || '').trim();
    if (!current) return;

    const cleaned = toDigitsOnly(current);
    const nextValue = cleaned || '0';
    if (!cleaned && current) forcedFallback += 1;

    if (nextValue !== current) {
      bulkOps.push({
        updateOne: {
          filter: { _id: teacher._id },
          update: { $set: { accountNumber: nextValue } },
        },
      });
    }
  }, { parallel: 20 });

  if (bulkOps.length > 0) {
    const result = await Teacher.bulkWrite(bulkOps, { ordered: false });
    updated = Number(result?.modifiedCount || 0);
  }

  console.log(
    `[sanitize-account-number] tenant=${tenant.slug} db=${tenant.dbName} scanned=${scanned} updated=${updated} fallbackToZero=${forcedFallback}`
  );

  return { scanned, updated, fallback: forcedFallback };
};

const run = async () => {
  await connectPlatformDB();
  const { Tenant } = getPlatformModels();

  const tenants = await Tenant.find({})
    .select('slug dbName status')
    .lean();

  if (!tenants.length) {
    console.log('[sanitize-account-number] no tenants found');
    return;
  }

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalFallback = 0;

  for (const tenant of tenants) {
    const stats = await sanitizeTenantTeacherAccounts(tenant);
    totalScanned += stats.scanned;
    totalUpdated += stats.updated;
    totalFallback += stats.fallback;
  }

  console.log(
    `[sanitize-account-number] completed tenants=${tenants.length} scanned=${totalScanned} updated=${totalUpdated} fallbackToZero=${totalFallback}`
  );
};

run()
  .then(async () => {
    try {
      await getPlatformConnection().close();
    } catch {
      // ignore shutdown error
    }
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`[sanitize-account-number] failed message=${error.message}`);
    try {
      await getPlatformConnection().close();
    } catch {
      // ignore shutdown error
    }
    process.exit(1);
  });

