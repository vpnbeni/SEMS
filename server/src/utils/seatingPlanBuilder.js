const Candidate = require('../models/Candidate');
const Room = require('../models/Room');
const CBSEDatesheet = require('../models/CBSEDatesheet');
const { compareRoomNo } = require('./roomSort');

const ACTIVE_CANDIDATE_FILTER = {
  $or: [{ status: 'active' }, { status: { $exists: false } }],
};

class SeatingPlanBuilder {
  constructor() {
    this.schoolName = 'INTERNATIONAL BHARTI SCHOOL, ROHTAK';
    this.schoolAddress = 'Gohana Road, Rohtak';
    this.centreNo = '827403';
    // Caches for optimization (cleared per buildSeatingData call)
    this._candidatesCache = new Map();
    this._normalizedDateCache = new Map();
  }

  /**
   * Clear caches - should be called at the start of each buildSeatingData call
   */
  _clearCaches() {
    this._candidatesCache.clear();
    this._normalizedDateCache.clear();
  }

  resolveCentreIdentity(centreDetails = null) {
    const centreName = String(centreDetails?.centreName || '').trim();
    const centreNo = String(centreDetails?.centreNo || '').trim();
    const hasCentreNameFromDetails = centreName.length > 0;

    return {
      schoolName: centreName || this.schoolName,
      schoolAddress: hasCentreNameFromDetails ? '' : this.schoolAddress,
      centreNo: centreNo || this.centreNo,
    };
  }

  normalizeDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  getManualRoomOrder(room, dateKey) {
    const mapValue = room?.allocationOrderByDate;
    if (!mapValue || !dateKey) return null;

    let orderValue;
    if (mapValue instanceof Map) {
      orderValue = mapValue.get(dateKey);
    } else if (typeof mapValue === 'object') {
      orderValue = mapValue[dateKey];
    }

    const order = Number(orderValue);
    if (!Number.isFinite(order) || order <= 0) return null;
    return order;
  }

  async buildSeatingData(entryId, options = {}) {
    try {
      // Clear caches at the start of each buildSeatingData call
      this._clearCaches();
      const centreIdentity = this.resolveCentreIdentity(options.centreDetails);

      const { Form66 } = require('../models/Form66');
      const AnswerSheet = require('../models/AnswerSheet');

      // Get CBSE datesheet and find the specific entry
      const cbseDatesheet = await CBSEDatesheet.getActive();
      if (!cbseDatesheet) {
        throw new Error('No active CBSE datesheet found');
      }

      // Find the specific entry
      const entry = cbseDatesheet.entries.id(entryId);
      if (!entry) {
        throw new Error('Datesheet entry not found');
      }

      // Get all rooms sorted numerically by room number
      const allRooms = await Room.find({ isActive: true }).lean();
      allRooms.sort(compareRoomNo);

      const allocationMode = options.roomAllocationMode === 'manual' ? 'manual' : 'auto';
      const examDateKey = this.normalizeDateKey(entry.examDate);

      const rooms = allocationMode === 'manual'
        ? allRooms
          .map((room) => ({
            ...room,
            __manualOrder: this.getManualRoomOrder(room, examDateKey),
          }))
          .filter((room) => room.__manualOrder !== null)
          .sort((a, b) => {
            if (a.__manualOrder !== b.__manualOrder) {
              return a.__manualOrder - b.__manualOrder;
            }
            return compareRoomNo(a, b);
          })
          .map(({ __manualOrder, ...room }) => room)
        : allRooms;

      if (rooms.length === 0) {
        if (allocationMode === 'manual') {
          throw new Error('No rooms are allocated for this exam date in Manual mode. Please allocate rooms in Exam Room/Hall first, or switch allocation mode to Auto.');
        }
        throw new Error('No rooms available for allocation');
      }

      // Get candidates for this exam
      const candidates = await this.getCandidatesForExam(entry);

      // Fetch answer sheet allocations for this exam
      const answerSheetAllocations = await this.getAnswerSheetAllocations(entry, cbseDatesheet);

      // Filter entries to only those that have candidates at this centre
      // This ensures rotation is calculated based on actual exams being conducted
      const entriesWithCandidates = await this.filterEntriesWithCandidates(cbseDatesheet.entries);

      console.log(`\n=== SEATING PLAN BUILD ===`);
      console.log(`Total datesheet entries: ${cbseDatesheet.entries.length}`);
      console.log(`Entries with candidates at this centre: ${entriesWithCandidates.length}`);

      // Calculate room allocation with class-based rotation
      const { startRoomIndex, startSeatOffset, allowWrap } = await this.calculateStartingPositionClassBased(
        entry,
        entriesWithCandidates, // Use filtered entries instead of all entries
        null, // scheduleMap no longer used
        rooms,
        candidates.length,
        { manualMode: allocationMode === 'manual' }
      );

      console.log(`Exam ${entry.subject.code} (${entry.subject.class}): Starting from Room ${rooms[startRoomIndex]?.roomNo || 'N/A'}, Seat offset: ${startSeatOffset}`);

      // Build room allocations with the calculated starting position
      const roomAllocations = this.allocateCandidatesToRoomsWithOffset(
        candidates,
        rooms,
        startRoomIndex,
        startSeatOffset,
        answerSheetAllocations,
        allowWrap ?? true
      );

      const allocatedCount = roomAllocations.reduce((sum, room) => sum + Number(room.registered || 0), 0);
      if (allocatedCount < candidates.length) {
        throw new Error('Insufficient rooms for this exam date. Please allocate more rooms in Exam Room/Hall or switch to Auto mode.');
      }

      return {
        datesheet: {
          _id: entry._id,
          date: entry.examDate,
          dayName: entry.dayName,
          subjectCode: entry.subject.code,
          subjectName: entry.subject.name,
          class: entry.subject.class,
          timeSlot: entry.timeSlot
        },
        rooms: roomAllocations,
        totalCandidates: candidates.length,
        answerSheetAllocations,
        centreIdentity,
      };
    } catch (error) {
      console.error('Seating Plan Builder Error:', error);
      throw error;
    }
  }

