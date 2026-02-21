const asyncHandler = require('../middleware/asyncHandler');
const DutyAssignment = require('../models/DutyAssignment');
const Teacher = require('../models/Teacher');
const Room = require('../models/Room');
const SeatingPlanAllocation = require('../models/SeatingPlanAllocation');
const Candidate = require('../models/Candidate');
const DutySelection = require('../models/DutySelection');
const DutyAllocationSetting = require('../models/DutyAllocationSetting');
const SeatingPlanTemplateSetting = require('../models/SeatingPlanTemplateSetting');
const pdfGenerator = require('../utils/pdfGenerator');

const parseRoomNoForSort = (roomNo) => {
  const value = String(roomNo ?? '').trim();
  if (!value) return Number.POSITIVE_INFINITY;

  const pureNumeric = value.match(/^\d+$/);
  if (pureNumeric) return parseInt(pureNumeric[0], 10);

  const leadingNumeric = value.match(/^(\d+)/);
  if (leadingNumeric) return parseInt(leadingNumeric[1], 10);

  return Number.POSITIVE_INFINITY;
};

const compareRoomNo = (a, b) => {
  const aNo = parseRoomNoForSort(a?.roomNo);
  const bNo = parseRoomNoForSort(b?.roomNo);

  if (aNo !== bNo) return aNo - bNo;
  return String(a?.roomNo ?? '').localeCompare(String(b?.roomNo ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

const normalizeExamDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const fromIso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let date;
  if (fromIso) {
    date = new Date(`${fromIso[1]}-${fromIso[2]}-${fromIso[3]}T00:00:00.000Z`);
  } else {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    date = new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0)
    );
  }

  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeSchoolCode = (value) => String(value || '').trim().toUpperCase();
const normalizeRollNo = (value) => String(value || '').trim().toUpperCase();
const normalizeRoomNo = (value) => String(value || '').trim();
const normalizeText = (value) => String(value || '').trim();

const DEFAULT_DUTY_LIST_COLUMN_WIDTHS = Object.freeze({
  srNo: 50,
  roomNo: 70,
  roomName: 120,
  floor: 70,
  inv1School: 90,
  inv1Teacher: 130,
  inv1TeacherId: 100,
  inv1Signature: 130,
  inv2School: 90,
  inv2Teacher: 130,
  inv2TeacherId: 100,
  inv2Signature: 130,
});

const parseAllocationOrder = (room, dateKey) => {
  if (!room || !dateKey) return Number.MAX_SAFE_INTEGER;
  const source = room.allocationOrderByDate;
  if (!source) return Number.MAX_SAFE_INTEGER;
  if (source instanceof Map) {
    const value = source.get(dateKey);
    return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;
  }
  const value = source[dateKey];
  return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;
};

const normalizeDutyListColumnPercentages = (columnWidths = {}) => {
  const merged = {
    ...DEFAULT_DUTY_LIST_COLUMN_WIDTHS,
    ...(columnWidths || {}),
  };
  const values = Object.keys(DEFAULT_DUTY_LIST_COLUMN_WIDTHS).map((key) => {
    const numeric = Number(merged[key]);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_DUTY_LIST_COLUMN_WIDTHS[key];
  });
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) {
    return Object.fromEntries(
      Object.keys(DEFAULT_DUTY_LIST_COLUMN_WIDTHS).map((key) => [key, 0])
    );
  }
  const keys = Object.keys(DEFAULT_DUTY_LIST_COLUMN_WIDTHS);
  return Object.fromEntries(
    keys.map((key, idx) => [key, Number(((values[idx] * 100) / total).toFixed(2))])
  );
};

const getSchoolInitials = (teacher) => {
  const schoolName = normalizeText(teacher?.schoolName);
  if (schoolName) {
    return schoolName
      .split(/\s+/)
      .map((part) => part.slice(0, 1))
      .join('')
      .toUpperCase()
      .slice(0, 6);
  }
  return normalizeSchoolCode(teacher?.schoolCode);
};

