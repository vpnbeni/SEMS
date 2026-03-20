/**
 * Migrate OASIS ID into dedicated `oasisId` field.
 *
 * Background:
 * - Historically, the system stored OASIS in Teacher.employeeId (required/unique).
 * - We now store:
 *   - Teacher.oasisId   -> OASIS (exam unique, required except Class IV)
 *   - Teacher.employeeId -> School employee id (HR), optional
 *
 * This script (safe to re-run):
 * - For each tenant DB:
 *   - Finds teachers where oasisId is missing/empty and employeeId is digits-only
 *   - Sets oasisId = employeeId
 *   - Sets employeeId = '' (so HR employee id can be filled later)
 * - Reports duplicates (same employeeId digits used by multiple teachers) and skips those docs.
 *
 * Usage:
 *   node server/scripts/migrations/migrate-teacher-oasis-id.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { connectPlatformDB } = require('../../src/config/platformDatabase');
const { getPlatformModels } = require('../../src/tenancy/platformModels');
const { getTenantConnectionAndModels } = require('../../src/tenancy/tenantConnectionManager');

const SESSION_SCOPED_MODELS = ['Teacher'];

const isDigitsOnly = (value) => /^\d+$/.test(String(value || '').trim());

const dropLegacyEmployeeIdUniqueIndex = async (TeacherCollection) => {
  try {
    const indexes = await TeacherCollection.indexes();
    const employeeIdx = indexes.find((idx) => idx?.name === 'employeeId_1');
    if (employeeIdx && employeeIdx.unique) {
      console.log('  Dropping legacy unique index: employeeId_1');
      await TeacherCollection.dropIndex('employeeId_1');
    }
  } catch (err) {
    // Safe to ignore if index doesn't exist / insufficient privileges.
    console.warn(`  [WARN] Could not drop employeeId_1 index: ${err.message}`);
  }
};

const migrateTenant = async (tenant) => {
  console.log(`--- Tenant: ${tenant.slug} (db: ${tenant.dbName}) ---`);

  let models;
  try {
    ({ models } = getTenantConnectionAndModels(tenant.dbName, SESSION_SCOPED_MODELS));
  } catch (err) {
    console.warn(`  [SKIP] Could not connect/register models: ${err.message}`);
    return { updated: 0, skippedDuplicates: 0 };
  }

  const Teacher = models.Teacher;
  if (!Teacher) {
    console.warn('  [SKIP] Teacher model unavailable');
    return { updated: 0, skippedDuplicates: 0 };
  }

  await dropLegacyEmployeeIdUniqueIndex(Teacher.collection);

  // Find candidate records that need migration
  const candidates = await Teacher.collection
    .find({
      $and: [
        {
          $or: [
            { oasisId: { $exists: false } },
            { oasisId: null },
            { oasisId: '' },
          ],
        },
        { employeeId: { $exists: true, $ne: '' } },
      ],
    })
    .project({ _id: 1, employeeId: 1, dutyType: 1 })
    .toArray();

  const digitCandidates = candidates.filter((t) => isDigitsOnly(t.employeeId) && String(t.dutyType || '').trim() !== 'Class IV');
  if (digitCandidates.length === 0) {
    console.log('  (no records needed migrating)');
    return { updated: 0, skippedDuplicates: 0 };
  }

  // Detect duplicates within this tenant
  const byEmployeeId = new Map();
  for (const doc of digitCandidates) {
    const key = String(doc.employeeId).trim();
    if (!byEmployeeId.has(key)) byEmployeeId.set(key, []);
    byEmployeeId.get(key).push(String(doc._id));
  }

  const duplicateEmployeeIds = Array.from(byEmployeeId.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([empId]) => empId);

  let skippedDuplicates = 0;
  if (duplicateEmployeeIds.length > 0) {
    skippedDuplicates = duplicateEmployeeIds.length;
    console.warn(`  [WARN] Found ${duplicateEmployeeIds.length} duplicate OASIS value(s). These will be skipped.`);
    duplicateEmployeeIds.slice(0, 10).forEach((id) => console.warn(`    - ${id}`));
    if (duplicateEmployeeIds.length > 10) console.warn('    (more duplicates omitted)');
  }

  const operations = [];
  for (const doc of digitCandidates) {
    const oasis = String(doc.employeeId).trim();
    if (duplicateEmployeeIds.includes(oasis)) continue;
    operations.push({
      updateOne: {
        filter: { _id: doc._id, $or: [{ oasisId: { $exists: false } }, { oasisId: null }, { oasisId: '' }] },
        update: { $set: { oasisId: oasis, employeeId: null } },
      },
    });
  }

  if (operations.length === 0) {
    console.log('  (no non-duplicate records to migrate)');
    return { updated: 0, skippedDuplicates };
  }

  const result = await Teacher.collection.bulkWrite(operations, { ordered: false });
  const updated = result.modifiedCount || 0;
  console.log(`  Updated ${updated} teacher(s)`);

  return { updated, skippedDuplicates };
};

const main = async () => {
  console.log('\n=== Migrate Teacher OASIS ID: employeeId -> oasisId ===\n');
  await connectPlatformDB();
  const { Tenant } = getPlatformModels();
  const tenants = await Tenant.find({}).select('slug dbName status').lean();
  console.log(`Found ${tenants.length} tenant(s)\n`);

  let totalUpdated = 0;
  let totalDup = 0;
  for (const tenant of tenants) {
    const { updated, skippedDuplicates } = await migrateTenant(tenant);
    totalUpdated += updated;
    totalDup += skippedDuplicates;
  }

  console.log(`\n=== Done. Updated ${totalUpdated} teacher(s). Duplicate OASIS values detected: ${totalDup}. ===\n`);
  process.exit(0);
};

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