  /**
   * Filter datesheet entries to only include those that have candidates at this centre
   * This ensures room rotation is calculated based on actual exams being conducted
   * Optimized to fetch candidates in parallel using Promise.all
   */
  async filterEntriesWithCandidates(allEntries) {
    // Fetch all candidates in parallel for better performance
    const candidateResults = await Promise.all(
      allEntries.map(entry => this.getCandidatesForExam(entry))
    );

    // Filter entries that have candidates
    return allEntries.filter((_, index) => candidateResults[index].length > 0);
  }

  /**
   * Get answer sheet allocations for a specific exam
   * Fetches all answer sheets for the exam's class and determines serial number allocation
   */
  async getAnswerSheetAllocations(entry, cbseDatesheet) {
    try {
      const AnswerSheet = require('../models/AnswerSheet');
      const Candidate = require('../models/Candidate');

      // Normalize class for querying
      const normalizedClass = entry.subject.class.includes('th') ? entry.subject.class : `${entry.subject.class}th`;
      const classNumber = normalizedClass.replace(/th$/i, '');

      // Determine expected answer sheet type from entry
      let expectedAnswerSheetType = null;
      let expectedPages = null;
      if (entry.answerSheet === '32_pages') {
        expectedAnswerSheetType = 'Main';
        expectedPages = 32;
      } else if (entry.answerSheet === '20_pages') {
        expectedAnswerSheetType = 'Main';
        expectedPages = 20;
      } else if (entry.answerSheet === '40_graph') {
        expectedAnswerSheetType = 'Graph';
      } else if (entry.answerSheet === 'drawing_sheets') {
        expectedAnswerSheetType = 'Drawing Sheets';
      }

      if (!expectedAnswerSheetType) {
        console.log(`No answer sheet allocation found for ${entry.subject.code}`);
        return null;
      }

      // Find matching answer sheets
      const answerSheetFilter = {
        answerSheetType: expectedAnswerSheetType,
        class: classNumber,
        isActive: true
      };
      if (expectedPages !== null) {
        answerSheetFilter.pages = expectedPages;
      }

      const answerSheets = await AnswerSheet.find({
        ...answerSheetFilter
      }).sort({ sortOrder: 1 });

      if (answerSheets.length === 0) {
        console.log(`No answer sheets found for type ${expectedAnswerSheetType}, class ${classNumber}`);
        return null;
      }

      // Get all candidates to calculate frequencies
      const candidates = await Candidate.find(ACTIVE_CANDIDATE_FILTER)
        .populate('subjects', 'code name class')
        .lean();

      // Calculate candidate count per subject
      const subjectFrequency = new Map();
      candidates.forEach(candidate => {
        if (candidate.subjects && candidate.subjects.length > 0) {
          candidate.subjects.forEach(subject => {
            if (subject && subject.code && subject.class) {
              const key = `${subject.code}-${subject.class}`;
              const count = subjectFrequency.get(key) || 0;
              subjectFrequency.set(key, count + 1);
            }
          });
        }
      });

      // Find related exams that use the same answer sheet type
      const relatedExams = cbseDatesheet.entries
        .filter(e => {
          if (e.subject.class !== normalizedClass) return false;
          if (e.answerSheet !== entry.answerSheet) return false;
          return true;
        })
        .map(e => {
          const key = `${e.subject.code}-${e.subject.class}`;
          const normalizedKey = `${e.subject.code}-${e.subject.class.replace(/th$/i, '')}`;
          const candidateCount = subjectFrequency.get(key) || subjectFrequency.get(normalizedKey) || 0;
          return {
            _id: e._id,
            examDate: e.examDate,
            subjectCode: e.subject.code,
            subjectName: e.subject.name,
            candidateCount
          };
        })
        .filter(e => e.candidateCount > 0)
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

      // For each answer sheet, calculate allocation for this specific exam
      const allocations = [];

      for (const answerSheet of answerSheets) {
        if (!answerSheet.serialFrom || !answerSheet.serialTo) {
          continue;
        }

        const fromNum = parseInt(answerSheet.serialFrom.replace(/\D/g, ''));
        const toNum = parseInt(answerSheet.serialTo.replace(/\D/g, ''));
        const prefix = answerSheet.serialFrom.replace(/\d+$/, '');
        const padLength = answerSheet.serialFrom.replace(/\D/g, '').length;

        // Create set of discarded serials
        const discardedSet = new Set(
          (answerSheet.discardedSerials || []).map(d => parseInt(d.serial.replace(/\D/g, '')))
        );

        // Helper to format serial
        const formatSerial = (num) => prefix + num.toString().padStart(padLength, '0');

        // Helper to get next available serial (skipping discarded)
        const getNextAvailable = (start) => {
          let current = start;
          while (discardedSet.has(current) && current <= toNum) {
            current++;
          }
          return current <= toNum ? current : null;
        };

        let currentSerial = getNextAvailable(fromNum);

        // Allocate serials to each exam
        for (const exam of relatedExams) {
          if (exam._id.toString() === entry._id.toString()) {
            // This is our target exam
            if (currentSerial === null) {
              console.log(`Insufficient sheets for ${entry.subject.code}`);
              break;
            }

            const serialStart = currentSerial;
            let sheetsAssigned = 0;
            let serialEnd = currentSerial;

            // Assign serials one by one, skipping discarded ones
            while (sheetsAssigned < exam.candidateCount && currentSerial !== null && currentSerial <= toNum) {
              if (!discardedSet.has(currentSerial)) {
                serialEnd = currentSerial;
                sheetsAssigned++;
              }
              currentSerial++;
              while (discardedSet.has(currentSerial) && currentSerial <= toNum) {
                currentSerial++;
              }
            }

            if (currentSerial > toNum) {
              currentSerial = null;
            }

            allocations.push({
              answerSheetType: answerSheet.answerSheetType,
              pages: answerSheet.pages,
              colour: answerSheet.colour,
              serialFrom: formatSerial(serialStart),
              serialTo: formatSerial(serialEnd),
              prefix,
              padLength,
              startNum: serialStart,
              endNum: serialEnd,
              sheetsAllocated: sheetsAssigned,
              totalCandidates: exam.candidateCount
            });

            break; // Found allocation for this exam
          } else {
            // Skip past this exam's allocation
            let sheetsAssigned = 0;
            while (sheetsAssigned < exam.candidateCount && currentSerial !== null && currentSerial <= toNum) {
              if (!discardedSet.has(currentSerial)) {
                sheetsAssigned++;
              }
              currentSerial++;
              while (discardedSet.has(currentSerial) && currentSerial <= toNum) {
                currentSerial++;
              }
            }
            if (currentSerial > toNum) {
              currentSerial = null;
            }
          }
        }
      }

      console.log(`Found ${allocations.length} answer sheet allocation(s) for ${entry.subject.code}`);
      return allocations.length > 0 ? allocations : null;
    } catch (error) {
      console.error('Error fetching answer sheet allocations:', error);
      return null;
    }
  }

