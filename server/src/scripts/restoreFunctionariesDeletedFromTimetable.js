const mongoose = require('mongoose')

const SYSTEM_DBS = new Set(['admin', 'local', 'config'])
const DEFAULT_DUTY_TYPE = 'Invigilator'

const toNonEmptyString = (value) => String(value || '').trim()

const hasValidDutyType = (value) => toNonEmptyString(value).length > 0

async function restoreInTenantDb(db, dutyType) {
  const timetableStates = db.collection('timetablestates')
  const teachers = db.collection('teachers')

  const states = await timetableStates.find({}, { projection: { teachers: 1 } }).toArray()
  const teacherIdSet = new Set()

  states.forEach((state) => {
    const stateTeachers = Array.isArray(state?.teachers) ? state.teachers : []
    stateTeachers.forEach((teacher) => {
      const id = toNonEmptyString(teacher?.id)
      if (id) teacherIdSet.add(id)
    })
  })

  const objectIds = Array.from(teacherIdSet)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  if (objectIds.length === 0) {
    return {
      referencedInTimetable: 0,
      inactiveCandidates: 0,
      restored: 0,
      dutyAssigned: 0,
    }
  }

  const inactiveDocs = await teachers
    .find({ _id: { $in: objectIds }, isActive: false }, { projection: { _id: 1, dutyType: 1, dutyHistory: 1 } })
    .toArray()

  if (inactiveDocs.length === 0) {
    return {
      referencedInTimetable: objectIds.length,
      inactiveCandidates: 0,
      restored: 0,
      dutyAssigned: 0,
    }
  }

  const restoreIds = inactiveDocs.map((doc) => doc._id)
  const restoreResult = await teachers.updateMany(
    { _id: { $in: restoreIds } },
    { $set: { isActive: true } }
  )

  let dutyAssigned = 0
  for (const doc of inactiveDocs) {
    const nextDutyHistory = Array.isArray(doc.dutyHistory) ? [...doc.dutyHistory] : []
    if (!nextDutyHistory.includes(dutyType)) {
      nextDutyHistory.push(dutyType)
    }

    const nextSet = { dutyHistory: nextDutyHistory }
    if (!hasValidDutyType(doc.dutyType)) {
      nextSet.dutyType = dutyType
    }

    // eslint-disable-next-line no-await-in-loop
    const dutyResult = await teachers.updateOne({ _id: doc._id }, { $set: nextSet })
    dutyAssigned += dutyResult.modifiedCount || 0
  }

  return {
    referencedInTimetable: objectIds.length,
    inactiveCandidates: inactiveDocs.length,
    restored: restoreResult.modifiedCount || 0,
    dutyAssigned,
  }
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')

  const tenantPrefix = toNonEmptyString(process.env.TENANT_DB_PREFIX)
  const dutyType = toNonEmptyString(process.env.RESTORE_DUTY_TYPE) || DEFAULT_DUTY_TYPE

  await mongoose.connect(uri)
  const admin = mongoose.connection.db.admin()
  const dbs = await admin.listDatabases()
  const databaseNames = (dbs?.databases || [])
    .map((d) => d.name)
    .filter(Boolean)
    .filter((name) => !SYSTEM_DBS.has(name))
    .filter((name) => (tenantPrefix ? name.startsWith(tenantPrefix) : true))

  // eslint-disable-next-line no-console
  console.log(`Restoring functionaries in ${databaseNames.length} DB(s), dutyType="${dutyType}"`)

  const client = mongoose.connection.getClient()
  for (const dbName of databaseNames) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await restoreInTenantDb(client.db(dbName), dutyType)
      // eslint-disable-next-line no-console
      console.log(
        `[OK] ${dbName} | timetableRefs=${result.referencedInTimetable} inactiveMatches=${result.inactiveCandidates} restored=${result.restored} dutyUpdated=${result.dutyAssigned}`
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[FAIL] ${dbName}:`, err?.message || err)
    }
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

