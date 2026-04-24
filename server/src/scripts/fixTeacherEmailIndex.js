const mongoose = require('mongoose')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')

  await mongoose.connect(uri)
  const db = mongoose.connection.db
  // eslint-disable-next-line no-console
  console.log(`Connected to db="${db.databaseName}"`)
  const teachers = db.collection('teachers')

  // 1) Unset any blank/null emails that may violate uniqueness
  const unsetRes = await teachers.updateMany(
    { email: { $in: ['', null] } },
    { $unset: { email: '' } }
  )

  // 2) Drop any existing email index (name can vary)
  const indexes = await teachers.indexes()
  const emailIndexes = indexes.filter((idx) => idx.key && idx.key.email === 1)

  for (const idx of emailIndexes) {
    // eslint-disable-next-line no-console
    console.log(`Dropping index ${idx.name} (key=${JSON.stringify(idx.key)})`)
    // eslint-disable-next-line no-await-in-loop
    await teachers.dropIndex(idx.name)
  }

  // 3) Recreate a safe unique index only for real emails
  // This allows multiple docs with missing email.
  // Also ignores blank-string emails (should be stripped, but this makes it robust).
  await teachers.createIndex(
    { email: 1 },
    {
      unique: true,
      name: 'email_1_unique_nonempty',
      partialFilterExpression: { email: { $type: 'string', $ne: '' } },
    }
  )

  // eslint-disable-next-line no-console
  console.log(
    `Teacher email index fixed. unset matched=${unsetRes.matchedCount} modified=${unsetRes.modifiedCount}`
  )

  await mongoose.disconnect()
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

