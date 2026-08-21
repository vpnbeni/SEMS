const SchoolProfile = require('../models/SchoolProfile');

/** Bump when formatter changes so tenants re-run name cleanup. */
const PARENT_NAME_HONORIFIC_BACKFILL_VERSION = 3;

const PARENT_NAME_HONORIFIC_RULE = {
  fatherPrefix: 'Mr.',
  motherPrefix: 'Mrs.',
  stripExisting: true,
  applyOnTemplateImport: true,
  backfillVersion: PARENT_NAME_HONORIFIC_BACKFILL_VERSION,
  description:
    'Parent names use Mr. (father) or Mrs. (mother): capital M, lowercase r/rs, period, then a space, then Title Case name. Titles already present (Mr/Mrs/Ms/…), with or without a space (mr.ashish, Mr. mr.ashish), are stripped and normalized once.',
};

const TITLE_TOKEN =
  'mrs|miss|smti|smt|shri|shree|prof|late|sir|dr|mr|ms';

/** One or more leading titles, spaced or glued: "Mr. ", "mr.ashish", "Mrs. Ms." */
const LEADING_HONORIFIC_RE = new RegExp(
  `^(?:(?:${TITLE_TOKEN})\\.?\\s*|sh\\.\\s*)+`,
  'i'
);

/** Glued title+name: Mr.rajesh / ms.priyanka / mr.ashish */
const GLUED_TITLE_RE = new RegExp(`\\b(${TITLE_TOKEN})\\.([A-Za-z])`, 'gi');

const toTitleCaseName = (value) => {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : ''))
    .join(' ');
};

const stripLeadingHonorifics = (value) => {
  let text = String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';

  for (let i = 0; i < 10; i += 1) {
    const spaced = text.replace(GLUED_TITLE_RE, '$1. $2').replace(/\s+/g, ' ').trim();
    const stripped = spaced.replace(LEADING_HONORIFIC_RE, '').trim();
    if (stripped === text) break;
    text = stripped;
  }
  return text;
};

const canonicalHonorific = (role, rule = PARENT_NAME_HONORIFIC_RULE) => {
  const raw =
    role === 'mother'
      ? String(rule.motherPrefix || PARENT_NAME_HONORIFIC_RULE.motherPrefix)
      : String(rule.fatherPrefix || PARENT_NAME_HONORIFIC_RULE.fatherPrefix);
  const lower = raw.replace(/\./g, '').trim().toLowerCase();
  if (lower === 'mrs') return 'Mrs.';
  return 'Mr.';
};

/**
 * mr.aj → Mr. Aj | Mr. mr.ashish → Mr. Ashish | Mrs. Ms.priyanka → Mrs. Priyanka
 */
const formatParentNameWithHonorific = (value, role, rule = PARENT_NAME_HONORIFIC_RULE) => {
  const prefix = canonicalHonorific(role, rule);
  const core = toTitleCaseName(stripLeadingHonorifics(value));
  if (!core) return '';
  return `${prefix} ${core}`.slice(0, 100);
};

/** True when stored value is not already in canonical form. */
const parentNameNeedsNormalization = (value, role, rule = PARENT_NAME_HONORIFIC_RULE) => {
  const text = String(value || '').trim();
  if (!text) return false;
  return formatParentNameWithHonorific(text, role, rule) !== text;
};

const ensureParentNameHonorificRule = async (SchoolProfileModel) => {
  if (!SchoolProfileModel && !SchoolProfile) return PARENT_NAME_HONORIFIC_RULE;
  const ProfileModel = SchoolProfileModel || SchoolProfile;

  // Do NOT set backfillVersion here — only the backfill writer may advance it,
  // otherwise cleanup is skipped while dirty names remain.
  const profile = await ProfileModel.findOneAndUpdate(
    {},
    {
      $set: {
        'metadata.parentNameHonorifics.fatherPrefix': PARENT_NAME_HONORIFIC_RULE.fatherPrefix,
        'metadata.parentNameHonorifics.motherPrefix': PARENT_NAME_HONORIFIC_RULE.motherPrefix,
        'metadata.parentNameHonorifics.stripExisting': PARENT_NAME_HONORIFIC_RULE.stripExisting,
        'metadata.parentNameHonorifics.applyOnTemplateImport':
          PARENT_NAME_HONORIFIC_RULE.applyOnTemplateImport,
        'metadata.parentNameHonorifics.description': PARENT_NAME_HONORIFIC_RULE.description,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return {
    ...PARENT_NAME_HONORIFIC_RULE,
    ...(profile?.metadata?.parentNameHonorifics || {}),
  };
};

const backfillParentNameHonorificsIfNeeded = async (SchoolProfileModel, StudentModel) => {
  if (!StudentModel) return { skipped: true, reason: 'no-student-model' };

  const ProfileModel = SchoolProfileModel || SchoolProfile;
  const existing = await ProfileModel.findOne({})
    .select('metadata.parentNameHonorifics')
    .lean();

  const storedVersion = Number(existing?.metadata?.parentNameHonorifics?.backfillVersion || 0);
  if (storedVersion >= PARENT_NAME_HONORIFIC_BACKFILL_VERSION) {
    return { skipped: true, reason: 'already-backfilled' };
  }

  const rule = {
    ...PARENT_NAME_HONORIFIC_RULE,
    ...(existing?.metadata?.parentNameHonorifics || {}),
  };

  const students = await StudentModel.find({
    $or: [
      { fatherName: { $exists: true, $nin: [null, ''] } },
      { motherName: { $exists: true, $nin: [null, ''] } },
    ],
  })
    .select('_id fatherName motherName')
    .lean();

  const operations = [];
  for (const student of students) {
    const $set = {};
    if (student.fatherName && parentNameNeedsNormalization(student.fatherName, 'father', rule)) {
      $set.fatherName = formatParentNameWithHonorific(student.fatherName, 'father', rule);
    }
    if (student.motherName && parentNameNeedsNormalization(student.motherName, 'mother', rule)) {
      $set.motherName = formatParentNameWithHonorific(student.motherName, 'mother', rule);
    }
    if (Object.keys($set).length === 0) continue;
    operations.push({
      updateOne: {
        filter: { _id: student._id },
        update: { $set },
      },
    });
  }

  if (operations.length > 0) {
    await StudentModel.bulkWrite(operations, { ordered: false });
  }

  await ensureParentNameHonorificRule(ProfileModel);
  await ProfileModel.updateOne(
    {},
    {
      $set: {
        'metadata.parentNameHonorifics.backfilledAt': new Date(),
        'metadata.parentNameHonorifics.backfilledCount': operations.length,
        'metadata.parentNameHonorifics.backfillVersion': PARENT_NAME_HONORIFIC_BACKFILL_VERSION,
      },
    },
    { upsert: true }
  );

  return {
    skipped: false,
    updated: operations.length,
    scanned: students.length,
  };
};

module.exports = {
  PARENT_NAME_HONORIFIC_RULE,
  PARENT_NAME_HONORIFIC_BACKFILL_VERSION,
  stripLeadingHonorifics,
  formatParentNameWithHonorific,
  parentNameNeedsNormalization,
  ensureParentNameHonorificRule,
  backfillParentNameHonorificsIfNeeded,
};
