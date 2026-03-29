/**
 * Duty module listeners — react to core entity changes by cleaning up
 * DutyAssignment records that reference affected teachers.
 *
 * Only future assignments are modified; historical records are preserved
 * for audit purposes.
 */
const { getTenantConnectionAndModels } = require('../../tenancy/tenantConnectionManager');
const EVENTS = require('../eventNames');

const register = (bus) => {
  // ── Teacher deactivated → deactivate future duty assignments ──────────────
  bus.on(EVENTS.TEACHER_DEACTIVATED, async (payload) => {
    const { tenant, teacherId } = payload;
    const { models } = getTenantConnectionAndModels(tenant.dbName, ['DutyAssignment']);
    const DutyAssignment = models.DutyAssignment;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Deactivate future assignments where this teacher is primary or secondary
    await DutyAssignment.updateMany(
      {
        examDate: { $gte: today },
        isActive: true,
        $or: [
          { functionary: teacherId },
          { functionary2: teacherId },
        ],
      },
      { $set: { isActive: false } }
    );
  });

  // ── Teacher hard-deleted → nullify references in future assignments ───────
  bus.on(EVENTS.TEACHER_DELETED, async (payload) => {
    const { tenant, teacherId } = payload;
    const { models } = getTenantConnectionAndModels(tenant.dbName, ['DutyAssignment']);
    const DutyAssignment = models.DutyAssignment;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Nullify primary functionary
    await DutyAssignment.updateMany(
      { examDate: { $gte: today }, functionary: teacherId },
      { $set: { functionary: null, isActive: false } }
    );

    // Nullify secondary functionary
    await DutyAssignment.updateMany(
      { examDate: { $gte: today }, functionary2: teacherId },
      { $set: { functionary2: null } }
    );
  });
};

module.exports = { register };
