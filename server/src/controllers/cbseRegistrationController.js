const asyncHandler = require('../middleware/asyncHandler');
const { HTTP_STATUS } = require('../utils/constants');
const CbseRegistration = require('../models/CbseRegistration');
const CbseClassSubjectMatrix = require('../models/CbseClassSubjectMatrix');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

const BOARD_CLASSES = ['9th', '10th', '11th', '12th'];
const SENIOR_CLASSES = new Set(['11th', '12th']);
const DEFAULT_SENIOR_SECTIONS = ['Science', 'Commerce', 'Humanities'];
const DEFAULT_EMPTY_SLOTS = 3;

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSubjectKey = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

const normalizeSection = (value) => String(value || '').trim();

const normalizeSectionKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');

const isLegacyAdditionalColumn = (col) => {
  const key = String(col?.key || '').trim().toLowerCase();
  const label = String(col?.label || col?.name || '').trim().toLowerCase();
  const role = String(col?.role || '').trim().toLowerCase();
  return (
    role === 'additional' ||
    key === 'add-sub' ||
    key === 'additional' ||
    /^add[-_]?sub/.test(key) ||
    label === 'add sub' ||
    label.includes('additional')
  );
};

const toSelectionMap = (doc) => {
  const map = {};
  const rows = Array.isArray(doc?.selections) ? doc.selections : [];
  rows.forEach((row) => {
    const id = String(row.studentId || '');
    if (!id) return;
    map[id] = Array.isArray(row.subjectKeys)
      ? row.subjectKeys.map((key) => normalizeSubjectKey(key)).filter(Boolean)
      : [];
  });
  return map;
};

const toAdditionalMap = (doc) => {
  const map = {};
  const rows = Array.isArray(doc?.selections) ? doc.selections : [];
  rows.forEach((row) => {
    const id = String(row.studentId || '');
    const key = normalizeSubjectKey(row.additionalSubjectKey);
    if (!id || !key) return;
    map[id] = key;
  });
  return map;
};

const normalizeSubjectEntry = (value) => {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || '').trim();
  const key = normalizeSubjectKey(value.key || name);
  if (!key || !name) return null;
  return {
    key,
    name,
    code: String(value.code || '').trim().toUpperCase(),
  };
};

const subjectsFromLegacySlots = (row, columns) => {
  const slots =
    row?.slots instanceof Map
      ? Object.fromEntries(row.slots.entries())
      : row?.slots && typeof row.slots === 'object'
        ? row.slots
        : {};
  const cols = Array.isArray(columns)
    ? columns.filter((col) => !isLegacyAdditionalColumn(col))
    : [];
  const list = [];
  const seen = new Set();
  cols.forEach((col, index) => {
    const slotKey = String(col?.key || `sub-${index + 1}`);
    const entry = normalizeSubjectEntry(slots[slotKey]);
    if (!entry || seen.has(entry.key)) return;
    seen.add(entry.key);
    list.push(entry);
  });
  // Also pick any leftover slot values not in columns
  Object.values(slots).forEach((value) => {
    const entry = normalizeSubjectEntry(value);
    if (!entry || seen.has(entry.key)) return;
    seen.add(entry.key);
    list.push(entry);
  });
  return list;
};

const normalizeRowSubjects = (row, columns = []) => {
  if (Array.isArray(row?.subjects) && row.subjects.length > 0) {
    const seen = new Set();
    const list = [];
    row.subjects.forEach((item) => {
      const entry = normalizeSubjectEntry(item);
      if (!entry || seen.has(entry.key)) return;
      seen.add(entry.key);
      list.push(entry);
    });
    return list;
  }
  return subjectsFromLegacySlots(row, columns);
};

const buildDefaultRows = (extraSectionsByClass = {}) => {
  const rows = [];
  BOARD_CLASSES.forEach((className) => {
    if (SENIOR_CLASSES.has(className)) {
      const sections = Array.from(
        new Set([
          ...DEFAULT_SENIOR_SECTIONS,
          ...(extraSectionsByClass[className] || []),
        ])
      );
      sections.forEach((section) => {
        rows.push({ className, section, subjects: [] });
      });
      return;
    }
    rows.push({ className, section: '', subjects: [] });
  });
  return rows;
};

const mergeRows = (savedRows, columns = [], extraSectionsByClass = {}) => {
  const defaults = buildDefaultRows(extraSectionsByClass);
  const byId = new Map();
  (Array.isArray(savedRows) ? savedRows : []).forEach((row) => {
    const className = String(row.className || '').trim();
    const section = normalizeSection(row.section);
    if (!className) return;
    const id = `${className.toLowerCase()}::${normalizeSectionKey(section)}`;
    byId.set(id, {
      className,
      section,
      subjects: normalizeRowSubjects(row, columns),
    });
  });

  return defaults.map((row) => {
    const id = `${row.className.toLowerCase()}::${normalizeSectionKey(row.section)}`;
    const existing = byId.get(id);
    if (!existing) return { ...row, subjects: [] };
    return {
      className: row.className,
      section: row.section,
      subjects: existing.subjects || [],
    };
  });
};

