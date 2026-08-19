const CLASS_12_PATTERN = /^(12th|12|xii|class12|classxii|class-12)$/i;

const isClass12 = (value) => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, '');
  return CLASS_12_PATTERN.test(key);
};

const previousSessionLabels = (currentLabel, sessionDocs = []) => {
  const labels = new Set();
  const currentStart = Number(String(currentLabel || '').split('-')[0]);
  if (Number.isFinite(currentStart) && currentStart > 1900) {
    labels.add(`${currentStart - 1}-${currentStart}`);
  }
  sessionDocs.forEach((doc) => {
    const startYear = Number(doc?.startYear);
    if (Number.isFinite(startYear) && startYear < currentStart && doc.label) {
      labels.add(doc.label);
    }
  });
  labels.delete(currentLabel);
  return [...labels];
};

const snapshotFromStudent = (student, batchSession) => ({
  studentId: student._id,
  name: String(student.name || '').trim(),
  rollNumber: String(student.rollNumber || '').trim().toUpperCase(),
  classRollNo: student.classRollNo || null,
  section: String(student.section || '').trim(),
  gender: String(student.gender || '').trim(),
  email: String(student.email || '').trim().toLowerCase(),
  phone: String(student.phone || student.guardianPhone || '').trim(),
  fatherName: String(student.fatherName || '').trim(),
  motherName: String(student.motherName || '').trim(),
  dateOfBirth: student.dateOfBirth || null,
  profileImage: student.profileImage || null,
  batchSession,
  passedOutClass: '12th',
  isActive: true,
});

const syncClass12Alumni = async (req, currentLabel) => {
  const Student = req.models?.Student;
  const Alumni = req.models?.Alumni;
  const AcademicSession = req.models?.AcademicSession;
  if (!Student || !Alumni || !currentLabel) {
    return { added: 0, skipped: 0, batches: [] };
  }

  const sessionDocs = AcademicSession
    ? await AcademicSession.find({}).select('label startYear').lean()
    : [];
  const batchLabels = previousSessionLabels(currentLabel, sessionDocs);
  if (batchLabels.length === 0) {
    return { added: 0, skipped: 0, batches: [] };
  }

  let added = 0;
  let skipped = 0;

  for (const batchSession of batchLabels) {
    const students = await Student.find({ academicSession: batchSession }).lean();
    const class12Students = students.filter((item) => isClass12(item.class));

    for (const student of class12Students) {
      const existing = await Alumni.findOne({
        $or: [
          { studentId: student._id },
          {
            batchSession,
            name: String(student.name || '').trim(),
            rollNumber: String(student.rollNumber || '').trim().toUpperCase(),
          },
        ],
      }).lean();

      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        await Alumni.create(snapshotFromStudent(student, batchSession));
        added += 1;
      } catch (error) {
        skipped += 1;
      }
    }
  }

  return { added, skipped, batches: batchLabels };
};

module.exports = {
  isClass12,
  previousSessionLabels,
  syncClass12Alumni,
};
