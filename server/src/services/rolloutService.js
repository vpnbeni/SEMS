const { getTenantConnectionAndModels } = require('../tenancy/tenantConnectionManager');
const { getPlatformModels } = require('../tenancy/platformModels');
const { ROLLOUT_MODULES, ROLLOUT_STATUS, TENANT_ROLLOUT_STATUS } = require('../models/platform/DataRollout');
const { TENANT_STATUS } = require('../models/platform/Tenant');

/**
 * Initiate a new data rollout to all active tenants
 * @param {Object} params - Rollout parameters
 * @param {string} params.module - Module type (subjects, datesheet, guidelines)
 * @param {string} params.masterDataId - ID of the master data record
 * @param {string} params.versionLabel - Version label for this rollout
 * @param {string} params.adminId - Platform admin ID initiating the rollout
 * @returns {Promise<Object>} Created rollout record
 */
async function initiateRollout({ module, masterDataId, versionLabel, adminId }) {
  const platformModels = getPlatformModels();
  const { DataRollout, Tenant } = platformModels;

  // Check for existing in-progress rollout for the same module
  const existingRollout = await DataRollout.findOne({
    module,
    status: ROLLOUT_STATUS.IN_PROGRESS
  });

  if (existingRollout) {
    throw new Error(`A rollout for module '${module}' is already in progress. Please wait for it to complete or retry failed tenants.`);
  }

  // Fetch all active tenants
  const activeTenants = await Tenant.find({
    status: TENANT_STATUS.ACTIVE
  }).select('_id slug dbName');

  if (activeTenants.length === 0) {
    return DataRollout.create({
      module,
      masterDataId,
      versionLabel,
      initiatedBy: adminId,
      status: ROLLOUT_STATUS.COMPLETED,
      completedAt: new Date(),
      tenantStatuses: [],
      summary: {
        totalTenants: 0,
        successCount: 0,
        failureCount: 0
      }
    });
  }

  // Create tenant statuses array
  const tenantStatuses = activeTenants.map(tenant => ({
    tenantId: tenant._id,
    tenantSlug: tenant.slug,
    status: TENANT_ROLLOUT_STATUS.PENDING
  }));

  // Create rollout record
  const rollout = await DataRollout.create({
    module,
    masterDataId,
    versionLabel,
    initiatedBy: adminId,
    status: ROLLOUT_STATUS.IN_PROGRESS,
    tenantStatuses,
    summary: {
      totalTenants: activeTenants.length,
      successCount: 0,
      failureCount: 0
    }
  });

  // Execute rollout asynchronously (don't await)
  executeRollout(rollout._id).catch(err => {
    console.error('Rollout execution error:', err);
  });

  return rollout;
}

/**
 * Execute the rollout process for all pending tenants
 * @param {string} rolloutId - ID of the rollout record
 */