const formatDateLabel = (examDateKey) => {
  const [year, month, day] = String(examDateKey || '').split('-');
  if (!year || !month || !day) return examDateKey;
  return `${day}.${month}.${year.slice(-2)}`;
};

const getDutyTypeSelectionsByDate = async (examDateKey, dutyType) => {
  const docs = await DutySelection.find({
    dutyType,
    examDate: examDateKey,
  })
    .populate('functionary', 'name employeeId schoolName schoolCode')
    .lean();

  return docs
    .map((doc) => doc.functionary)
    .filter(Boolean)
    .sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
        sensitivity: 'base',
      })
    );
};

const getLatestCentreDetails = async (req) => {
  const CentreDetail = req.models?.CentreDetail;
  if (!CentreDetail) return null;
  return CentreDetail.findOne({}).sort({ updatedAt: -1 }).lean();
};

const getDutyAllocationMode = async () => {
  const setting = await DutyAllocationSetting.findOne({}).sort({ updatedAt: -1 }).lean();
  return String(setting?.mode || '').toLowerCase() === 'auto' ? 'auto' : 'manual';
};

const buildRoomCandidateSchoolCodes = async (examDateKey, rooms = []) => {
  const roomIdByRoomNo = new Map(
    (rooms || [])
      .map((room) => [normalizeRoomNo(room?.roomNo), String(room?._id || '')])
      .filter(([roomNo, roomId]) => Boolean(roomNo) && Boolean(roomId))
  );

  if (roomIdByRoomNo.size === 0) return {};

  const allocations = await SeatingPlanAllocation.find({ examDate: examDateKey })
    .select('roomNo rollNo')
    .lean();
  if (!allocations.length) return {};

  const rollNumbers = Array.from(
    new Set(allocations.map((entry) => normalizeRollNo(entry?.rollNo)).filter(Boolean))
  );
  if (rollNumbers.length === 0) return {};

  const candidates = await Candidate.find({ rollNumber: { $in: rollNumbers } })
    .select('rollNumber schoolCode')
    .lean();
  const schoolCodeByRollNo = new Map(
    candidates.map((candidate) => [
      normalizeRollNo(candidate?.rollNumber),
      normalizeSchoolCode(candidate?.schoolCode),
    ])
  );

  const schoolCodesByRoomId = {};
  for (const allocation of allocations) {
    const roomNo = normalizeRoomNo(allocation?.roomNo);
    const roomId = roomIdByRoomNo.get(roomNo);
    if (!roomId) continue;

    const schoolCode = schoolCodeByRollNo.get(normalizeRollNo(allocation?.rollNo));
    if (!schoolCode) continue;

    if (!schoolCodesByRoomId[roomId]) {
      schoolCodesByRoomId[roomId] = new Set();
    }
    schoolCodesByRoomId[roomId].add(schoolCode);
  }

  return Object.fromEntries(
    Object.entries(schoolCodesByRoomId).map(([roomId, codes]) => [roomId, Array.from(codes)])
  );
};

const getDailyDuties = asyncHandler(async (req, res) => {
  const examDate = normalizeExamDate(req.query.examDate || new Date().toISOString().slice(0, 10));
  if (!examDate) {
    return res.status(400).json({
      success: false,
      message: 'Invalid examDate. Use YYYY-MM-DD format.',
    });
  }

  const duties = await DutyAssignment.find({ examDate, isActive: true })
    .populate('room', 'roomNo roomName floor')
    .populate('functionary', 'name employeeId department designation')
    .populate('functionary2', 'name employeeId department designation')
    .sort({ room: 1 })
    .lean();

  const sortedDuties = [...duties].sort((a, b) => compareRoomNo(a?.room, b?.room));
  const activeRooms = await Room.find({ isActive: true }).select('_id roomNo').lean();
  const examDateKey = examDate.toISOString().slice(0, 10);
  const roomCandidateSchoolCodes = await buildRoomCandidateSchoolCodes(examDateKey, activeRooms);

  return res.status(200).json({
    success: true,
    data: {
      examDate: examDateKey,
      duties: sortedDuties,
      totalAssigned: sortedDuties.length,
      roomCandidateSchoolCodes,
    },
  });
});

