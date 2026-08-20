/**
 * Seed default ACTVT clubs for every tenant (idempotent by name).
 *
 * Usage:
 *   node server/scripts/seeds/seed-actvt-clubs.js [tenantSlug]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { connectPlatformDB } = require('../../src/config/platformDatabase');
const { getPlatformModels } = require('../../src/tenancy/platformModels');
const { getTenantConnectionAndModels } = require('../../src/tenancy/tenantConnectionManager');

const CLUBS = [
  { name: 'AI and Machine Learning', color: '#0B1D36', tagline: 'Imagine. Code. Innovate.' },
  { name: 'Global Studies & Culture', color: '#EA580C', tagline: 'Connect. Explore. Understand.' },
  { name: 'Young Entrepreneurs', color: '#CA8A04', tagline: 'Dream. Design. Deliver.' },
  { name: 'Sports and Fitness League', color: '#166534', tagline: 'Strength. Spirit. Sportsmanship.' },
  { name: 'Math and Logic Circle', color: '#1E3A8A', tagline: 'Think. Solve. Innovate.' },
  { name: 'Leadership & Communication Forum', color: '#B8860B', tagline: 'Speak. Lead. Inspire.' },
  { name: 'Science and Innovation Hub', color: '#65A30D', tagline: 'Curiosity. Discovery. Progress.' },
  { name: 'Robotics & Coding', color: '#0891B2', tagline: 'Build. Code. Create the Future.' },
  { name: 'Global Change Makers', color: '#15803D', tagline: 'Act. Serve. Make a Difference.' },
  { name: 'Digital Media & Journalism', color: '#C026D3', tagline: 'Your Voice. Your Story. Your Platform.' },
  { name: 'Performing and Creative Arts Society', color: '#6B21A8', tagline: 'Create. Perform. Inspire.' },
];

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function seedTenant(tenant) {
  let models;
  try {
    ({ models } = getTenantConnectionAndModels(tenant.dbName, ['ActivityClub']));
  } catch (error) {
    console.warn(`[skip] ${tenant.slug}: ${error.message}`);
    return { created: 0, skipped: 0 };
  }

  const Club = models.ActivityClub;
  if (!Club) {
    console.log(`[skip] ${tenant.slug}: ActivityClub not registered`);
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const club of CLUBS) {
    const existing = await Club.findOne({
      name: new RegExp(`^${escapeRegex(club.name)}$`, 'i'),
      isActive: { $ne: false },
    }).lean();

    if (existing) {
      skipped += 1;
      continue;
    }

    await Club.create({
      name: club.name,
      color: club.color,
      tagline: club.tagline || '',
      motto: '',
      logo: '',
      logoPublicId: '',
      incharge: '',
      meetingDay: '',
      description: '',
      members: '',
      activities: '',
      isActive: true,
    });
    created += 1;
  }

  console.log(`[ok] ${tenant.slug}: created=${created} skipped=${skipped}`);
  return { created, skipped };
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

  let totalCreated = 0;
  for (const tenant of tenants) {
    const result = await seedTenant(tenant);
    totalCreated += result.created;
  }

  console.log(`Done. Total clubs created: ${totalCreated}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
