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

  // YYYY-MM-DD
  const fromIso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fromIso) {
    const date = new Date(`${fromIso[1]}-${fromIso[2]}-${fromIso[3]}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // DD.MM.YYYY
  const fromDot = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (fromDot) {
    const date = new Date(`${fromDot[3]}-${fromDot[2]}-${fromDot[1]}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Fallback: try native Date parsing
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const date = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0)
  );
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeSchoolCode = (value) => String(value || '').trim().toUpperCase();
const normalizeSubjectCode = (value) => String(value || '').trim().toUpperCase();
const normalizeRollNo = (value) => String(value || '').trim().toUpperCase();
const normalizeRoomNo = (value) => {
  const trimmed = String(value || '').trim();
  // Normalize purely numeric room numbers by removing leading zeros.
  // SeatingPlanAllocation stores zero-padded values (e.g. "05") while
  // Room documents may store unpadded values (e.g. "5").
  if (/^\d+$/.test(trimmed)) return String(parseInt(trimmed, 10));
  return trimmed;
};
const normalizeText = (value) => String(value || '').trim();
const isCurrentInvigilator = (functionary) => (
  Boolean(functionary)
  && functionary.isActive !== false
  && normalizeText(functionary.dutyType) === 'Invigilator'
);

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

const getFunctionarySubjectCodes = (functionary) => {
  const codes = new Set();
  const raw = String(functionary?.subjectCode || '').trim();
  if (!raw) return [];

  raw
    .split(',')
    .map((value) => normalizeSubjectCode(value))
    .filter(Boolean)
    .forEach((code) => codes.add(code));

  return Array.from(codes);
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

/**
 * Rule 1 (seating): No candidate allotted same room across all exams — enforced in seatingPlanBuilder.
 * Rule 2 (duties – CBSE rule): No invigilator (identified by unique OASIS ID) shall supervise
 * the same candidate (identified by unique roll number) on any two exam dates.
 *
 * Implementation:
 *   - Link is OASIS ID ↔ Candidate Roll Number.
 *   - For the target date, build a map: roomId → Set<rollNo> (candidates seated in that room).
 *   - For each invigilator in the pool, collect the Set<rollNo> they supervised on ALL other dates
 *     (via DutyAssignment → Room → SeatingPlanAllocation).
 *   - An invigilator is ineligible for a room if ANY candidate roll number in that room was already
 *     supervised by the same OASIS ID on a previous date.
 *
 * All data is fetched in batch upfront so the backtracking solver runs purely in-memory.
 */

/**
 * Build a map of roomId → Set<rollNo> for candidates seated in each room on the given date.
 * Single batch query — no per-room calls.
 */
const buildRollNosByRoomForDate = async (examDateKey, rooms) => {
  const result = new Map(); // roomId (string) → Set<rollNo>
  if (!examDateKey || !rooms?.length) return result;

  // roomNo → roomId lookup
  const roomIdByRoomNo = new Map(
    rooms.map((r) => [normalizeRoomNo(r.roomNo), String(r._id)])
  );

  // Single query: all seating allocations for this exam date
  const allocations = await SeatingPlanAllocation.find({ examDate: examDateKey })
    .select('roomNo rollNo')
    .lean();

  for (const alloc of allocations) {
    const roomNo = normalizeRoomNo(alloc?.roomNo);
    const roomId = roomIdByRoomNo.get(roomNo);
    if (!roomId) continue;
    const rollNo = normalizeRollNo(alloc?.rollNo);
    if (!rollNo) continue;
    if (!result.has(roomId)) result.set(roomId, new Set());
    result.get(roomId).add(rollNo);
  }
  return result;
};

/**
 * For a set of invigilator IDs, batch-compute the set of candidate roll numbers each one has
 * already supervised on any date OTHER than excludeDateKey.
 *
 * Returns: Map<functionaryIdString, Set<rollNo>>
 *
 * Steps:
 *   1. Find ALL DutyAssignment records on other dates where any pool invigilator is assigned.
 *   2. Collect the distinct (date, roomNo) pairs from those assignments.
 *   3. Batch-fetch all SeatingPlanAllocation records for those (date, roomNo) pairs.
 *   4. Map roll numbers back to each invigilator.
 */
const buildSupervisedRollNosByFunctionary = async (functionaryIds, excludeDateKey) => {
  const supervised = new Map(); // functionaryId → Set<rollNo>
  for (const id of functionaryIds) supervised.set(String(id), new Set());

  if (!functionaryIds.length || !excludeDateKey) return supervised;

  const excludeDate = normalizeExamDate(excludeDateKey);
  if (!excludeDate) return supervised;

  // Step 1: All duty assignments for pool invigilators on OTHER dates
  const otherAssignments = await DutyAssignment.find({
    isActive: true,
    examDate: { $ne: excludeDate },
    $or: [
      { functionary: { $in: functionaryIds } },
      { functionary2: { $in: functionaryIds } },
    ],
  })
    .select('examDate room functionary functionary2')
    .lean();

  if (!otherAssignments.length) return supervised;

  // Step 2: Collect unique roomIds; resolve roomNo
  const roomIds = [...new Set(otherAssignments.map((a) => String(a?.room)).filter(Boolean))];
  const rooms = await Room.find({ _id: { $in: roomIds } }).select('_id roomNo').lean();
  const roomNoById = new Map(rooms.map((r) => [String(r._id), normalizeRoomNo(r.roomNo)]));

  // Build (dateKey, roomNo) → [functionaryId, ...] mapping
  // and collect unique (dateKey, roomNo) pairs for batch SeatingPlan query
  const pairToFuncIds = new Map(); // "dateKey::roomNo" → Set<functionaryId>
  const dateKeys = new Set();

  for (const a of otherAssignments) {
    const roomNo = roomNoById.get(String(a.room));
    if (!roomNo) continue;
    const d = a.examDate instanceof Date
      ? a.examDate.toISOString().slice(0, 10)
      : String(a.examDate).slice(0, 10);
    if (!d) continue;

    const pairKey = `${d}::${roomNo}`;
    if (!pairToFuncIds.has(pairKey)) pairToFuncIds.set(pairKey, new Set());
    dateKeys.add(d);

    const fn1 = String(a.functionary || '');
    const fn2 = String(a.functionary2 || '');
    if (fn1 && supervised.has(fn1)) pairToFuncIds.get(pairKey).add(fn1);
    if (fn2 && supervised.has(fn2)) pairToFuncIds.get(pairKey).add(fn2);
  }

  if (pairToFuncIds.size === 0) return supervised;

  // Step 3: Batch-fetch all SeatingPlanAllocation records for those dates
  const allAllocations = await SeatingPlanAllocation.find({
    examDate: { $in: [...dateKeys] },
  })
    .select('examDate roomNo rollNo')
    .lean();

  // Index allocations by "dateKey::roomNo" for fast lookup
  const allocsByPair = new Map(); // "dateKey::roomNo" → rollNo[]
  for (const alloc of allAllocations) {
    const roomNo = normalizeRoomNo(alloc?.roomNo);
    const dateKey = String(alloc?.examDate || '').slice(0, 10);
    if (!roomNo || !dateKey) continue;
    const pairKey = `${dateKey}::${roomNo}`;
    if (!pairToFuncIds.has(pairKey)) continue; // skip irrelevant pairs
    const rollNo = normalizeRollNo(alloc?.rollNo);
    if (!rollNo) continue;
    if (!allocsByPair.has(pairKey)) allocsByPair.set(pairKey, []);
    allocsByPair.get(pairKey).push(rollNo);
  }

  // Step 4: Map roll numbers back to each invigilator
  for (const [pairKey, funcIdSet] of pairToFuncIds) {
    const rollNos = allocsByPair.get(pairKey);
    if (!rollNos?.length) continue;
    for (const funcId of funcIdSet) {
      const set = supervised.get(funcId);
      if (set) {
        for (const r of rollNos) set.add(r);
      }
    }
  }

  return supervised;
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

const buildRoomSubjectCodes = async (examDateKey, rooms = []) => {
  const roomIdByRoomNo = new Map(
    (rooms || [])
      .map((room) => [normalizeRoomNo(room?.roomNo), String(room?._id || '')])
      .filter(([roomNo, roomId]) => Boolean(roomNo) && Boolean(roomId))
  );

  if (roomIdByRoomNo.size === 0) return {};

  const allocations = await SeatingPlanAllocation.find({ examDate: examDateKey })
    .select('roomNo subjectCode')
    .lean();
  if (!allocations.length) return {};

  const subjectCodesByRoomId = {};
  for (const allocation of allocations) {
    const roomNo = normalizeRoomNo(allocation?.roomNo);
    const roomId = roomIdByRoomNo.get(roomNo);
    if (!roomId) continue;

    const subjectCode = normalizeSubjectCode(allocation?.subjectCode);
    if (!subjectCode) continue;

    if (!subjectCodesByRoomId[roomId]) {
      subjectCodesByRoomId[roomId] = new Set();
    }
    subjectCodesByRoomId[roomId].add(subjectCode);
  }

  return Object.fromEntries(
    Object.entries(subjectCodesByRoomId).map(([roomId, codes]) => [roomId, Array.from(codes)])
  );
};

/**
 * Build a mapping of roomNo -> school names for display purposes.
 * Uses SeatingPlanAllocation to find which candidates sit in which room,
 * then looks up the school name from the Candidate collection.
 */
const buildRoomSchoolNames = async (examDateKey, rooms = []) => {
  if (!rooms.length) return {};

  const allocations = await SeatingPlanAllocation.find({ examDate: examDateKey })
    .select('roomNo rollNo')
    .lean();
  if (!allocations.length) return {};

  const rollNumbers = Array.from(
    new Set(allocations.map((entry) => normalizeRollNo(entry?.rollNo)).filter(Boolean))
  );
  if (rollNumbers.length === 0) return {};

  const candidates = await Candidate.find({ rollNumber: { $in: rollNumbers } })
    .select('rollNumber schoolName schoolCode')
    .lean();
  const schoolInfoByRollNo = new Map(
    candidates.map((c) => [
      normalizeRollNo(c?.rollNumber),
      c?.schoolName || c?.schoolCode || '',
    ])
  );

  // Build roomNo -> Set<schoolName>
  const schoolNamesByRoomNo = {};
  for (const allocation of allocations) {
    const roomNo = normalizeRoomNo(allocation?.roomNo);
    if (!roomNo) continue;

    const schoolName = schoolInfoByRollNo.get(normalizeRollNo(allocation?.rollNo));
    if (!schoolName) continue;

    if (!schoolNamesByRoomNo[roomNo]) {
      schoolNamesByRoomNo[roomNo] = new Set();
    }
    schoolNamesByRoomNo[roomNo].add(schoolName);
  }

  return Object.fromEntries(
    Object.entries(schoolNamesByRoomNo).map(([roomNo, names]) => [roomNo, Array.from(names)])
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

  const examDateKey = examDate.toISOString().slice(0, 10);
  const duties = await DutyAssignment.find({ examDate, isActive: true })
    .populate('room', 'roomNo roomName floor allocationOrderByDate')
    .populate('functionary', 'name employeeId department designation')
    .populate('functionary2', 'name employeeId department designation')
    .lean();

  const sortedDuties = [...duties].sort((a, b) => {
    const orderDiff = parseAllocationOrder(a?.room, examDateKey) - parseAllocationOrder(b?.room, examDateKey);
    if (orderDiff !== 0) return orderDiff;
    return compareRoomNo(a?.room, b?.room);
  });
  const activeRooms = await Room.find({ isActive: true }).select('_id roomNo').lean();
  const [roomCandidateSchoolCodes, roomSubjectCodes, roomSchoolNames, rollNosByRoomMap] = await Promise.all([
    buildRoomCandidateSchoolCodes(examDateKey, activeRooms),
    buildRoomSubjectCodes(examDateKey, activeRooms),
    buildRoomSchoolNames(examDateKey, activeRooms),
    buildRollNosByRoomForDate(examDateKey, activeRooms),
  ]);

  // Convert Map<roomId, Set<rollNo>> to plain object for API response
  const roomRollNumbers = Object.fromEntries(
    Array.from(rollNosByRoomMap.entries()).map(([roomId, rollNos]) => [roomId, Array.from(rollNos)])
  );

  return res.status(200).json({
    success: true,
    data: {
      examDate: examDateKey,
      duties: sortedDuties,
      totalAssigned: sortedDuties.length,
      roomCandidateSchoolCodes,
      roomSubjectCodes,
      roomSchoolNames,
      roomRollNumbers,
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
  const sortedRooms = [...rooms].sort((a, b) => {
    const orderDiff = parseAllocationOrder(a, examDateKey) - parseAllocationOrder(b, examDateKey);
    if (orderDiff !== 0) return orderDiff;
    return compareRoomNo(a, b);
  });
  if (sortedRooms.length === 0) {
    return res.status(400).json({ success: false, message: 'No active rooms found. Add rooms first.' });
  }

  const allocationMode = await getDutyAllocationMode();
  const lookupIds = Array.from(new Set([...firstFunctionaryIds, ...secondFunctionaryIds]));
  const functionaries = await Teacher.find({ _id: { $in: lookupIds }, isActive: true })
    .select('name employeeId department designation schoolCode subjectCode supervisionHistory dutyType isActive')
    .lean();
  if (functionaries.length !== lookupIds.length) {
    return res.status(400).json({ success: false, message: 'Some selected functionaries are invalid or inactive.' });
  }
  const invalidInvigilators = functionaries.filter((functionary) => !isCurrentInvigilator(functionary));
  if (invalidInvigilators.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Only active current invigilators can be assigned to room duties.',
      invalidFunctionaries: invalidInvigilators.map((functionary) => ({
        _id: functionary._id,
        name: functionary.name,
        employeeId: functionary.employeeId,
        dutyType: functionary.dutyType,
      })),
    });
  }
  const functionaryMap = new Map(functionaries.map((f) => [String(f._id), f]));
  const [roomCandidateSchoolCodes, roomSubjectCodes] = await Promise.all([
    buildRoomCandidateSchoolCodes(examDateKey, sortedRooms),
    buildRoomSubjectCodes(examDateKey, sortedRooms),
  ]);
  const hasSchoolConflict = (roomId, functionary) => {
    if (!functionary) return false;
    const invigilatorSchoolCode = normalizeSchoolCode(functionary.schoolCode);
    if (!invigilatorSchoolCode) return false;
    const candidateSchoolCodes = (roomCandidateSchoolCodes[String(roomId)] || []).map((code) => normalizeSchoolCode(code));
    const conflict = candidateSchoolCodes.includes(invigilatorSchoolCode);
    return conflict;
  };
  const getSubjectConflictCodes = (roomId, functionary) => {
    const teacherCodes = getFunctionarySubjectCodes(functionary);
    if (teacherCodes.length === 0) return [];
    const roomCodes = (roomSubjectCodes[String(roomId)] || []).map((code) => normalizeSubjectCode(code));
    if (roomCodes.length === 0) return [];
    const roomCodeSet = new Set(roomCodes);
    return teacherCodes.filter((code) => roomCodeSet.has(code));
  };
  const hasSubjectConflict = (roomId, functionary) => getSubjectConflictCodes(roomId, functionary).length > 0;

  // Candidate roll numbers seated in each room TODAY — needed by both modes
  const rollNosByRoom = await buildRollNosByRoomForDate(examDateKey, sortedRooms);

  // Helper: check if functionary has supervised any candidate in the given room on a previous date.
  // Returns the first overlapping roll number, or null if no overlap.
  const checkCandidateOverlap = (functionary, roomId) => {
    const supervisedRollNos = new Set();
    for (const entry of (functionary?.supervisionHistory || [])) {
      if (entry.examDate === examDateKey) continue;
      for (const r of (entry.rollNumbers || [])) {
        supervisedRollNos.add(normalizeRollNo(r));
      }
    }
    if (supervisedRollNos.size === 0) return null;
    const roomRollNos = rollNosByRoom.get(String(roomId));
    if (!roomRollNos) return null;
    for (const rollNo of roomRollNos) {
      if (supervisedRollNos.has(rollNo)) return rollNo;
    }
    return null;
  };

  let orderedFirst = [];
  let orderedSecond = [];

  if (allocationMode === 'auto') {
    const rawPool = firstFunctionaryIds.map((id) => functionaryMap.get(id)).filter(Boolean);
    // Deduplicate by _id — if the same teacher ID appears twice in the checked list,
    // keep only the first occurrence to prevent same teacher being assigned to both slots.
    const seenPoolIds = new Set();
    const pool = rawPool.filter((fn) => {
      const id = String(fn._id);
      if (seenPoolIds.has(id)) return false;
      seenPoolIds.add(id);
      return true;
    });
    if (pool.length < sortedRooms.length * 2) {
      return res.status(400).json({
        success: false,
        message: `Selected functionaries (${pool.length}) are fewer than required for two invigilators per room (${sortedRooms.length * 2}).`,
      });
    }

    // ── Build supervised-roll-numbers map ──────────────────────────────────
    // Query DutyAssignment + SeatingPlanAllocation directly so that historical
    // assignments (made before supervisionHistory was introduced, or made manually)
    // are included. Fall back to merging with supervisionHistory as a supplement
    // in case any assignments exist in history but not in DutyAssignment.
    const poolIds = pool.map((fn) => fn._id);
    const dbSupervisedByFunc = await buildSupervisedRollNosByFunctionary(poolIds, examDateKey);

    // Merge with supervisionHistory (for any entries not captured in DutyAssignment)
    const supervisedByFunc = new Map();
    for (const fn of pool) {
      const funcId = String(fn._id);
      const rollNos = new Set(dbSupervisedByFunc.get(funcId) || []);
      for (const entry of (fn.supervisionHistory || [])) {
        if (entry.examDate === examDateKey) continue;
        for (const r of (entry.rollNumbers || [])) {
          rollNos.add(normalizeRollNo(r));
        }
      }
      supervisedByFunc.set(funcId, rollNos);
    }

    // ── Build eligibility matrix purely in-memory ───────────────────────
    // eligible[funcIdx][roomIdx] = true means this invigilator can be placed in that room.
    //
    // An invigilator is INELIGIBLE for a room if:
    //   (a) School conflict: invigilator's schoolCode matches any candidate's schoolCode in the room, OR
    //   (b) CBSE Rule 2 — OASIS ID ↔ Roll Number overlap: ANY candidate roll number seated
    //       in this room today was already supervised by this invigilator on a previous date.
    const eligible = pool.map((fn) => {
      const funcId = String(fn._id);
      const prevRollNos = supervisedByFunc.get(funcId) || new Set();

      return sortedRooms.map((room) => {
        if (hasSubjectConflict(room._id, fn)) return false;

        // (a) School conflict
        if (hasSchoolConflict(room._id, fn)) return false;

        // (b) OASIS ID ↔ Roll Number overlap
        const roomRollNos = rollNosByRoom.get(String(room._id));
        if (roomRollNos && prevRollNos.size > 0) {
          for (const rollNo of roomRollNos) {
            if (prevRollNos.has(rollNo)) return false;
          }
        }

        return true;
      });
    });
    // Backtracking assignment: fills rooms[roomIdx] with two invigilators from pool.
    // assigned[funcIdx] = true means this invigilator is already used.
    // firstResult[roomIdx] / secondResult[roomIdx] store chosen invigilator indices.
    const nRooms = sortedRooms.length;
    const nFuncs = pool.length;
    const assigned = new Array(nFuncs).fill(false);
    const firstResult = new Array(nRooms).fill(-1);
    const secondResult = new Array(nRooms).fill(-1);

    const backtrack = (roomIdx, eligMatrix) => {
      if (roomIdx === nRooms) return true; // all rooms filled
      // Pick first invigilator for this room
      for (let i = 0; i < nFuncs; i++) {
        if (assigned[i] || !eligMatrix[i][roomIdx]) continue;
        assigned[i] = true;
        firstResult[roomIdx] = i;
        // Pick second invigilator for this room
        for (let j = 0; j < nFuncs; j++) {
          if (j === i || assigned[j] || !eligMatrix[j][roomIdx]) continue;
          // Safety net: never assign the same teacher to both Inv1 and Inv2 slots
          if (String(pool[j]._id) === String(pool[i]._id)) continue;
          assigned[j] = true;
          secondResult[roomIdx] = j;
          if (backtrack(roomIdx + 1, eligMatrix)) return true;
          assigned[j] = false;
          secondResult[roomIdx] = -1;
        }
        assigned[i] = false;
        firstResult[roomIdx] = -1;
      }
      return false;
    };

    // Pass 1: strict (school conflict + candidate overlap) — no fallback
    const solved = backtrack(0, eligible);

    if (!solved) {
      // Build per-functionary conflict diagnostics so the UI can explain exactly
      // why auto assignment failed.
      const conflictDetails = pool.map((fn, fnIdx) => {
        const funcId = String(fn._id);
        const ineligibleRooms = [];
        sortedRooms.forEach((room, rIdx) => {
          if (eligible[fnIdx][rIdx]) return; // no conflict for this room
          const reasons = [];
          if (hasSubjectConflict(room._id, fn)) {
            reasons.push({ type: 'subject', codes: getSubjectConflictCodes(room._id, fn) });
          }
          if (hasSchoolConflict(room._id, fn)) {
            reasons.push({ type: 'school', schoolCode: normalizeSchoolCode(fn.schoolCode) });
          }
          // Candidate overlap
          const prevRollNos = supervisedByFunc.get(funcId) || new Set();
          const roomRollNos = rollNosByRoom.get(String(room._id));
          if (roomRollNos && prevRollNos.size > 0) {
            const overlapping = [];
            for (const r of roomRollNos) { if (prevRollNos.has(r)) overlapping.push(r); }
            if (overlapping.length > 0) {
              reasons.push({ type: 'candidateOverlap', rollNumbers: overlapping.slice(0, 5), totalOverlaps: overlapping.length });
            }
          }
          if (reasons.length > 0) ineligibleRooms.push({ roomNo: normalizeRoomNo(room.roomNo), reasons });
        });
        const eligibleCount = eligible[fnIdx].filter(Boolean).length;
        return {
          _id: funcId,
          name: fn.name,
          employeeId: fn.employeeId,
          schoolCode: normalizeSchoolCode(fn.schoolCode),
          eligibleRoomCount: eligibleCount,
          totalRooms: nRooms,
          ineligibleRooms,
        };
      });

      return res.status(400).json({
        success: false,
        message: `Auto assignment could not complete. No valid assignment exists where each invigilator avoids subject conflict, candidate-school conflict, and any candidate they have previously supervised. Try adding more eligible functionaries.`,
        conflictDetails,
      });
    }

    // Sanity check: every room must have valid first and second indices
    const invalidRooms = sortedRooms
      .map((room, idx) => ({ room, idx }))
      .filter(({ idx }) => firstResult[idx] === -1 || secondResult[idx] === -1)
      .map(({ room }) => room.roomNo);
    if (invalidRooms.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Auto assignment could not complete. No valid assignment exists where each invigilator avoids subject conflict, candidate-school conflict, and any candidate they have previously supervised. Try adding more eligible functionaries.`,
      });
    }

    orderedFirst = firstResult.map((i) => pool[i]);
    orderedSecond = secondResult.map((i) => pool[i]);
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
      const firstSubjectConflicts = getSubjectConflictCodes(room._id, first);
      if (firstSubjectConflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Subject teacher cannot be assigned to room ${room.roomNo}. ${first.name || 'Selected invigilator'} matches ${firstSubjectConflicts.join(', ')}.`,
        });
      }
      const secondSubjectConflicts = getSubjectConflictCodes(room._id, second);
      if (secondSubjectConflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Subject teacher cannot be assigned to room ${room.roomNo}. ${second.name || 'Selected invigilator'} matches ${secondSubjectConflicts.join(', ')}.`,
        });
      }
      // School conflict checks
      if (hasSchoolConflict(room._id, first)) {
        return res.status(400).json({
          success: false,
          message: `Invigilator cannot be of candidate school. ${first.name || 'Selected invigilator'} (school code: ${normalizeSchoolCode(first.schoolCode)}) matches candidates in room ${room.roomNo}.`,
        });
      }
      if (hasSchoolConflict(room._id, second)) {
        return res.status(400).json({
          success: false,
          message: `Invigilator cannot be of candidate school. ${second.name || 'Selected invigilator'} (school code: ${normalizeSchoolCode(second.schoolCode)}) matches candidates in room ${room.roomNo}.`,
        });
      }
      // Candidate overlap checks (CBSE rule: no invigilator supervises same candidate on two dates)
      const firstOverlap = checkCandidateOverlap(first, room._id);
      if (firstOverlap) {
        return res.status(400).json({
          success: false,
          message: `Candidate overlap: ${first.name || 'Selected invigilator'} already supervised candidate ${firstOverlap} on a previous date. Cannot assign to room ${room.roomNo}.`,
        });
      }
      const secondOverlap = checkCandidateOverlap(second, room._id);
      if (secondOverlap) {
        return res.status(400).json({
          success: false,
          message: `Candidate overlap: ${second.name || 'Selected invigilator'} already supervised candidate ${secondOverlap} on a previous date. Cannot assign to room ${room.roomNo}.`,
        });
      }
      if (String(first._id) === String(second._id)) {
        return res.status(400).json({ success: false, message: `Invigilator 1 and 2 cannot be same for room ${room.roomNo}.` });
      }
      if (usedIds.has(String(first._id)) || usedIds.has(String(second._id))) {
        return res.status(400).json({ success: false, message: 'One invigilator cannot be assigned to multiple rooms on same date.' });
      }
      usedIds.add(String(first._id));
      usedIds.add(String(second._id));
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

  // ── Persist supervisionHistory on each assigned teacher ──
  // For each teacher, remove any existing entry for this date (handles re-assignment)
  // then push a new entry with the current room's roll numbers.
  const historyOps = [];
  for (let idx = 0; idx < sortedRooms.length; idx++) {
    const room = sortedRooms[idx];
    const roomId = String(room._id);
    const roomNo = normalizeRoomNo(room.roomNo);
    const rollNumbers = Array.from(rollNosByRoom.get(roomId) || []);

    for (const teacher of [orderedFirst[idx], orderedSecond[idx]]) {
      if (!teacher) continue;
      historyOps.push({
        updateOne: {
          filter: { _id: teacher._id },
          update: { $pull: { supervisionHistory: { examDate: examDateKey } } },
        },
      });
      historyOps.push({
        updateOne: {
          filter: { _id: teacher._id },
          update: {
            $push: {
              supervisionHistory: { examDate: examDateKey, roomNo, rollNumbers },
            },
          },
        },
      });
    }
  }
  if (historyOps.length > 0) {
    await Teacher.bulkWrite(historyOps, { ordered: true });
  }

  const duties = await DutyAssignment.find({ examDate, isActive: true })
    .populate('room', 'roomNo roomName floor allocationOrderByDate')
    .populate('functionary', 'name employeeId department designation')
    .populate('functionary2', 'name employeeId department designation')
    .lean();
  const sortedDuties = [...duties].sort((a, b) => {
    const orderDiff = parseAllocationOrder(a?.room, examDateKey) - parseAllocationOrder(b?.room, examDateKey);
    if (orderDiff !== 0) return orderDiff;
    return compareRoomNo(a?.room, b?.room);
  });

  return res.status(200).json({
    success: true,
    message: `Assigned duties for ${sortedDuties.length} room(s) on ${examDateKey}.`,
    data: {
      examDate: examDateKey,
      duties: sortedDuties,
      totalAssigned: sortedDuties.length,
      totalRooms: sortedRooms.length,
      roomCandidateSchoolCodes,
      roomSubjectCodes,
      roomRollNumbers: Object.fromEntries(
        Array.from(rollNosByRoom.entries()).map(([roomId, rollNos]) => [roomId, Array.from(rollNos)])
      ),
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

  const pdfBuffer = await pdfGenerator.generateFunctionaryDutyRecord(templateData);

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

/**
 * Rebuild supervisionHistory for a single exam date.
 * Called when seating plan is regenerated (roll numbers in rooms may change).
 */
const rebuildSupervisionHistoryForDate = async (examDateKey) => {
  if (!examDateKey) return;

  const examDate = normalizeExamDate(examDateKey);
  if (!examDate) return;

  const assignments = await DutyAssignment.find({ examDate, isActive: true })
    .select('room functionary functionary2')
    .lean();
  if (!assignments.length) return;

  const roomIds = [...new Set(assignments.map((a) => String(a?.room)).filter(Boolean))];
  const rooms = await Room.find({ _id: { $in: roomIds } }).select('_id roomNo').lean();
  const roomNoById = new Map(rooms.map((r) => [String(r._id), normalizeRoomNo(r.roomNo)]));

  const allocations = await SeatingPlanAllocation.find({ examDate: examDateKey })
    .select('roomNo rollNo')
    .lean();

  const rollNosByRoomNo = new Map();
  for (const alloc of allocations) {
    const roomNo = normalizeRoomNo(alloc?.roomNo);
    if (!roomNo) continue;
    if (!rollNosByRoomNo.has(roomNo)) rollNosByRoomNo.set(roomNo, []);
    rollNosByRoomNo.get(roomNo).push(normalizeRollNo(alloc?.rollNo));
  }

  const ops = [];
  const processedTeachers = new Set();

  for (const assignment of assignments) {
    const roomNo = roomNoById.get(String(assignment.room));
    if (!roomNo) continue;
    const rollNumbers = rollNosByRoomNo.get(roomNo) || [];

    for (const funcField of ['functionary', 'functionary2']) {
      const funcId = assignment[funcField];
      if (!funcId || processedTeachers.has(String(funcId))) continue;
      processedTeachers.add(String(funcId));

      ops.push({
        updateOne: {
          filter: { _id: funcId },
          update: { $pull: { supervisionHistory: { examDate: examDateKey } } },
        },
      });
      ops.push({
        updateOne: {
          filter: { _id: funcId },
          update: {
            $push: {
              supervisionHistory: { examDate: examDateKey, roomNo, rollNumbers },
            },
          },
        },
      });
    }
  }

  if (ops.length > 0) {
    await Teacher.bulkWrite(ops, { ordered: true });
  }
};

/**
 * Rebuild supervisionHistory for ALL teachers from existing DutyAssignment + SeatingPlanAllocation.
 * Used for initial migration and emergency recovery.
 */
const rebuildAllSupervisionHistory = asyncHandler(async (req, res) => {
  const assignments = await DutyAssignment.find({ isActive: true })
    .select('examDate room functionary functionary2')
    .lean();

  if (!assignments.length) {
    await Teacher.updateMany({}, { $set: { supervisionHistory: [] } });
    return res.status(200).json({
      success: true,
      message: 'No duty assignments found. Cleared supervisionHistory for all teachers.',
      data: { teachersUpdated: 0 },
    });
  }

  const roomIds = [...new Set(assignments.map((a) => String(a?.room)).filter(Boolean))];
  const rooms = await Room.find({ _id: { $in: roomIds } }).select('_id roomNo').lean();
  const roomNoById = new Map(rooms.map((r) => [String(r._id), normalizeRoomNo(r.roomNo)]));

  const examDates = [...new Set(
    assignments.map((a) => {
      const d = a.examDate instanceof Date ? a.examDate.toISOString().slice(0, 10) : String(a.examDate).slice(0, 10);
      return d;
    }).filter(Boolean)
  )];

  const allocations = await SeatingPlanAllocation.find({ examDate: { $in: examDates } })
    .select('examDate roomNo rollNo')
    .lean();

  const rollNosByDateRoom = new Map();
  for (const alloc of allocations) {
    const key = `${alloc.examDate}::${normalizeRoomNo(alloc?.roomNo)}`;
    if (!rollNosByDateRoom.has(key)) rollNosByDateRoom.set(key, []);
    rollNosByDateRoom.get(key).push(normalizeRollNo(alloc?.rollNo));
  }

  const historyByTeacher = new Map();
  for (const assignment of assignments) {
    const dateKey = assignment.examDate instanceof Date
      ? assignment.examDate.toISOString().slice(0, 10)
      : String(assignment.examDate).slice(0, 10);
    const roomNo = roomNoById.get(String(assignment.room));
    if (!roomNo || !dateKey) continue;

    const lookupKey = `${dateKey}::${roomNo}`;
    const rollNumbers = rollNosByDateRoom.get(lookupKey) || [];

    for (const funcField of ['functionary', 'functionary2']) {
      const funcId = String(assignment[funcField] || '');
      if (!funcId) continue;
      if (!historyByTeacher.has(funcId)) historyByTeacher.set(funcId, []);
      historyByTeacher.get(funcId).push({ examDate: dateKey, roomNo, rollNumbers });
    }
  }

  const ops = [];
  for (const [teacherId, history] of historyByTeacher) {
    ops.push({
      updateOne: {
        filter: { _id: teacherId },
        update: { $set: { supervisionHistory: history } },
      },
    });
  }

  // Clear supervisionHistory for teachers not in the map
  const teacherIdsWithHistory = [...historyByTeacher.keys()];
  ops.push({
    updateMany: {
      filter: teacherIdsWithHistory.length > 0
        ? { _id: { $nin: teacherIdsWithHistory } }
        : {},
      update: { $set: { supervisionHistory: [] } },
    },
  });

  if (ops.length > 0) {
    await Teacher.bulkWrite(ops);
  }

  return res.status(200).json({
    success: true,
    message: `Rebuilt supervisionHistory for ${historyByTeacher.size} teacher(s).`,
    data: { teachersUpdated: historyByTeacher.size },
  });
});

module.exports = {
  getDailyDuties,
  assignDailyDuties,
  downloadFunctionaryDutyRecord,
  rebuildAllSupervisionHistory,
  rebuildSupervisionHistoryForDate,
};
