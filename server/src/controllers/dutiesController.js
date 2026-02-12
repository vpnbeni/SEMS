const asyncHandler = require('../middleware/asyncHandler');
const DutyAssignment = require('../models/DutyAssignment');
const Teacher = require('../models/Teacher');
const Room = require('../models/Room');

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
    .sort({ room: 1 })
    .lean();

  const sortedDuties = [...duties].sort((a, b) => compareRoomNo(a?.room, b?.room));

  return res.status(200).json({
    success: true,
    data: {
      examDate: examDate.toISOString().slice(0, 10),
      duties: sortedDuties,
      totalAssigned: sortedDuties.length,
    },
  });
});

const assignDailyDuties = asyncHandler(async (req, res) => {
  const examDate = normalizeExamDate(req.body.examDate);
  const functionaryIds = Array.isArray(req.body.functionaryIds)
    ? [...new Set(req.body.functionaryIds.map((id) => String(id).trim()).filter(Boolean))]
    : [];

  if (!examDate) {
    return res.status(400).json({
      success: false,
      message: 'Invalid examDate. Use YYYY-MM-DD format.',
    });
  }

  if (functionaryIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Select at least one exam functionary.',
    });
  }

  const rooms = await Room.find({ isActive: true }).lean();
  const sortedRooms = [...rooms].sort(compareRoomNo);

  if (sortedRooms.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No active rooms found. Add rooms first.',
    });
  }

  const functionaries = await Teacher.find({
    _id: { $in: functionaryIds },
    isActive: true,
  })
    .select('name employeeId department designation')
    .lean();

  if (functionaries.length !== functionaryIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Some selected functionaries are invalid or inactive.',
    });
  }

  if (functionaries.length < sortedRooms.length) {
    return res.status(400).json({
      success: false,
      message: `Selected functionaries (${functionaries.length}) are fewer than active rooms (${sortedRooms.length}).`,
    });
  }

  const functionaryMap = new Map(functionaries.map((f) => [String(f._id), f]));
  const orderedFunctionaries = functionaryIds
    .map((id) => functionaryMap.get(String(id)))
    .filter(Boolean)
    .slice(0, sortedRooms.length);

  const assignedAt = new Date();
  const assignedBy = req.user?._id || null;

  await DutyAssignment.bulkWrite(
    sortedRooms.map((room, idx) => ({
      updateOne: {
        filter: { examDate, room: room._id },
        update: {
          $set: {
            functionary: orderedFunctionaries[idx]._id,
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
    .sort({ room: 1 })
    .lean();

  const sortedDuties = [...duties].sort((a, b) => compareRoomNo(a?.room, b?.room));

  return res.status(200).json({
    success: true,
    message: `Assigned duties for ${sortedDuties.length} room(s) on ${examDate
      .toISOString()
      .slice(0, 10)}.`,
    data: {
      examDate: examDate.toISOString().slice(0, 10),
      duties: sortedDuties,
      totalAssigned: sortedDuties.length,
      totalRooms: sortedRooms.length,
    },
  });
});

module.exports = {
  getDailyDuties,
  assignDailyDuties,
};
