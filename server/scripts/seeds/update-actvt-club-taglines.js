/**
 * Update ACTVT club taglines (idempotent by club name).
 *
 * Usage:
 *   node server/scripts/seeds/update-actvt-club-taglines.js [tenantSlug]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { connectPlatformDB } = require('../../src/config/platformDatabase');
const { getPlatformModels } = require('../../src/tenancy/platformModels');
const { getTenantConnectionAndModels } = require('../../src/tenancy/tenantConnectionManager');

/** Exact DB names from seed-actvt-clubs.js → premium taglines */
const CLUB_TAGLINES = [
  { name: 'AI and Machine Learning', tagline: 'Imagine. Code. Innovate.' },
  { name: 'Global Studies & Culture', tagline: 'Connect. Explore. Understand.' },
  { name: 'Young Entrepreneurs', tagline: 'Dream. Design. Deliver.' },
  { name: 'Sports and Fitness League', tagline: 'Strength. Spirit. Sportsmanship.' },
  { name: 'Math and Logic Circle', tagline: 'Think. Solve. Innovate.' },
  { name: 'Leadership & Communication Forum', tagline: 'Speak. Lead. Inspire.' },
  { name: 'Science and Innovation Hub', tagline: 'Curiosity. Discovery. Progress.' },
  { name: 'Robotics & Coding', tagline: 'Build. Code. Create the Future.' },
  { name: 'Global Change Makers', tagline: 'Act. Serve. Make a Difference.' },
  { name: 'Digital Media & Journalism', tagline: 'Your Voice. Your Story. Your Platform.' },
  { name: 'Performing and Creative Arts Society', tagline: 'Create. Perform. Inspire.' },
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

  for (const item of CLUB_TAGLINES) {
    const result = await Club.updateOne(
      {
        name: new RegExp(`^${escapeRegex(item.name)}$`, 'i'),
        isActive: { $ne: false },
      },
      { $set: { tagline: item.tagline } }
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

  console.log(`Done. Total club taglines updated: ${totalUpdated}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
