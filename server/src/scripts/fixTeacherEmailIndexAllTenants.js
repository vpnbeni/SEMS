/**
 * Fix legacy unique index issues on teachers.email across ALL tenant databases.
 *
 * Why this exists:
 * - Older deployments may have created a UNIQUE index on `teachers.email` that also indexed "" / null.
 * - When UI doesn't collect email, new teachers can still hit duplicate key errors if the index exists.
 *
 * What it does per DB:
 * 1) Unset email where email is "" or null
 * 2) Drop ALL indexes on teachers.email (name can vary)
 * 3) Recreate a safe unique index that only indexes real non-empty string emails
 *
 * Usage:
 *   # Provide Mongo URI with permission to list databases
 *   node server/src/scripts/fixTeacherEmailIndexAllTenants.js
 *
 * Required env:
 *   - MONGODB_URI (cluster/connection string; db name can be anything)
 * Optional env:
 *   - TENANT_DB_PREFIX (filters tenant dbs; if missing, will attempt all non-system DBs)
 */
const mongoose = require('mongoose')

async function fixOneDb(db) {
  const teachers = db.collection('teachers')

  // 1) Unset any blank/null emails
  const unsetRes = await teachers.updateMany(
    { email: { $in: ['', null] } },
    { $unset: { email: '' } }
  )

  // 2) Drop any existing email indexes (name can vary)
  const indexes = await teachers.indexes()
  const emailIndexes = indexes.filter((idx) => idx?.key && idx.key.email === 1)
  for (const idx of emailIndexes) {
    await teachers.dropIndex(idx.name)
  }

  // 3) Recreate safe unique index (only real emails indexed)
  await teachers.createIndex(
    { email: 1 },
    {
      unique: true,
      name: 'email_1_unique_nonempty',
      partialFilterExpression: { email: { $type: 'string', $ne: '' } },
    }
  )

  return {
    unsetMatched: unsetRes.matchedCount ?? 0,
    unsetModified: unsetRes.modifiedCount ?? 0,
    droppedIndexes: emailIndexes.map((i) => i.name),
  }
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')

  const tenantPrefix = String(process.env.TENANT_DB_PREFIX || '').trim()

  await mongoose.connect(uri)
  const admin = mongoose.connection.db.admin()

  const dbs = await admin.listDatabases()
  const databaseNames = (dbs?.databases || [])
    .map((d) => d.name)
    .filter(Boolean)
    .filter((name) => !['admin', 'local', 'config'].includes(name))
    .filter((name) => (tenantPrefix ? name.startsWith(tenantPrefix) : true))

  if (databaseNames.length === 0) {
    console.log(
      tenantPrefix
        ? `No databases found with TENANT_DB_PREFIX="${tenantPrefix}".`
        : 'No databases found to process.'
    )
    await mongoose.disconnect()
    return
  }

  console.log(
    `Fixing teachers.email index across ${databaseNames.length} database(s)` +
      (tenantPrefix ? ` (prefix="${tenantPrefix}")` : '')
  )

  const client = mongoose.connection.getClient()
  let ok = 0
  let failed = 0

  for (const dbName of databaseNames) {
    try {
      const db = client.db(dbName)
      const res = await fixOneDb(db)
      ok += 1
      console.log(
        `[OK] ${dbName}: unset matched=${res.unsetMatched} modified=${res.unsetModified} dropped=${res.droppedIndexes.join(
          ','
        ) || '(none)'}`
      )
    } catch (err) {
      failed += 1
      console.error(`[FAIL] ${dbName}:`, err?.message || err)
    }
  }

  console.log(`Done. ok=${ok} failed=${failed}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

