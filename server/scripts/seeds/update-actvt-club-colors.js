/**
 * Align ACTVT club banner colours with the official club logo palettes.
 *
 * Usage:
 *   node server/scripts/seeds/update-actvt-club-colors.js [tenantSlug]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { connectPlatformDB } = require('../../src/config/platformDatabase');
const { getPlatformModels } = require('../../src/tenancy/platformModels');
const { getTenantConnectionAndModels } = require('../../src/tenancy/tenantConnectionManager');

/**
 * Colours pulled from the club logo sheet (dominant brand / banner tone).
 * Mapped to existing ActivityClub names in the DB.
 */
const CLUB_COLORS = [
  { name: 'AI and Machine Learning', color: '#0B1D36' }, // Logo 1 — deep navy + cyan neural
  { name: 'Global Studies & Culture', color: '#EA580C' }, // Logo 2 — orange ring around globe
  { name: 'Young Entrepreneurs', color: '#CA8A04' }, // Logo 3 — gold shield / growth
  { name: 'Sports and Fitness League', color: '#166534' }, // Logo 4 — green laurels on navy shield
  { name: 'Math and Logic Circle', color: '#1E3A8A' }, // Logo 6 — navy academic (book / logic)
  { name: 'Leadership & Communication Forum', color: '#B8860B' }, // Logo 6 — gold quill / speech
  { name: 'Science and Innovation Hub', color: '#65A30D' }, // Logo 7 — lime flask liquid
  { name: 'Robotics & Coding', color: '#0891B2' }, // Tech cyan (AI / gear family)
  { name: 'Global Change Makers', color: '#15803D' }, // Logo 8 — environment green
  { name: 'Digital Media & Journalism', color: '#C026D3' }, // Logo 10 — magenta / purple pixels
  { name: 'Performing and Creative Arts Society', color: '#6B21A8' }, // Logo 5 — deep purple stage
];

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function updateTenant(tenant) {
  let models;
  try {
    ({ models } = getTenantConnectionAndModels(tenant.dbName, ['ActivityClub']));
  } catch (error) {
    console.warn(`[skip] ${tenant.slug}: ${error.message}`);
    return { updated: 0, missing: 0 };
  }

  const Club = models.ActivityClub;
  if (!Club) {
    console.log(`[skip] ${tenant.slug}: ActivityClub not registered`);
    return { updated: 0, missing: 0 };
  }

  let updated = 0;
  let missing = 0;

  for (const item of CLUB_COLORS) {
    const result = await Club.updateOne(
      {
        name: new RegExp(`^${escapeRegex(item.name)}$`, 'i'),
        isActive: { $ne: false },
      },
      { $set: { color: item.color } }
    );

    if (result.matchedCount > 0) {
      updated += 1;
    } else {
      missing += 1;
      console.warn(`  [missing] ${tenant.slug}: ${item.name}`);
    }
  }

  console.log(`[ok] ${tenant.slug}: updated=${updated} missing=${missing}`);
  return { updated, missing };
}

async function main() {
  const onlySlug = process.argv[2] ? String(process.argv[2]).trim().toLowerCase() : '';
  await connectPlatformDB();
  const { Tenant } = getPlatformModels();

  const filter = onlySlug ? { slug: onlySlug } : {};
  const tenants = await Tenant.find(filter).select('slug dbName status').lean();

  if (!tenants.length) {
    console.error(onlySlug ? `No tenant found for slug "${onlySlug}".` : 'No tenants found.');
    process.exitCode = 1;
    return;
  }

  let totalUpdated = 0;
  for (const tenant of tenants) {
    const result = await updateTenant(tenant);
    totalUpdated += result.updated;
  }

  console.log(`Done. Total club colours updated: ${totalUpdated}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
