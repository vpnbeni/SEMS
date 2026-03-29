/**
 * Timetable module listeners — react to core entity changes by updating
 * denormalized data in TimetableState.
 *
 * TimetableState stores local copies of teachers/subjects (not ObjectId refs),
 * so when a teacher is deactivated or updated in core, we sync here.
 */
const { getTenantConnectionAndModels } = require('../../tenancy/tenantConnectionManager');
const EVENTS = require('../eventNames');

const register = (bus) => {
  // ── Teacher deactivated → remove from TimetableState ──────────────────────
  bus.on(EVENTS.TEACHER_DEACTIVATED, async (payload) => {
    const { tenant, teacherId } = payload;
    const { models } = getTenantConnectionAndModels(tenant.dbName, ['TimetableState']);
    const TimetableState = models.TimetableState;

    // Pull teacher from the denormalized teachers[] array
    await TimetableState.updateMany(
      { 'teachers.id': teacherId },
      {
        $pull: {
          teachers: { id: teacherId },
          teacherSubjectAllocations: { teacherId },
        },
      }
    );
  });

  // ── Teacher hard-deleted → same cleanup as deactivation ───────────────────
  bus.on(EVENTS.TEACHER_DELETED, async (payload) => {
    const { tenant, teacherId } = payload;
    const { models } = getTenantConnectionAndModels(tenant.dbName, ['TimetableState']);
    const TimetableState = models.TimetableState;

    await TimetableState.updateMany(
      { 'teachers.id': teacherId },
      {
        $pull: {
          teachers: { id: teacherId },
          teacherSubjectAllocations: { teacherId },
        },
      }
    );
  });

  // ── Teacher updated → sync name/shortName in denormalized copies ──────────
  bus.on(EVENTS.TEACHER_UPDATED, async (payload) => {
    const { tenant, teacherId, teacherName, teacherShortName } = payload;
    const { models } = getTenantConnectionAndModels(tenant.dbName, ['TimetableState']);
    const TimetableState = models.TimetableState;

    const updates = {};
    if (teacherName !== undefined) {
      updates['teachers.$.name'] = teacherName;
      updates['teacherSubjectAllocations.$[alloc].teacherName'] = teacherName;
    }
    if (teacherShortName !== undefined) {
      updates['teachers.$.shortName'] = teacherShortName;
    }

    if (Object.keys(updates).length === 0) return;

    // Update denormalized teacher name in teachers[] array
    await TimetableState.updateMany(
      { 'teachers.id': teacherId },
      { $set: { 'teachers.$.name': teacherName, 'teachers.$.shortName': teacherShortName } }
    );

    // Update teacherName in teacherSubjectAllocations[] array
    if (teacherName !== undefined) {
      await TimetableState.updateMany(
        { 'teacherSubjectAllocations.teacherId': teacherId },
        { $set: { 'teacherSubjectAllocations.$.teacherName': teacherName } }
      );
    }
  });
};

module.exports = { register };