  async getCandidatesForExam(entry) {
    // Create cache key from entry's unique identifiers
    const cacheKey = `${entry._id.toString()}`;

    // Return cached result if available
    if (this._candidatesCache.has(cacheKey)) {
      return this._candidatesCache.get(cacheKey);
    }

    const { Form66 } = require('../models/Form66');

    // Get Form 66 records for this exam date and subject
    const form66Records = await Form66.find({
      examDate: entry.examDate,
      subjectCode: entry.subject.code,
      isActive: true
    }).sort({ rollNo: 1 });

    console.log(`Found ${form66Records.length} Form 66 records for ${entry.subject.code} on ${entry.examDate}`);

    // If Form 66 records exist, use them (priority)
    if (form66Records.length > 0) {
      this._candidatesCache.set(cacheKey, form66Records);
      return form66Records;
    }

    // Fall back to Candidate model
    console.log('No Form 66 records found, falling back to Candidate model');

    const classValue = entry.subject.class;
    const normalizedClass = classValue && classValue.endsWith('th') ? classValue : `${classValue}th`;

    let candidates = await Candidate.find({
      class: normalizedClass,
      'subjectCodes.code': entry.subject.code,
      status: 'active'
    }).sort({ rollNumber: 1 });

    // Map rollNumber to rollNo for consistency
    candidates = candidates.map(c => ({
      ...c.toObject(),
      rollNo: c.rollNumber
    }));

    console.log(`Found ${candidates.length} candidates from Candidate model`);

    // Cache the result before returning
    this._candidatesCache.set(cacheKey, candidates);
    return candidates;
  }

