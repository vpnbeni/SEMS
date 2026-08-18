const SchoolProfile = require('../models/SchoolProfile');

const STUDENT_ROLL_NUMBER_RULE = {
  mode: 'alphabetical_by_class_section',
  sortBy: 'name_then_father_name',
  scope: 'each class and section',
  description:
    'Roll numbers are assigned automatically to students of each section of each class by sorting them in alphabetical order of name. If two students have the same name, they are ordered alphabetically by father name. If a student changes section, roll numbers in both the previous and new sections are reassigned.',
};

const escapeRegexValue = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const classSectionFilter = (className, section) => ({
  class: { $regex: `^${escapeRegexValue(String(className || '').trim())}$`, $options: 'i' },
  section: { $regex: `^${escapeRegexValue(String(section || '').trim())}$`, $options: 'i' },
  isActive: true,
});

const sortStudentsAlphabetically = (left, right) => {
  const byName = String(left.name || '').localeCompare(String(right.name || ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
  if (byName !== 0) return byName;

  const byFatherName = String(left.fatherName || '').localeCompare(String(right.fatherName || ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
  if (byFatherName !== 0) return byFatherName;

  return String(left.rollNumber || '').localeCompare(String(right.rollNumber || ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
};

const uniqueClassSections = (groups = []) => {
  const seen = new Map();
  groups.forEach((group) => {
    const className = String(group?.className || group?.class || '').trim();
    const section = String(group?.section || '').trim();
    if (!className || !section) return;
    const key = `${className.toLowerCase()}|${section.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, { className, section });
  });
  return Array.from(seen.values());
};

const assignClassSectionRollNumbers = async (StudentModel, className, section) => {
  if (!StudentModel || !className || !section) return 0;

  const students = await StudentModel.find(classSectionFilter(className, section))
    .select('_id name fatherName rollNumber classRollNo')
    .lean();

  students.sort(sortStudentsAlphabetically);

  const operations = students
    .map((student, index) => {
      const nextRoll = index + 1;
      if (Number(student.classRollNo) === nextRoll) return null;
      return {
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { classRollNo: nextRoll } },
        },
      };
    })
    .filter(Boolean);

  if (operations.length > 0) {
    await StudentModel.bulkWrite(operations, { ordered: false });
  }

  return students.length;
};

const reassignClassSections = async (StudentModel, groups = []) => {
  const uniqueGroups = uniqueClassSections(groups);
  for (const group of uniqueGroups) {
    await assignClassSectionRollNumbers(StudentModel, group.className, group.section);
  }
  return uniqueGroups.length;
};

const assignAllClassRollNumbers = async (StudentModel) => {
  if (!StudentModel) return 0;
  const students = await StudentModel.find({ isActive: true })
    .select('class section')
    .lean();
  return reassignClassSections(StudentModel, students.map((row) => ({
    className: row.class,
    section: row.section,
  })));
};

const ensureStudentRollNumberRule = async (SchoolProfileModel) => {
  if (!SchoolProfileModel) return STUDENT_ROLL_NUMBER_RULE;

  const profile = await SchoolProfileModel.findOneAndUpdate(
    {},
    {
      $set: {
        'metadata.studentRollNumberAssignment.mode': STUDENT_ROLL_NUMBER_RULE.mode,
        'metadata.studentRollNumberAssignment.sortBy': STUDENT_ROLL_NUMBER_RULE.sortBy,
        'metadata.studentRollNumberAssignment.scope': STUDENT_ROLL_NUMBER_RULE.scope,
        'metadata.studentRollNumberAssignment.description': STUDENT_ROLL_NUMBER_RULE.description,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return profile?.metadata?.studentRollNumberAssignment || STUDENT_ROLL_NUMBER_RULE;
};

const backfillClassRollNumbersIfNeeded = async (SchoolProfileModel, StudentModel) => {
  if (!StudentModel) return;
  const ProfileModel = SchoolProfileModel || SchoolProfile;
  const existing = await ProfileModel.findOne({}).select('metadata.studentRollNumberAssignment').lean();
  const storedSortBy = existing?.metadata?.studentRollNumberAssignment?.sortBy;
  const ruleChanged = storedSortBy !== STUDENT_ROLL_NUMBER_RULE.sortBy;

  await ensureStudentRollNumberRule(ProfileModel);

  const missingCount = await StudentModel.countDocuments({
    isActive: true,
    $or: [{ classRollNo: { $exists: false } }, { classRollNo: null }],
  });

  if (missingCount > 0 || ruleChanged) {
    await assignAllClassRollNumbers(StudentModel);
  }
};

module.exports = {
  STUDENT_ROLL_NUMBER_RULE,
  assignClassSectionRollNumbers,
  reassignClassSections,
  assignAllClassRollNumbers,
  ensureStudentRollNumberRule,
  backfillClassRollNumbersIfNeeded,
};
