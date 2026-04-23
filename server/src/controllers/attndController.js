const { StaffAttendanceDaily, StudentAttendanceDaily } = require('../models/AttndDailyRecord');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const TimetableState = require('../models/TimetableState');

const normalizeDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const normalizeMonthKey = (value) => {
  const month = String(value || '').trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return '';
  const [year, mm] = month.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(mm) || mm < 1 || mm > 12) return '';
  return month;
};

const normalizeString = (value) => String(value || '').trim();

const getStaffDirectory = async (req, res) => {
  try {
    const TeacherModel = req.models?.Teacher || Teacher;
    const teachers = await TeacherModel.find({})
      .select('_id name employeeId designation isActive')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff directory',
      error: error.message,
    });
  }
};

const getStudentDirectory = async (req, res) => {
  try {
    const StudentModel = req.models?.Student || Student;
    const className = normalizeString(req.query.className);
    const section = normalizeString(req.query.section);

    const filter = { isActive: true };
    if (className) filter.class = className;
    if (section) filter.section = section;

    const students = await StudentModel.find(filter)
      .select('_id name rollNumber class section isActive')
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student directory',
      error: error.message,
    });
  }
};

const getStudentFilters = async (req, res) => {
  try {
    const TimetableStateModel = req.models?.TimetableState || TimetableState;
    const StudentModel = req.models?.Student || Student;
    const latest = await TimetableStateModel.findOne({}).sort({ updatedAt: -1 }).lean();

    const classSectionPairs = [];
    const classMap = new Map();

    if (latest?.matrixSelection && Array.isArray(latest?.matrixClasses) && Array.isArray(latest?.matrixSections)) {
      latest.matrixClasses.forEach((classItem) => {
        const className = normalizeString(classItem?.name);
        if (!className) return;
        const sectionList = [];
        latest.matrixSections.forEach((sectionItem) => {
          const sectionName = normalizeString(sectionItem?.name);
          if (!sectionName) return;
          if (latest.matrixSelection?.[classItem.id]?.[sectionItem.id]) {
            sectionList.push(sectionName);
            classSectionPairs.push({ className, section: sectionName });
          }
        });
        if (sectionList.length > 0) {
          classMap.set(className, sectionList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        }
      });
    }

    if (classSectionPairs.length === 0) {
      const rows = await StudentModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: { className: '$class', section: '$section' } } },
        { $project: { _id: 0, className: '$_id.className', section: '$_id.section' } },
      ]);

      rows.forEach((row) => {
        const className = normalizeString(row.className);
        const section = normalizeString(row.section);
        if (!className || !section) return;
        classSectionPairs.push({ className, section });
        const current = classMap.get(className) || [];
        if (!current.includes(section)) current.push(section);
        classMap.set(className, current);
      });
    }

    const classOptions = Array.from(classMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([className, sections]) => ({
        className,
        sections: sections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      }));

    res.json({
      success: true,
      data: {
        classOptions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student filter options',
      error: error.message,
    });
  }
};

const getStaffAttendance = async (req, res) => {
  try {
    const StaffAttendanceModel = req.models?.StaffAttendanceDaily || StaffAttendanceDaily;
    const month = normalizeMonthKey(req.query.month);
    if (!month) {
      return res.status(400).json({ success: false, message: 'Valid month is required in YYYY-MM format.' });
    }

    const records = await StaffAttendanceModel.find({
      attendanceDate: { $regex: `^${month}-` },
      status: 'A',
    })
      .select('staffId attendanceDate status remarks')
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff attendance', error: error.message });
  }
};

const saveStaffAttendance = async (req, res) => {
  try {
    const StaffAttendanceModel = req.models?.StaffAttendanceDaily || StaffAttendanceDaily;
    const month = normalizeMonthKey(req.body?.month);
    const absences = Array.isArray(req.body?.absences) ? req.body.absences : [];

    if (!month) {
      return res.status(400).json({ success: false, message: 'Valid month is required in YYYY-MM format.' });
    }

    await StaffAttendanceModel.deleteMany({ attendanceDate: { $regex: `^${month}-` } });

    const docs = absences
      .map((item) => ({
        staffId: normalizeString(item.staffId),
        attendanceDate: normalizeDateKey(item.attendanceDate),
      }))
      .filter((item) => item.staffId && item.attendanceDate && item.attendanceDate.startsWith(`${month}-`))
      .map((item) => ({
        ...item,
        status: 'A',
      }));

    if (docs.length > 0) await StaffAttendanceModel.insertMany(docs, { ordered: false });

    return res.json({ success: true, message: 'Staff attendance saved successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to save staff attendance', error: error.message });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const StudentAttendanceModel = req.models?.StudentAttendanceDaily || StudentAttendanceDaily;
    const month = normalizeMonthKey(req.query.month);
    const className = normalizeString(req.query.className);
    const section = normalizeString(req.query.section);

    if (!month || !className || !section) {
      return res.status(400).json({ success: false, message: 'Month, className and section are required.' });
    }

    const records = await StudentAttendanceModel.find({
      attendanceDate: { $regex: `^${month}-` },
      className,
      section,
      status: 'A',
    })
      .select('studentId attendanceDate status remarks')
      .lean();

    return res.json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch student attendance', error: error.message });
  }
};

const saveStudentAttendance = async (req, res) => {
  try {
    const StudentAttendanceModel = req.models?.StudentAttendanceDaily || StudentAttendanceDaily;
    const month = normalizeMonthKey(req.body?.month);
    const className = normalizeString(req.body?.className);
    const section = normalizeString(req.body?.section);
    const absences = Array.isArray(req.body?.absences) ? req.body.absences : [];

    if (!month || !className || !section) {
      return res.status(400).json({ success: false, message: 'Month, className and section are required.' });
    }

    await StudentAttendanceModel.deleteMany({
      attendanceDate: { $regex: `^${month}-` },
      className,
      section,
    });

    const docs = absences
      .map((item) => ({
        studentId: normalizeString(item.studentId),
        attendanceDate: normalizeDateKey(item.attendanceDate),
      }))
      .filter((item) => item.studentId && item.attendanceDate && item.attendanceDate.startsWith(`${month}-`))
      .map((item) => ({
        ...item,
        className,
        section,
        status: 'A',
      }));

    if (docs.length > 0) await StudentAttendanceModel.insertMany(docs, { ordered: false });

    return res.json({ success: true, message: 'Student attendance saved successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to save student attendance', error: error.message });
  }
};

module.exports = {
  getStaffDirectory,
  getStudentDirectory,
  getStudentFilters,
  getStaffAttendance,
  saveStaffAttendance,
  getStudentAttendance,
  saveStudentAttendance,
};