  /**
   * Normalize date to YYYY-MM-DD string for consistent comparison
   * Memoized to avoid repeated date parsing for the same input
   */
  normalizeDate(date) {
    // Create a string key for caching
    const dateKey = String(date);

    if (this._normalizedDateCache.has(dateKey)) {
      return this._normalizedDateCache.get(dateKey);
    }

    const d = new Date(date);
    const normalized = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    this._normalizedDateCache.set(dateKey, normalized);
    return normalized;
  }

  /**
   * Get class-based day rotation offset
   * Rotation is tracked separately for 10th and 12th class
   * Uses datesheet entries directly (candidates are fetched on-demand)
   */
  async getClassBasedDayRotation(currentEntry, allEntries, totalRooms) {
    const currentClass = currentEntry.subject.class;
    const currentDateNorm = this.normalizeDate(currentEntry.examDate);

    // Filter entries for the same class
    const classEntries = allEntries.filter(e => e.subject.class === currentClass);

    // Get unique dates for this class, sorted chronologically
    const uniqueClassDates = [...new Set(
      classEntries.map(e => this.normalizeDate(e.examDate))
    )].sort();

    // Find the day index for current date within this class
    const dayIndex = uniqueClassDates.indexOf(currentDateNorm);

    // Room rotation offset (wraps around)
    const rotationOffset = dayIndex >= 0 ? dayIndex % totalRooms : 0;

    console.log(`\n=== CLASS-BASED ROTATION DEBUG ===`);
    console.log(`Current exam: ${currentEntry.subject.code} - ${currentEntry.subject.name}`);
    console.log(`Current class: ${currentClass}`);
    console.log(`Current date: ${currentDateNorm}`);
    console.log(`Total ${currentClass} entries in datesheet: ${classEntries.length}`);
    console.log(`Unique ${currentClass} exam dates (${uniqueClassDates.length}): ${uniqueClassDates.join(', ')}`);
    console.log(`Day index for ${currentDateNorm}: ${dayIndex} (Day ${dayIndex + 1})`);
    console.log(`Room rotation offset: ${rotationOffset}`);
    console.log(`Total rooms: ${totalRooms}`);
    console.log(`=================================\n`);

    return rotationOffset;
  }

