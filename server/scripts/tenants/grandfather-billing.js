require('dotenv').config();

const { connectPlatformDB } = require('../../src/config/platformDatabase');
const { getPlatformModels } = require('../../src/tenancy/platformModels');
const { TENANT_STATUS } = require('../../src/models/platform/Tenant');
const { grandfatherTenant, isConfigured } = require('../../src/services/billingServiceClient');

async function run() {
  if (!isConfigured()) {
    throw new Error('BILLING_SERVICE_URL is not configured. Cannot run grandfather migration.');
  }

  await connectPlatformDB();

  const { Tenant } = getPlatformModels();
  const days = Number.parseInt(process.env.BILLING_GRANDFATHER_DAYS || '60', 10);

  const tenants = await Tenant.find({ status: TENANT_STATUS.ACTIVE }).lean();
  console.log(`[billing-grandfather] active tenants: ${tenants.length}`);

  let success = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
      await grandfatherTenant({
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        billingEmail: tenant.adminEmail,
        days,
      });
      success += 1;
      console.log(`[billing-grandfather] ok tenant=${tenant.slug}`);
    } catch (error) {
      failed += 1;
      console.error(`[billing-grandfather] failed tenant=${tenant.slug} message=${error.message}`);
    }
  }

  console.log(`[billing-grandfather] done success=${success} failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[billing-grandfather] fatal', error);
  process.exit(1);
});