const assignDailyDuties = asyncHandler(async (req, res) => {
  const examDate = normalizeExamDate(req.body.examDate);
  const firstFunctionaryIds = Array.isArray(req.body.functionaryIds)
    ? req.body.functionaryIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const secondFunctionaryIds = Array.isArray(req.body.secondFunctionaryIds)
    ? req.body.secondFunctionaryIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (!examDate) {
    return res.status(400).json({ success: false, message: 'Invalid examDate. Use YYYY-MM-DD format.' });
  }
  if (firstFunctionaryIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Select at least one exam functionary.' });
  }

  const examDateKey = examDate.toISOString().slice(0, 10);
  const rooms = await Room.find({ isActive: true, allocatedExamDates: examDateKey }).lean();
  const sortedRooms = [...rooms].sort(compareRoomNo);
  if (sortedRooms.length === 0) {
    return res.status(400).json({ success: false, message: 'No active rooms found. Add rooms first.' });
  }

  const allocationMode = await getDutyAllocationMode();
  const lookupIds = Array.from(new Set([...firstFunctionaryIds, ...secondFunctionaryIds]));
  const functionaries = await Teacher.find({ _id: { $in: lookupIds }, isActive: true })
    .select('name employeeId department designation schoolCode')
    .lean();
  if (functionaries.length !== lookupIds.length) {
    return res.status(400).json({ success: false, message: 'Some selected functionaries are invalid or inactive.' });
  }
  const functionaryMap = new Map(functionaries.map((f) => [String(f._id), f]));
  const roomCandidateSchoolCodes = await buildRoomCandidateSchoolCodes(examDateKey, sortedRooms);
  const hasSchoolConflict = (roomId, functionary) => {
    if (!functionary) return false;
    const invigilatorSchoolCode = normalizeSchoolCode(functionary.schoolCode);
    if (!invigilatorSchoolCode) return false;
    const candidateSchoolCodes = (roomCandidateSchoolCodes[String(roomId)] || []).map((code) => normalizeSchoolCode(code));
    return candidateSchoolCodes.includes(invigilatorSchoolCode);
  };

  let orderedFirst = [];
  let orderedSecond = [];

  if (allocationMode === 'auto') {
    const queue = firstFunctionaryIds.map((id) => functionaryMap.get(id)).filter(Boolean);
    if (queue.length < sortedRooms.length * 2) {
      return res.status(400).json({
        success: false,
        message: `Selected functionaries (${queue.length}) are fewer than required for two invigilators per room (${sortedRooms.length * 2}).`,
      });
    }

    const unresolvedRooms = [];
    for (const room of sortedRooms) {
      const initialQueueLength = queue.length;
      let firstAssigned = null;
      let secondAssigned = null;

      for (let attempt = 0; attempt < initialQueueLength; attempt += 1) {
        const fn = queue.shift();
        if (!fn) break;
        if (hasSchoolConflict(room._id, fn)) {
          queue.push(fn);
          continue;
        }
        firstAssigned = fn;
        break;
      }

      if (!firstAssigned) {
        unresolvedRooms.push(room.roomNo);
        continue;
      }

      const secondQueueLength = queue.length;
      for (let attempt = 0; attempt < secondQueueLength; attempt += 1) {
        const fn = queue.shift();
        if (!fn) break;
        if (String(fn._id) === String(firstAssigned._id) || hasSchoolConflict(room._id, fn)) {
          queue.push(fn);
          continue;
        }
        secondAssigned = fn;
        break;
      }

      if (!secondAssigned) {
        unresolvedRooms.push(room.roomNo);
        continue;
      }

      orderedFirst.push(firstAssigned);
      orderedSecond.push(secondAssigned);
    }

    if (unresolvedRooms.length > 0 || orderedFirst.length !== sortedRooms.length || orderedSecond.length !== sortedRooms.length) {
      return res.status(400).json({
        success: false,
        message: `Auto assignment could not complete due to school conflicts for room(s): ${unresolvedRooms.join(', ')}.`,
      });
    }
  } else {
    if (firstFunctionaryIds.length !== sortedRooms.length || secondFunctionaryIds.length !== sortedRooms.length) {
      return res.status(400).json({
        success: false,
        message: `Assign two invigilators for each room (${sortedRooms.length} rooms).`,
      });
    }

    const usedIds = new Set();
    for (let idx = 0; idx < sortedRooms.length; idx += 1) {
      const room = sortedRooms[idx];
      const first = functionaryMap.get(firstFunctionaryIds[idx]);
      const second = functionaryMap.get(secondFunctionaryIds[idx]);
      if (!first || !second) {
        return res.status(400).json({ success: false, message: 'Invalid invigilator mapping for one or more rooms.' });
      }
      if (String(first._id) === String(second._id)) {
        return res.status(400).json({ success: false, message: `Invigilator 1 and 2 cannot be same for room ${room.roomNo}.` });
      }
      if (usedIds.has(String(first._id)) || usedIds.has(String(second._id))) {
        return res.status(400).json({ success: false, message: 'One invigilator cannot be assigned to multiple rooms on same date.' });
      }
      usedIds.add(String(first._id));
      usedIds.add(String(second._id));
      if (hasSchoolConflict(room._id, first) || hasSchoolConflict(room._id, second)) {
        return res.status(400).json({
          success: false,
          message: `Invigilator cannot be of the candidate school for room ${room.roomNo} on ${examDateKey}.`,
        });
      }
      orderedFirst.push(first);
      orderedSecond.push(second);
    }
  }

  const assignedAt = new Date();
  const assignedBy = req.user?._id || null;
  await DutyAssignment.bulkWrite(
    sortedRooms.map((room, idx) => ({
      updateOne: {
        filter: { examDate, room: room._id },
        update: {
          $set: {
            functionary: orderedFirst[idx]._id,
            functionary2: orderedSecond[idx]._id,
            assignedBy,
            assignedAt,
            isActive: true,
          },
        },
        upsert: true,
      },
    }))
  );

  const duties = await DutyAssignment.find({ examDate, isActive: true })
    .populate('room', 'roomNo roomName floor')
    .populate('functionary', 'name employeeId department designation')
    .populate('functionary2', 'name employeeId department designation')
    .sort({ room: 1 })
    .lean();
  const sortedDuties = [...duties].sort((a, b) => compareRoomNo(a?.room, b?.room));

  return res.status(200).json({
    success: true,
    message: `Assigned duties for ${sortedDuties.length} room(s) on ${examDateKey}.`,
    data: {
      examDate: examDateKey,
      duties: sortedDuties,
      totalAssigned: sortedDuties.length,
      totalRooms: sortedRooms.length,
      roomCandidateSchoolCodes,
    },
  });
});