  /**
   * Calculate starting position with:
   * 1. Continuous room allocation across ALL exams on the same day (regardless of class)
   * 2. Class-based rotation on consecutive exam days (10th and 12th have separate rotation sequences)
   * 
   * Logic:
   * - First exam of the day: Uses that exam's class-based rotation offset as starting room
   * - Subsequent exams on same day: Continue from where previous exam ended (regardless of class)
   *   - If ALL candidates fit in remaining seats of last room → continue in that room
   *   - Otherwise → start from the next room
   */
  async calculateStartingPositionClassBased(currentEntry, allEntries, _scheduleMap, rooms, currentCandidateCount, options = {}) {
    const candidatesPerRoom = 24;
    const totalRooms = rooms.length;
    const currentClass = currentEntry.subject.class;
    const currentDateNorm = this.normalizeDate(currentEntry.examDate);
    const manualMode = Boolean(options?.manualMode);

    // In manual mode, always start day progression from first allocated room.
    // In auto mode, keep class-based day rotation.
    const dayRotationOffset = manualMode
      ? 0
      : await this.getClassBasedDayRotation(currentEntry, allEntries, totalRooms);

    // Find ALL exams on the same day (regardless of class) for continuous room allocation
    const allSameDayExams = allEntries.filter(e => {
      const entryDateNorm = this.normalizeDate(e.examDate);
      return entryDateNorm === currentDateNorm;
    });

    // Sort same-day exams by candidate count (higher first), then class, then subject code.
    // This ensures the class with more students consumes room order first.
    const sameDayWithCounts = await Promise.all(
      allSameDayExams.map(async exam => {
        const count = (await this.getCandidatesForExam(exam)).length;
        return { exam, count };
      })
    );
    sameDayWithCounts.sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count; // higher candidate count first
      const classA = parseInt(String(a.exam.subject.class).replace(/th$/i, ''), 10) || 0;
      const classB = parseInt(String(b.exam.subject.class).replace(/th$/i, ''), 10) || 0;
      if (classA !== classB) return classA - classB;
      return String(a.exam.subject.code || '').localeCompare(String(b.exam.subject.code || ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
    const orderedSameDayExams = sameDayWithCounts.map(item => item.exam);

    // Find position of current exam among ALL exams today
    const currentExamIndex = orderedSameDayExams.findIndex(e =>
      e._id.toString() === currentEntry._id.toString()
    );

    console.log(`Exam ${currentEntry.subject.code} (${currentClass}) is exam #${currentExamIndex + 1} of ${orderedSameDayExams.length} total exams today`);
    console.log(`All same-day exams (in order): ${orderedSameDayExams.map(e => `${e.subject.code}(${e.subject.class})`).join(', ')}`);

    // If this is the FIRST exam of the day (regardless of class), use this exam's class-based rotation
    if (currentExamIndex <= 0) {
      console.log(`First exam of the day (${currentClass}) - starting from Room ${rooms[dayRotationOffset]?.roomNo} (rotation offset: ${dayRotationOffset})`);
      return { startRoomIndex: dayRotationOffset, startSeatOffset: 0, allowWrap: !manualMode };
    }

    // For subsequent exams: simulate room progression exam-by-exam for robust same-day continuity.
    // Get the first exam of the day to determine base rotation offset.
    const firstExamOfDay = orderedSameDayExams[0];
    const firstExamClass = firstExamOfDay.subject.class;
    const baseRotationOffset = manualMode
      ? 0
      : await this.getClassBasedDayRotation(firstExamOfDay, allEntries, totalRooms);

    console.log(`Base rotation offset from first exam (${firstExamClass}): ${baseRotationOffset}`);

    // Fetch candidates for all previous exams in parallel (cache avoids duplicate DB calls).
    const previousExams = orderedSameDayExams.slice(0, currentExamIndex);
    const previousExamCandidates = await Promise.all(
      previousExams.map(async exam => {
        const candidates = await this.getCandidatesForExam(exam);
        console.log(`  Previous exam ${exam.subject.code} (${exam.subject.class}): ${candidates.length} candidates`);
        return candidates;
      })
    );

    let simulatedStartRoomIndex = baseRotationOffset;
    let simulatedStartSeatOffset = 0;

    for (let i = 0; i < previousExams.length; i += 1) {
      const prevCandidates = previousExamCandidates[i];
      if (!prevCandidates || prevCandidates.length === 0) continue;

      const prevAllocations = this.allocateCandidatesToRoomsWithOffset(
        prevCandidates,
        rooms,
        simulatedStartRoomIndex,
        simulatedStartSeatOffset
      );

      const lastAllocation = prevAllocations[prevAllocations.length - 1];
      if (!lastAllocation) continue;

      const lastRoomIndex = Number(lastAllocation.roomIndex || 0);
      const seatsUsedInLastRoom = prevAllocations.length === 1
        ? Number(lastAllocation.seatOffset || 0) + Number(lastAllocation.registered || 0)
        : Number(lastAllocation.registered || 0);
      const remainingSeatsInLastRoom = candidatesPerRoom - seatsUsedInLastRoom;

      const nextExamCandidateCount = i === previousExams.length - 1
        ? currentCandidateCount
        : previousExamCandidates[i + 1].length;

      if (seatsUsedInLastRoom > 0 && nextExamCandidateCount <= remainingSeatsInLastRoom) {
        simulatedStartRoomIndex = lastRoomIndex;
        simulatedStartSeatOffset = seatsUsedInLastRoom;
      } else {
        simulatedStartRoomIndex = lastRoomIndex + 1;
        simulatedStartSeatOffset = 0;
      }
    }

    if (simulatedStartRoomIndex >= totalRooms) {
      throw new Error('No next room available for same-day class progression. Please allocate additional rooms for this date.');
    }

    console.log(
      `Simulated same-day start for ${currentEntry.subject.code}: Room ${rooms[simulatedStartRoomIndex]?.roomNo}, seat offset ${simulatedStartSeatOffset}`
    );
    return {
      startRoomIndex: simulatedStartRoomIndex,
      startSeatOffset: simulatedStartSeatOffset,
      allowWrap: false,
    };
  }

  allocateCandidatesToRoomsWithOffset(candidates, rooms, startRoomIndex, startSeatOffset, answerSheetAllocations = null, allowWrap = true) {
    const allocations = [];
    const candidatesPerRoom = 24;
    const totalRooms = rooms.length;
    let candidateIndex = 0;
    let isFirstRoom = true;
    let roomsProcessed = 0;

    // Loop through rooms with optional wrap-around support.
    while (candidateIndex < candidates.length) {
      if (allowWrap && roomsProcessed >= totalRooms) break;
      const roomIdx = allowWrap
        ? (startRoomIndex + roomsProcessed) % totalRooms
        : (startRoomIndex + roomsProcessed);
      if (!allowWrap && roomIdx >= totalRooms) break;

      const room = rooms[roomIdx];
      let seatsAvailable = candidatesPerRoom;
      let seatOffset = 0;

      // For the first room, account for the offset (seats already used)
      if (isFirstRoom && startSeatOffset > 0) {
        seatsAvailable = candidatesPerRoom - startSeatOffset;
        seatOffset = startSeatOffset;
        isFirstRoom = false;
      } else {
        isFirstRoom = false;
      }

      const roomCandidates = candidates.slice(
        candidateIndex,
        candidateIndex + seatsAvailable
      );

      if (roomCandidates.length === 0) break;

      // Build rows with offset consideration and answer sheet allocations
      const rows = this.buildRowsWithOffset(roomCandidates, seatOffset, candidateIndex, answerSheetAllocations);

      allocations.push({
        roomIndex: roomIdx,
        roomNo: this.formatRoomNoDisplay(room.roomNo),
        roomName: room.roomName || '',
        floor: room.floor || 'First Floor',
        candidates: roomCandidates,
        rows: rows,
        registered: roomCandidates.length,
        seatOffset: seatOffset // Include offset info for reference
      });

      candidateIndex += roomCandidates.length;
      roomsProcessed++;
    }

    return allocations;
  }

  buildRowsWithOffset(candidates, seatOffset = 0, globalCandidateStartIndex = 0, answerSheetAllocations = null) {
    // For CBSE Copy format, we still show 8 rows x 3 columns
    // But the candidates are placed starting from the offset position
    const rows = [];
    const totalSeats = 24;

    // Create a full seat array with empty slots
    const seats = new Array(totalSeats).fill(null);

    // Place candidates starting from the offset
    for (let i = 0; i < candidates.length; i++) {
      seats[seatOffset + i] = candidates[i];
    }

    // Build rows from the seats array
    for (let i = 0; i < 8; i++) {
      const row = {
        col1: '\u00a0',
        col2: '\u00a0',
        col3: '\u00a0',
        row1RollNo: '',
        row2RollNo: '',
        row3RollNo: '',
        row1QpCode: '',
        row2QpCode: '',
        row3QpCode: '',
        row1SheetNo: '',
        row2SheetNo: '',
        row3SheetNo: ''
      };

      // Column 1 (seats 0-7)
      const seat1 = seats[i];
      const seat1GlobalIndex = i >= seatOffset && i < seatOffset + candidates.length
        ? globalCandidateStartIndex + (i - seatOffset)
        : -1;
      if (seat1) {
        row.col1 = seat1.rollNo;
        row.row1RollNo = seat1.rollNo;
        row.row1QpCode = this.getQPCodeBySequenceIndex(i - seatOffset);
        row.row1SheetNo = this.getSheetNo(seat1, seat1GlobalIndex, answerSheetAllocations);
      }

      // Column 2 (seats 8-15)
      const seat2 = seats[i + 8];
      const seat2GlobalIndex = (i + 8) >= seatOffset && (i + 8) < seatOffset + candidates.length
        ? globalCandidateStartIndex + ((i + 8) - seatOffset)
        : -1;
      if (seat2) {
        row.col2 = seat2.rollNo;
        row.row2RollNo = seat2.rollNo;
        row.row2QpCode = this.getQPCodeBySequenceIndex((i + 8) - seatOffset);
        row.row2SheetNo = this.getSheetNo(seat2, seat2GlobalIndex, answerSheetAllocations);
      }

      // Column 3 (seats 16-23)
      const seat3 = seats[i + 16];
      const seat3GlobalIndex = (i + 16) >= seatOffset && (i + 16) < seatOffset + candidates.length
        ? globalCandidateStartIndex + ((i + 16) - seatOffset)
        : -1;
      if (seat3) {
        row.col3 = seat3.rollNo;
        row.row3RollNo = seat3.rollNo;
        row.row3QpCode = this.getQPCodeBySequenceIndex((i + 16) - seatOffset);
        row.row3SheetNo = this.getSheetNo(seat3, seat3GlobalIndex, answerSheetAllocations);
      }

      rows.push(row);
    }

    return rows;
  }

  allocateCandidatesToRooms(candidates, rooms, answerSheetAllocations = null) {
    const allocations = [];
    const candidatesPerRoom = 24;
    let candidateIndex = 0;

    for (const room of rooms) {
      if (candidateIndex >= candidates.length) break;

      const roomCandidates = candidates.slice(
        candidateIndex,
        candidateIndex + candidatesPerRoom
      );

      if (roomCandidates.length === 0) break;

      const rows = this.buildRows(roomCandidates, candidateIndex, answerSheetAllocations);

      allocations.push({
        roomNo: this.formatRoomNoDisplay(room.roomNo),
        roomName: room.roomName || '',
        floor: room.floor || 'First Floor',
        candidates: roomCandidates,
        rows: rows,
        registered: roomCandidates.length
      });

      candidateIndex += candidatesPerRoom;
    }

    return allocations;
  }

  buildRows(candidates, globalCandidateStartIndex = 0, answerSheetAllocations = null) {
    const rows = [];
    const candidatesPerRow = 3;

    for (let i = 0; i < 8; i++) {
      const row = {
        col1: '',
        col2: '',
        col3: '',
        row1RollNo: '',
        row2RollNo: '',
        row3RollNo: '',
        row1QpCode: '',
        row2QpCode: '',
        row3QpCode: '',
        row1SheetNo: '',
        row2SheetNo: '',
        row3SheetNo: ''
      };

      // Column 1
      const idx1 = i;
      if (candidates[idx1]) {
        row.col1 = candidates[idx1].rollNo;
        row.row1RollNo = candidates[idx1].rollNo;
        row.row1QpCode = this.getQPCodeBySequenceIndex(idx1);
        row.row1SheetNo = this.getSheetNo(candidates[idx1], globalCandidateStartIndex + idx1, answerSheetAllocations);
      }

      // Column 2
      const idx2 = i + 8;
      if (candidates[idx2]) {
        row.col2 = candidates[idx2].rollNo;
        row.row2RollNo = candidates[idx2].rollNo;
        row.row2QpCode = this.getQPCodeBySequenceIndex(idx2);
        row.row2SheetNo = this.getSheetNo(candidates[idx2], globalCandidateStartIndex + idx2, answerSheetAllocations);
      }

      // Column 3
      const idx3 = i + 16;
      if (candidates[idx3]) {
        row.col3 = candidates[idx3].rollNo;
        row.row3RollNo = candidates[idx3].rollNo;
        row.row3QpCode = this.getQPCodeBySequenceIndex(idx3);
        row.row3SheetNo = this.getSheetNo(candidates[idx3], globalCandidateStartIndex + idx3, answerSheetAllocations);
      }

      rows.push(row);
    }

    return rows;
  }

  getQPCodeBySequenceIndex(sequenceIndex) {
    const qpCodes = ['1', '2', '3'];
    const normalizedIndex = Number.isInteger(sequenceIndex) && sequenceIndex >= 0
      ? sequenceIndex
      : 0;
    return qpCodes[normalizedIndex % qpCodes.length];
  }

  getSheetNo(candidate, globalIndex, answerSheetAllocations = null) {
    // If no allocations or invalid index, return empty
    if (!answerSheetAllocations || globalIndex < 0) {
      return '';
    }

    // Find the appropriate answer sheet allocation for this candidate
    // Candidates are allocated sequentially across all answer sheet types
    let cumulativeCandidates = 0;

    for (const allocation of answerSheetAllocations) {
      const allocationEnd = cumulativeCandidates + allocation.sheetsAllocated;

      if (globalIndex < allocationEnd) {
        // This candidate falls within this allocation
        const positionInAllocation = globalIndex - cumulativeCandidates;
        const serialNumber = allocation.startNum + positionInAllocation;

        // Format the serial number with prefix and padding
        const formattedSerial = allocation.prefix + serialNumber.toString().padStart(allocation.padLength, '0');
        return formattedSerial;
      }

      cumulativeCandidates = allocationEnd;
    }

    // If we get here, the candidate is beyond allocated sheets
    console.warn(`No sheet allocation found for candidate at index ${globalIndex}`);
    return '';
  }

  formatDate(date, includeDay = true) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (includeDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[d.getDay()];
      return `${day}.${month}.${year} (${dayName})`;
    }

    return `${day}.${month}.${year}`;
  }

  getExamName(classValue) {
    // Class 10 = Secondary School Certificate Examination
    // Class 12 = Sr. Secondary School Certificate Examination
    const normalizedClass = String(classValue).replace(/th$/i, '');
    if (normalizedClass === '10') {
      return 'Secondary School Certificate Examination';
    }
    return 'Sr. Secondary School Certificate Examination';
  }

  getExamYear(date) {
    const d = new Date(date);
    return d.getFullYear().toString();
  }

  /**
   * Convert class number to Roman numeral format
   * 10 -> X, 12 -> XII
   */
  getClassRoman(classValue) {
    const normalizedClass = String(classValue).replace(/th$/i, '');
    if (normalizedClass === '10') {
      return 'X';
    } else if (normalizedClass === '12') {
      return 'XII';
    }
    return classValue;
  }

  formatRoomNoDisplay(roomNo) {
    const value = String(roomNo ?? '').trim();
    if (!value) return value;

    // Keep non-numeric room identifiers unchanged (e.g. A1, Lab-2).
    if (!/^\d+$/.test(value)) return value;

    return value.padStart(2, '0');
  }

  buildMainGateData(seatingData) {
    const { datesheet, rooms, centreIdentity } = seatingData;
    const identity = centreIdentity || this.resolveCentreIdentity();

    return {
      schoolName: identity.schoolName,
      centreNo: identity.centreNo,
      examDate: this.formatDate(datesheet.date, true),
      subjectName: datesheet.subjectName,
      className: this.getClassRoman(datesheet.class),
      subjectCode: datesheet.subjectCode,
      rooms: rooms.map(room => ({
        roomNo: room.roomNo,
        roomName: room.roomName,
        floor: room.floor,
        rows: room.rows
      }))
    };
  }

  buildRoomFolderSlipData(seatingData) {
    const { datesheet, rooms, centreIdentity } = seatingData;
    const identity = centreIdentity || this.resolveCentreIdentity();
    const slips = [];
    const examName = this.getExamName(datesheet.class);
    const examYear = this.getExamYear(datesheet.date);

    for (let i = 0; i < rooms.length; i += 2) {
      const slip1 = rooms[i];
      const slip2 = rooms[i + 1];

      if (slip1) {
        slips.push({
          schoolName: identity.schoolName,
          schoolAddress: identity.schoolAddress,
          centreNo: identity.centreNo,
          className: this.getClassRoman(datesheet.class),
          examName: examName,
          examYear: examYear,
          subjectCode: datesheet.subjectCode,
          subjectName: datesheet.subjectName,
          examDate: this.formatDate(datesheet.date, true),
          roomNo: slip1.roomNo,
          roomName: slip1.roomName,
          rows: slip1.rows,
          registered: slip1.registered
        });
      }

      if (slip2) {
        slips.push({
          schoolName: identity.schoolName,
          schoolAddress: identity.schoolAddress,
          centreNo: identity.centreNo,
          className: this.getClassRoman(datesheet.class),
          examName: examName,
          examYear: examYear,
          subjectCode: datesheet.subjectCode,
          subjectName: datesheet.subjectName,
          examDate: this.formatDate(datesheet.date, true),
          roomNo: slip2.roomNo,
          roomName: slip2.roomName,
          rows: slip2.rows,
          registered: slip2.registered
        });
      }
    }

    return { slips };
  }

  buildRoomDoorSlipData(seatingData) {
    const { datesheet, rooms, centreIdentity } = seatingData;
    const identity = centreIdentity || this.resolveCentreIdentity();
    const slips = [];
    const examName = this.getExamName(datesheet.class);
    const examYear = this.getExamYear(datesheet.date);

    for (let i = 0; i < rooms.length; i += 2) {
      const slip1 = rooms[i];
      const slip2 = rooms[i + 1];

      if (slip1) {
        slips.push({
          schoolName: identity.schoolName,
          schoolAddress: identity.schoolAddress,
          centreNo: identity.centreNo,
          className: this.getClassRoman(datesheet.class),
          examName: examName,
          examYear: examYear,
          subjectCode: datesheet.subjectCode,
          subjectName: datesheet.subjectName,
          examDate: this.formatDate(datesheet.date, true),
          roomNo: slip1.roomNo,
          roomName: slip1.roomName,
          rows: slip1.rows
        });
      }

      if (slip2) {
        slips.push({
          schoolName: identity.schoolName,
          schoolAddress: identity.schoolAddress,
          centreNo: identity.centreNo,
          className: this.getClassRoman(datesheet.class),
          examName: examName,
          examYear: examYear,
          subjectCode: datesheet.subjectCode,
          subjectName: datesheet.subjectName,
          examDate: this.formatDate(datesheet.date, true),
          roomNo: slip2.roomNo,
          roomName: slip2.roomName,
          rows: slip2.rows
        });
      }
    }

    return { slips };
  }

  buildCBSECopyData(seatingData) {
    const { datesheet, rooms, centreIdentity } = seatingData;
    const identity = centreIdentity || this.resolveCentreIdentity();
    const examName = this.getExamName(datesheet.class);
    const examYear = this.getExamYear(datesheet.date);

    return {
      rooms: rooms.map((room, index) => ({
        schoolName: identity.schoolName,
        schoolAddress: identity.schoolAddress,
        centreNo: identity.centreNo,
        examName: examName,
        examYear: `${examYear}`,
        subjectCode: datesheet.subjectCode,
        subjectName: datesheet.subjectName.toUpperCase(),
        examDate: this.formatDate(datesheet.date, false),
        roomNo: room.roomNo,
        rows: room.rows,
        registered: room.registered,
        registeredDisplay: String(room.registered ?? 0).padStart(2, '0'),
        last: index === rooms.length - 1
      }))
    };
  }
}

module.exports = new SeatingPlanBuilder();
