const asyncHandler = require('../middleware/asyncHandler');
const CBSEDatesheet = require('../models/CBSEDatesheet');
const { Form66 } = require('../models/Form66');
const Room = require('../models/Room');
const Candidate = require('../models/Candidate');
const DutySelection = require('../models/DutySelection');
const AnswerSheet = require('../models/AnswerSheet');
const CentreDetail = require('../models/CentreDetail');
const seatingPlanBuilder = require('../utils/seatingPlanBuilder');
const { generateResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

// @desc    Get today's exams with candidate counts and room allocations
// @route   GET /api/dashboard/todays-exams
// @access  Private
const getTodaysExams = asyncHandler(async (req, res) => {
  // Get today's date, normalized to start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Format today as DD.MM.YYYY for Form66 queries
  const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

  // Get active CBSE datesheet
  const cbseDatesheet = await CBSEDatesheet.getActive();

  if (!cbseDatesheet) {
    return res.status(HTTP_STATUS.OK).json(
      generateResponse(true, 'No active datesheet found', {
        examDate: today.toISOString().split('T')[0],
        dayName: getDayName(today),
        exams: [],
        totalExams: 0,
        totalCandidates: 0
      })
    );
  }

  // Filter entries for today's date
  const todaysEntries = cbseDatesheet.entries.filter(entry => {
    const entryDate = new Date(entry.examDate);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });

  if (todaysEntries.length === 0) {
    return res.status(HTTP_STATUS.OK).json(
      generateResponse(true, 'No exams scheduled for today', {
        examDate: today.toISOString().split('T')[0],
        dayName: getDayName(today),
        exams: [],
        totalExams: 0,
        totalCandidates: 0,
        packing: { clothColor: '', marker: '' },
        dutiesAssignedCount: 0
      })
    );
  }

  // Get all rooms for allocation calculation
  const rooms = await Room.find({ isActive: true }).sort({ roomNo: 1 });

  // Packing details and duties count for the day (once)
  const centreDetails = await CentreDetail.findOne({}).sort({ updatedAt: -1 }).lean();
  const packing = {
    clothColor: centreDetails?.packingClothColor || '',
    marker: centreDetails?.packingMarker || ''
  };
  const dutiesAssignedCount = await DutySelection.countDocuments({ examDate: todayStr });

  // Process each exam
  const examsWithDetails = await Promise.all(
    todaysEntries.map(async (entry) => {
      try {
        // Get candidate count and roll numbers from Form66
        const form66Docs = await Form66.find({
          examDate: todayStr,
          subjectCode: entry.subject.code,
          isActive: true
        })
          .select('rollNo')
          .lean();
        const candidateCount = form66Docs.length;
        const rollNos = form66Docs.map((d) => String(d.rollNo).trim()).filter(Boolean);

        // School-wise candidate count
        let schoolWiseCandidateCount = [];
        if (rollNos.length > 0) {
          const candidates = await Candidate.find(
            { rollNumber: { $in: rollNos } },
            'schoolName schoolCode'
          ).lean();
          const bySchool = new Map();
          for (const c of candidates) {
            const key = String(c.schoolName || c.schoolCode || 'Unknown').trim() || 'Unknown';
            bySchool.set(key, (bySchool.get(key) || 0) + 1);
          }
          schoolWiseCandidateCount = Array.from(bySchool.entries()).map(([schoolName, count]) => ({
            schoolName,
            count
          }));
        }

        // Hindi medium candidate count (candidates with this subject in Hindi medium)
        let hindiMediumCandidateCount = 0;
        if (rollNos.length > 0) {
          hindiMediumCandidateCount = await Candidate.countDocuments({
            rollNumber: { $in: rollNos },
            subjectCodes: {
              $elemMatch: {
                code: entry.subject.code,
                medium: { $regex: /hindi|हिंदी|h\b/i }
              }
            }
          });
        }

        // Answer sheets used for this exam (linked to this datesheet entry)
        const answerSheets = await AnswerSheet.find({
          centreDatesheetEntry: entry._id,
          isActive: true
        })
          .select('serialFrom serialTo answerSheetType colour')
          .lean();
        const answerSheetDetails = answerSheets.map((s) => ({
          serialFrom: s.serialFrom,
          serialTo: s.serialTo,
          type: s.answerSheetType,
          colour: s.colour
        }));

        // Get room allocations using seating plan builder
        let roomDetails = [];
        let roomsUsed = 0;

        if (candidateCount > 0 && rooms.length > 0) {
          try {
            const seatingData = await seatingPlanBuilder.buildSeatingData(entry._id);
            roomDetails = seatingData.rooms.map((room) => ({
              roomNo: room.roomNo,
              roomName: room.roomName || '',
              candidates: room.registered
            }));
            roomsUsed = seatingData.rooms.length;
          } catch (seatingError) {
            console.error(`Error building seating data for ${entry.subject.code}:`, seatingError);
            const candidatesPerRoom = 24;
            roomsUsed = Math.ceil(candidateCount / candidatesPerRoom);
          }
        }

        return {
          _id: entry._id,
          class: entry.subject.class,
          subjectCode: entry.subject.code,
          subjectName: entry.subject.name,
          timeSlot: entry.timeSlot,
          duration: entry.subject.duration,
          answerSheetType: entry.answerSheet,
          candidateCount,
          roomsUsed,
          rooms: roomDetails,
          schoolWiseCandidateCount,
          answerSheetDetails,
          hindiMediumCandidateCount
        };
      } catch (error) {
        console.error(`Error processing exam ${entry.subject.code}:`, error);
        return null;
      }
    })
  );

  // Filter out any null results from errors
  const validExams = examsWithDetails.filter(exam => exam !== null);

  // Sort by time slot and then by class
  validExams.sort((a, b) => {
    const timeA = a.timeSlot?.start || '10:30';
    const timeB = b.timeSlot?.start || '10:30';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    // Sort by class (10th before 12th)
    const classA = String(a.class).replace(/th$/i, '');
    const classB = String(b.class).replace(/th$/i, '');
    return parseInt(classA) - parseInt(classB);
  });

  // Calculate totals
  const totalCandidates = validExams.reduce((sum, exam) => sum + exam.candidateCount, 0);

  res.status(HTTP_STATUS.OK).json(
    generateResponse(true, 'Today\'s exams fetched successfully', {
      examDate: today.toISOString().split('T')[0],
      dayName: getDayName(today),
      exams: validExams,
      totalExams: validExams.length,
      totalCandidates,
      packing,
      dutiesAssignedCount
    })
  );
});

// Helper function to get day name
function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

module.exports = {
  getTodaysExams
};