const buildSubjectCatalog = async (SubjectModel) => {
  const rows = await SubjectModel.find({ isActive: true })
    .select('name code boardCode')
    .sort({ name: 1 })
    .lean()
    .catch(() => []);
  const byKey = new Map();
  rows.forEach((row) => {
    const name = String(row?.name || '').trim();
    const key = normalizeSubjectKey(name);
    if (!key) return;
    const code = String(row?.boardCode || row?.code || '')
      .trim()
      .toUpperCase();
    const existing = byKey.get(key);
    if (!existing || (!existing.code && code)) {
      byKey.set(key, { key, name, code });
    }
  });
  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const collectSeniorSections = async (StudentModel) => {
  const extra = { '11th': [], '12th': [] };
  try {
    const rows = await StudentModel.aggregate([
      {
        $match: {
          isActive: true,
          class: { $in: [/^11th$/i, /^12th$/i, /^11$/i, /^12$/i] },
        },
      },
      {
        $group: {
          _id: {
            class: { $toLower: { $trim: { input: '$class' } } },
            section: { $trim: { input: '$section' } },
          },
        },
      },
    ]);
    rows.forEach((row) => {
      const classKey = String(row?._id?.class || '').replace(/\s+/g, '');
      const section = normalizeSection(row?._id?.section);
      if (!section) return;
      if (classKey === '11th' || classKey === '11') extra['11th'].push(section);
      if (classKey === '12th' || classKey === '12') extra['12th'].push(section);
    });
  } catch {
    // ignore
  }
  return extra;
};

const serializeClassSubjectDoc = (doc, catalog = [], extraSectionsByClass = {}) => {
  const columns = Array.isArray(doc?.columns) ? doc.columns : [];
  const rows = mergeRows(doc?.rows, columns, extraSectionsByClass);
  const uniqueness =
    doc?.metadata?.uniqueSubjectsPerClassSection &&
    typeof doc.metadata.uniqueSubjectsPerClassSection === 'object'
      ? doc.metadata.uniqueSubjectsPerClassSection
      : {
          enabled: true,
          scope: 'each_class_section',
          description:
            'Within a single class and section (e.g. 11th Science), the same subject cannot be selected twice. The same subject may still be selected in other classes or sections.',
        };

  return {
    rows,
    catalog,
    classes: BOARD_CLASSES,
    subjectsPerRow: DEFAULT_EMPTY_SLOTS,
    metadata: {
      uniqueSubjectsPerClassSection: uniqueness,
    },
  };
};

const findRowSubjects = (doc, className, section) => {
  const columns = Array.isArray(doc?.columns) ? doc.columns : [];
  const rows = mergeRows(doc?.rows, columns);
  const classKey = String(className || '').trim().toLowerCase();
  const sectionKey = normalizeSectionKey(section);
  const isSenior = SENIOR_CLASSES.has(
    BOARD_CLASSES.find((c) => c.toLowerCase() === classKey) || ''
  );

  const matched = rows.find((row) => {
    if (String(row.className || '').trim().toLowerCase() !== classKey) return false;
    if (isSenior) return normalizeSectionKey(row.section) === sectionKey;
    return true;
  });

  if (!matched) return [];
  return Array.isArray(matched.subjects) ? matched.subjects : [];
};

// GET /cbse-registration/class-subjects
exports.getClassSubjectMatrix = asyncHandler(async (req, res) => {
  const SubjectModel = req.models?.Subject || Subject;
  const StudentModel = req.models?.Student || Student;
  const ClassSubjectModel = req.models?.CbseClassSubjectMatrix || CbseClassSubjectMatrix;

  const [doc, catalog, extraSections] = await Promise.all([
    ClassSubjectModel.findOne({}).lean(),
    buildSubjectCatalog(SubjectModel),
    collectSeniorSections(StudentModel),
  ]);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: serializeClassSubjectDoc(doc, catalog, extraSections),
  });
});