async function executeRollout(rolloutId) {
  const platformModels = getPlatformModels();
  const { DataRollout, Tenant } = platformModels;

  const rollout = await DataRollout.findById(rolloutId);
  if (!rollout) {
    throw new Error('Rollout record not found');
  }

  // Get model keys based on module
  let modelKeys;
  switch (rollout.module) {
    case ROLLOUT_MODULES.SUBJECTS:
      modelKeys = ['Subject'];
      break;
    case ROLLOUT_MODULES.DATESHEET:
      modelKeys = ['CBSEDatesheet'];
      break;
    case ROLLOUT_MODULES.GUIDELINES:
      modelKeys = ['Guideline'];
      break;
    default:
      throw new Error(`Unknown module: ${rollout.module}`);
  }

  // Process each pending tenant sequentially
  for (const tenantStatus of rollout.tenantStatuses) {
    if (tenantStatus.status !== TENANT_ROLLOUT_STATUS.PENDING) {
      continue;
    }

    tenantStatus.startedAt = new Date();

    try {
      // Get tenant record to fetch dbName
      const tenant = await Tenant.findById(tenantStatus.tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantStatus.tenantSlug}`);
      }

      // Get tenant connection and models
      const { models } = await getTenantConnectionAndModels(tenant.dbName, modelKeys);

      // Execute module-specific rollout
      let result;
      switch (rollout.module) {
        case ROLLOUT_MODULES.SUBJECTS:
          result = await rolloutSubjectsToTenant(models, platformModels, rollout.masterDataId);
          break;
        case ROLLOUT_MODULES.DATESHEET:
          result = await rolloutDatesheetToTenant(models, platformModels, rollout.masterDataId);
          break;
        case ROLLOUT_MODULES.GUIDELINES:
          result = await rolloutGuidelinesToTenant(models, platformModels, rollout.masterDataId);
          break;
      }

      // Mark as success
      tenantStatus.status = TENANT_ROLLOUT_STATUS.SUCCESS;
      tenantStatus.recordsAffected = result.recordsAffected || (result.inserted + result.updated) || 0;
      tenantStatus.completedAt = new Date();

    } catch (error) {
      // Mark as failed but continue to next tenant
      tenantStatus.status = TENANT_ROLLOUT_STATUS.FAILED;
      tenantStatus.error = error.message;
      tenantStatus.completedAt = new Date();
      console.error(`Rollout failed for tenant ${tenantStatus.tenantSlug}:`, error);
    }

    // Save progress after each tenant
    await rollout.save();
  }

  // Calculate final summary
  const successCount = rollout.tenantStatuses.filter(
    t => t.status === TENANT_ROLLOUT_STATUS.SUCCESS
  ).length;
  const failureCount = rollout.tenantStatuses.filter(
    t => t.status === TENANT_ROLLOUT_STATUS.FAILED
  ).length;

  rollout.summary.successCount = successCount;
  rollout.summary.failureCount = failureCount;

  // Set final rollout status
  if (failureCount === 0) {
    rollout.status = ROLLOUT_STATUS.COMPLETED;
  } else {
    rollout.status = ROLLOUT_STATUS.PARTIAL_FAILURE;
  }

  rollout.completedAt = new Date();
  await rollout.save();
}

/**
 * Rollout subjects from master data to a tenant database
 * @param {Object} models - Tenant models
 * @param {Object} platformModels - Platform models
 * @param {string} masterDataId - ID of master data (not used for subjects, all active subjects are rolled out)
 * @returns {Promise<Object>} Rollout result with inserted and updated counts
 */
async function rolloutSubjectsToTenant(models, platformModels, _masterDataId) {
  const { MasterSubject } = platformModels;
  const { Subject } = models;

  // Fetch all active master subjects
  const masterSubjects = await MasterSubject.find({ isActive: true });

  if (masterSubjects.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  // Prepare bulk write operations
  const bulkOps = masterSubjects.map(master => ({
    updateOne: {
      filter: { code: master.code, class: master.class },
      update: {
        $set: {
          name: master.name,
          code: master.code,
          class: master.class,
          duration: master.duration,
          answerSheet: master.answerSheet,
          boardCode: master.boardCode,
          isTheorySubject: master.isTheorySubject,
          isPracticalSubject: master.isPracticalSubject,
          isActive: master.isActive
        }
      },
      upsert: true
    }
  }));

  // Execute bulk write
  const result = await Subject.bulkWrite(bulkOps);

  return {
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0
  };
}

/**
 * Rollout CBSE datesheet from master data to a tenant database
 * @param {Object} models - Tenant models
 * @param {Object} platformModels - Platform models
 * @param {string} masterDataId - ID of the master datesheet
 * @returns {Promise<Object>} Rollout result with records affected
 */
async function rolloutDatesheetToTenant(models, platformModels, masterDataId) {
  const { MasterCBSEDatesheet } = platformModels;
  const { CBSEDatesheet } = models;

  // Fetch master datesheet
  const masterDatesheet = await MasterCBSEDatesheet.findById(masterDataId);
  if (!masterDatesheet) {
    throw new Error(`Master datesheet not found: ${masterDataId}`);
  }

  // Deactivate existing active datesheets
  await CBSEDatesheet.updateMany(
    { isActive: true },
    { $set: { isActive: false } }
  );

  // Create new datesheet
  await CBSEDatesheet.create({
    title: masterDatesheet.title,
    academicYear: masterDatesheet.academicYear,
    totalEntries: masterDatesheet.totalEntries,
    dateRange: masterDatesheet.dateRange,
    statistics: masterDatesheet.statistics,
    entries: masterDatesheet.entries,
    isActive: true
  });

  return { recordsAffected: 1 };
}

/**
 * Rollout guidelines from master data to a tenant database
 * @param {Object} models - Tenant models
 * @param {Object} platformModels - Platform models
 * @param {string} masterDataId - ID of the master guideline
 * @returns {Promise<Object>} Rollout result with records affected
 */
async function rolloutGuidelinesToTenant(models, platformModels, masterDataId) {
  const { MasterGuideline } = platformModels;
  const { Guideline } = models;

  // Fetch master guideline
  const masterGuideline = await MasterGuideline.findById(masterDataId);
  if (!masterGuideline) {
    throw new Error(`Master guideline not found: ${masterDataId}`);
  }

  // Deactivate existing active guidelines
  await Guideline.updateMany(
    { isActive: true },
    { $set: { isActive: false } }
  );

  // Create new guideline
  await Guideline.create({
    title: masterGuideline.title,
    academicYear: masterGuideline.academicYear,
    cloudinaryUrl: masterGuideline.cloudinaryUrl,
    cloudinaryPublicId: masterGuideline.cloudinaryPublicId,
    metadata: masterGuideline.metadata,
    rolledOutAt: new Date(),
    rolledOutFrom: masterDataId,
    isActive: true
  });

  return { recordsAffected: 1 };
}

/**
 * Retry failed rollouts for a specific rollout record
 * @param {string} rolloutId - ID of the rollout record
 * @returns {Promise<Object>} Updated rollout record
 */
async function retryFailedRollout(rolloutId) {
  const platformModels = getPlatformModels();
  const { DataRollout } = platformModels;

  const rollout = await DataRollout.findById(rolloutId);
  if (!rollout) {
    throw new Error('Rollout record not found');
  }

  // Reset all failed tenants back to pending
  let hasFailedTenants = false;
  for (const tenantStatus of rollout.tenantStatuses) {
    if (tenantStatus.status === TENANT_ROLLOUT_STATUS.FAILED) {
      tenantStatus.status = TENANT_ROLLOUT_STATUS.PENDING;
      tenantStatus.error = undefined;
      tenantStatus.startedAt = undefined;
      tenantStatus.completedAt = undefined;
      tenantStatus.recordsAffected = undefined;
      hasFailedTenants = true;
    }
  }

  if (!hasFailedTenants) {
    throw new Error('No failed tenants to retry');
  }

  // Reset rollout status
  rollout.status = ROLLOUT_STATUS.IN_PROGRESS;
  rollout.completedAt = undefined;

  await rollout.save();

  // Execute rollout asynchronously (don't await)
  executeRollout(rollout._id).catch(err => {
    console.error('Retry rollout execution error:', err);
  });

  return rollout;
}

module.exports = {
  initiateRollout,
  executeRollout,
  rolloutSubjectsToTenant,
  rolloutDatesheetToTenant,
  rolloutGuidelinesToTenant,
  retryFailedRollout
};