const downloadFunctionaryDutyRecord = asyncHandler(async (req, res) => {
  const examDate = normalizeExamDate(req.query.examDate);
  if (!examDate) {
    return res.status(400).json({
      success: false,
      message: 'Invalid examDate. Use YYYY-MM-DD format.',
    });
  }

  const examDateKey = examDate.toISOString().slice(0, 10);
  const [centreDetails, templateSettingDoc] = await Promise.all([
    getLatestCentreDetails(req),
    SeatingPlanTemplateSetting.findOne({}).sort({ updatedAt: -1 }).lean(),
  ]);

  const functionaryDutyList = templateSettingDoc?.functionaryDutyList || {};
  const pageSize = normalizeText(functionaryDutyList.pageSize || 'A4').toUpperCase() || 'A4';
  const orientation =
    String(functionaryDutyList.orientation || 'landscape').toLowerCase() === 'portrait'
      ? 'portrait'
      : 'landscape';
  const columnPercentages = normalizeDutyListColumnPercentages(functionaryDutyList.columnWidths);

  const [rooms, assignments, csList, dcsList, friskMaleList, friskFemaleList, cctvList, classIvList] =
    await Promise.all([
      Room.find({ isActive: true, allocatedExamDates: examDateKey })
        .select('_id roomNo roomName floor allocationOrderByDate')
        .lean(),
      DutyAssignment.find({ examDate, isActive: true })
        .populate('room', '_id roomNo roomName floor')
        .populate('functionary', 'name employeeId schoolName schoolCode')
        .populate('functionary2', 'name employeeId schoolName schoolCode')
        .lean(),
      getDutyTypeSelectionsByDate(examDateKey, 'Centre Superintendent'),
      getDutyTypeSelectionsByDate(examDateKey, 'Deputy Centre Superintendent'),
      getDutyTypeSelectionsByDate(examDateKey, 'ASI (Frisking Male)'),
      getDutyTypeSelectionsByDate(examDateKey, 'ASI (Frisking Female)'),
      getDutyTypeSelectionsByDate(examDateKey, 'ASI (CCTV)'),
      getDutyTypeSelectionsByDate(examDateKey, 'Class IV'),
    ]);

  const sortedRooms = [...rooms].sort((a, b) => {
    const orderDiff = parseAllocationOrder(a, examDateKey) - parseAllocationOrder(b, examDateKey);
    if (orderDiff !== 0) return orderDiff;
    return compareRoomNo(a, b);
  });

  const rows = sortedRooms.map((room, idx) => {
    const assignment = assignments.find((entry) => String(entry?.room?._id || '') === String(room?._id || '')) || null;
    const invigilator1 = assignment?.functionary || null;
    const invigilator2 = assignment?.functionary2 || null;
    return {
      srNo: idx + 1,
      roomNo: normalizeText(room?.roomNo),
      roomName: normalizeText(room?.roomName),
      floor: normalizeText(room?.floor),
      inv1School: getSchoolInitials(invigilator1),
      inv1Name: normalizeText(invigilator1?.name),
      inv1EmployeeId: normalizeText(invigilator1?.employeeId),
      inv2School: getSchoolInitials(invigilator2),
      inv2Name: normalizeText(invigilator2?.name),
      inv2EmployeeId: normalizeText(invigilator2?.employeeId),
    };
  });

  const templateData = {
    pageSize,
    orientation,
    columnPercentages,
    examDateLabel: formatDateLabel(examDateKey),
    centreNo: normalizeText(centreDetails?.centreNo),
    centreName: normalizeText(centreDetails?.centreName),
    centreSuperintendent: normalizeText(csList?.[0]?.name),
    deputyCentreSuperintendent: normalizeText(dcsList?.[0]?.name),
    rows,
    frisking: [
      normalizeText(friskMaleList?.[0]?.name),
      normalizeText(friskFemaleList?.[0]?.name),
    ],
    cctv: [normalizeText(cctvList?.[0]?.name), normalizeText(cctvList?.[1]?.name)],
    classIv: [
      normalizeText(classIvList?.[0]?.name),
      normalizeText(classIvList?.[1]?.name),
      normalizeText(classIvList?.[2]?.name),
    ],
  };

  const pdfBuffer = await pdfGenerator.generateFunctionaryDutyRecord(templateData, {
    format: pageSize,
    landscape: orientation === 'landscape',
  });

  return res
    .status(200)
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="exam-functionary-duty-record-${examDateKey}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-store',
    })
    .send(pdfBuffer);
});

module.exports = {
  getDailyDuties,
  assignDailyDuties,
  downloadFunctionaryDutyRecord,
};