// PUT /cbse-registration/class-subjects
exports.saveClassSubjectMatrix = asyncHandler(async (req, res) => {
  const incomingRows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  const rows = incomingRows
    .map((row) => {
      const className = String(row?.className || '').trim();
      if (!className) return null;
      const section = normalizeSection(row?.section);
      const seen = new Set();
      const subjects = [];
      const source = Array.isArray(row?.subjects)
        ? row.subjects
        : Object.values(row?.slots && typeof row.slots === 'object' ? row.slots : {});
      source.forEach((item) => {
        const entry = normalizeSubjectEntry(item);
        if (!entry || seen.has(entry.key)) return;
        seen.add(entry.key);
        subjects.push(entry);
      });
      return { className, section, subjects };
    })
    .filter(Boolean);

  const ClassSubjectModel = req.models?.CbseClassSubjectMatrix || CbseClassSubjectMatrix;
  const SubjectModel = req.models?.Subject || Subject;
  const StudentModel = req.models?.Student || Student;

  const saved = await ClassSubjectModel.findOneAndUpdate(
    {},
    {
      $set: {
        rows,
        columns: [],
        'metadata.uniqueSubjectsPerClassSection': {
          enabled: true,
          scope: 'each_class_section',
          description:
            'Within a single class and section (e.g. 11th Science), the same subject cannot be selected twice. The same subject may still be selected in other classes or sections (e.g. Psychology in 11th Science and 12th Commerce).',
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const [catalog, extraSections] = await Promise.all([
    buildSubjectCatalog(SubjectModel),
    collectSeniorSections(StudentModel),
  ]);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: serializeClassSubjectDoc(saved, catalog, extraSections),
  });
});

// GET /cbse-registration?class=&section=
exports.getMatrix = asyncHandler(async (req, res) => {
  const className = String(req.query.class || '').trim();
  const section = normalizeSection(req.query.section);

  if (!className || !section) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'class and section are required.',
    });
  }

  const StudentModel = req.models?.Student || Student;
  const CbseRegistrationModel = req.models?.CbseRegistration || CbseRegistration;
  const ClassSubjectModel = req.models?.CbseClassSubjectMatrix || CbseClassSubjectMatrix;

  const classFilter = { $regex: `^${escapeRegex(className)}$`, $options: 'i' };
  const sectionFilter = { $regex: `^${escapeRegex(section)}$`, $options: 'i' };

  const [students, registration, classSubjectDoc] = await Promise.all([
    StudentModel.find({
      class: classFilter,
      section: sectionFilter,
      isActive: true,
    })
      .select('_id rollNumber classRollNo name class section')
      .sort({ classRollNo: 1, name: 1 })
      .lean(),
    CbseRegistrationModel.findOne({ class: className, section }).lean(),
    ClassSubjectModel.findOne({}).lean(),
  ]);

  const subjects = findRowSubjects(classSubjectDoc, className, section);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      class: className,
      section,
      students: students.map((student) => ({
        _id: String(student._id),
        rollNumber: student.rollNumber || '',
        classRollNo: student.classRollNo ?? null,
        name: student.name || '',
      })),
      subjects,
      matrix: toSelectionMap(registration),
      additionalByStudent: toAdditionalMap(registration),
    },
  });
});

// PUT /cbse-registration
exports.saveMatrix = asyncHandler(async (req, res) => {
  const className = String(req.body?.class || '').trim();
  const section = normalizeSection(req.body?.section);
  const matrix = req.body?.matrix && typeof req.body.matrix === 'object' ? req.body.matrix : {};
  const additionalByStudent =
    req.body?.additionalByStudent && typeof req.body.additionalByStudent === 'object'
      ? req.body.additionalByStudent
      : {};

  if (!className || !section) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'class and section are required.',
    });
  }

  const ClassSubjectModel = req.models?.CbseClassSubjectMatrix || CbseClassSubjectMatrix;
  const classSubjectDoc = await ClassSubjectModel.findOne({}).lean();
  const allowedKeys = new Set(
    findRowSubjects(classSubjectDoc, className, section).map((subject) => subject.key)
  );

  const studentIds = new Set([
    ...Object.keys(matrix),
    ...Object.keys(additionalByStudent),
  ]);

  const selections = Array.from(studentIds)
    .map((studentId) => {
      const keys = Array.isArray(matrix[studentId])
        ? matrix[studentId]
            .map((key) => normalizeSubjectKey(key))
            .filter((key) => key && allowedKeys.has(key))
        : [];
      let additionalSubjectKey = normalizeSubjectKey(additionalByStudent[studentId]);
      if (additionalSubjectKey && !keys.includes(additionalSubjectKey)) {
        additionalSubjectKey = '';
      }
      if (additionalSubjectKey && !allowedKeys.has(additionalSubjectKey)) {
        additionalSubjectKey = '';
      }
      return {
        studentId,
        subjectKeys: keys,
        additionalSubjectKey,
      };
    })
    .filter((row) => row.studentId && /^[0-9a-fA-F]{24}$/.test(String(row.studentId)));

  const CbseRegistrationModel = req.models?.CbseRegistration || CbseRegistration;
  const saved = await CbseRegistrationModel.findOneAndUpdate(
    { class: className, section },
    {
      $set: {
        class: className,
        section,
        selections,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      class: className,
      section,
      matrix: toSelectionMap(saved),
      additionalByStudent: toAdditionalMap(saved),
    },
  });
});
