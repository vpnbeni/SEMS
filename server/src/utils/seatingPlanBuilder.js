const Candidate = require('../models/Candidate');
const Room = require('../models/Room');
const CBSEDatesheet = require('../models/CBSEDatesheet');

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

  async buildSeatingData(entryId) {
    try {
      // Clear caches at the start of each buildSeatingData call
      this._clearCaches();

      const Form66 = require('../models/Form66');
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

      // Get all rooms
      const rooms = await Room.find({ isActive: true }).sort({ roomNo: 1 });

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
      const { startRoomIndex, startSeatOffset } = await this.calculateStartingPositionClassBased(
        entry,
        entriesWithCandidates, // Use filtered entries instead of all entries
        null, // scheduleMap no longer used
        rooms,
        candidates.length
      );

      console.log(`Exam ${entry.subject.code} (${entry.subject.class}): Starting from Room ${rooms[startRoomIndex]?.roomNo || 'N/A'}, Seat offset: ${startSeatOffset}`);

      // Build room allocations with the calculated starting position
      const roomAllocations = this.allocateCandidatesToRoomsWithOffset(
        candidates,
        rooms,
        startRoomIndex,
        startSeatOffset,
        answerSheetAllocations
      );

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
        answerSheetAllocations
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
      if (entry.answerSheet === '32_pages') {
        expectedAnswerSheetType = 'Main';
      } else if (entry.answerSheet === '20_pages') {
        expectedAnswerSheetType = 'Main';
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
      const answerSheets = await AnswerSheet.find({
        answerSheetType: expectedAnswerSheetType,
        class: classNumber,
        isActive: true
      }).sort({ sortOrder: 1 });

      if (answerSheets.length === 0) {
        console.log(`No answer sheets found for type ${expectedAnswerSheetType}, class ${classNumber}`);
        return null;
      }

      // Get all candidates to calculate frequencies
      const candidates = await Candidate.find({ isActive: true })
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

    const Form66 = require('../models/Form66');

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
  async calculateStartingPositionClassBased(currentEntry, allEntries, _scheduleMap, rooms, currentCandidateCount) {
    const candidatesPerRoom = 24;
    const totalRooms = rooms.length;
    const currentClass = currentEntry.subject.class;
    const currentDateNorm = this.normalizeDate(currentEntry.examDate);

    // Get class-based room rotation offset (used for first exam of the day)
    const dayRotationOffset = await this.getClassBasedDayRotation(currentEntry, allEntries, totalRooms);

    // Find ALL exams on the same day (regardless of class) for continuous room allocation
    const allSameDayExams = allEntries.filter(e => {
      const entryDateNorm = this.normalizeDate(e.examDate);
      return entryDateNorm === currentDateNorm;
    });

    // Sort by time slot (start time), then by class (10th before 12th), then by subject code
    allSameDayExams.sort((a, b) => {
      const timeA = a.timeSlot?.start || '10:30';
      const timeB = b.timeSlot?.start || '10:30';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      // If same time slot, sort by class (10th before 12th for consistency)
      const classA = String(a.subject.class).replace(/th$/i, '');
      const classB = String(b.subject.class).replace(/th$/i, '');
      if (classA !== classB) return parseInt(classA) - parseInt(classB);
      return a.subject.code.localeCompare(b.subject.code);
    });

    // Find position of current exam among ALL exams today
    const currentExamIndex = allSameDayExams.findIndex(e =>
      e._id.toString() === currentEntry._id.toString()
    );

    console.log(`Exam ${currentEntry.subject.code} (${currentClass}) is exam #${currentExamIndex + 1} of ${allSameDayExams.length} total exams today`);
    console.log(`All same-day exams (in order): ${allSameDayExams.map(e => `${e.subject.code}(${e.subject.class})`).join(', ')}`);

    // If this is the FIRST exam of the day (regardless of class), use this exam's class-based rotation
    if (currentExamIndex <= 0) {
      console.log(`First exam of the day (${currentClass}) - starting from Room ${rooms[dayRotationOffset]?.roomNo} (rotation offset: ${dayRotationOffset})`);
      return { startRoomIndex: dayRotationOffset, startSeatOffset: 0 };
    }

    // For subsequent exams: calculate total candidates from ALL previous exams today
    // Get the first exam of the day to determine base rotation offset
    const firstExamOfDay = allSameDayExams[0];
    const firstExamClass = firstExamOfDay.subject.class;
    const baseRotationOffset = await this.getClassBasedDayRotation(firstExamOfDay, allEntries, totalRooms);

    console.log(`Base rotation offset from first exam (${firstExamClass}): ${baseRotationOffset}`);

    // Fetch candidates for all previous exams in parallel (caching ensures no duplicate DB calls)
    const previousExams = allSameDayExams.slice(0, currentExamIndex);
    const prevCandidateCounts = await Promise.all(
      previousExams.map(async exam => {
        const candidates = await this.getCandidatesForExam(exam);
        console.log(`  Previous exam ${exam.subject.code} (${exam.subject.class}): ${candidates.length} candidates`);
        return candidates.length;
      })
    );
    const totalPreviousCandidates = prevCandidateCounts.reduce((sum, count) => sum + count, 0);

    console.log(`Total candidates from previous exams today: ${totalPreviousCandidates}`);

    // Calculate room and seat position after all previous exams
    const fullRoomsUsed = Math.floor(totalPreviousCandidates / candidatesPerRoom);
    const seatsUsedInLastRoom = totalPreviousCandidates % candidatesPerRoom;
    const remainingSeatsInLastRoom = candidatesPerRoom - seatsUsedInLastRoom;

    // Calculate actual room index using the base rotation offset (from first exam of the day)
    const lastUsedRoomIndex = (baseRotationOffset + fullRoomsUsed) % totalRooms;

    console.log(`Full rooms used: ${fullRoomsUsed}, Seats in last room: ${seatsUsedInLastRoom}, Remaining: ${remainingSeatsInLastRoom}`);
    console.log(`Current exam needs ${currentCandidateCount} seats`);

    // Decision: Can ALL current exam candidates fit in remaining seats of the last room?
    if (seatsUsedInLastRoom > 0 && currentCandidateCount <= remainingSeatsInLastRoom) {
      console.log(`Continuing in Room ${rooms[lastUsedRoomIndex]?.roomNo} with seat offset ${seatsUsedInLastRoom}`);
      return {
        startRoomIndex: lastUsedRoomIndex,
        startSeatOffset: seatsUsedInLastRoom
      };
    } else {
      // Start from the next room
      const nextRoomIndex = seatsUsedInLastRoom > 0
        ? (lastUsedRoomIndex + 1) % totalRooms
        : lastUsedRoomIndex;
      console.log(`Starting fresh from Room ${rooms[nextRoomIndex]?.roomNo} (cannot fit ${currentCandidateCount} in remaining ${remainingSeatsInLastRoom} seats)`);
      return {
        startRoomIndex: nextRoomIndex,
        startSeatOffset: 0
      };
    }
  }

  allocateCandidatesToRoomsWithOffset(candidates, rooms, startRoomIndex, startSeatOffset, answerSheetAllocations = null) {
    const allocations = [];
    const candidatesPerRoom = 24;
    const totalRooms = rooms.length;
    let candidateIndex = 0;
    let isFirstRoom = true;
    let roomsProcessed = 0;

    // Loop through rooms with wrap-around support
    // Start from startRoomIndex and wrap around if needed
    while (candidateIndex < candidates.length && roomsProcessed < totalRooms) {
      const roomIdx = (startRoomIndex + roomsProcessed) % totalRooms;
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
        roomNo: room.roomNo,
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
        row.row1QpCode = this.getQPCode(seat1);
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
        row.row2QpCode = this.getQPCode(seat2);
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
        row.row3QpCode = this.getQPCode(seat3);
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
        roomNo: room.roomNo,
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
        row.row1QpCode = this.getQPCode(candidates[idx1]);
        row.row1SheetNo = this.getSheetNo(candidates[idx1], globalCandidateStartIndex + idx1, answerSheetAllocations);
      }

      // Column 2
      const idx2 = i + 8;
      if (candidates[idx2]) {
        row.col2 = candidates[idx2].rollNo;
        row.row2RollNo = candidates[idx2].rollNo;
        row.row2QpCode = this.getQPCode(candidates[idx2]);
        row.row2SheetNo = this.getSheetNo(candidates[idx2], globalCandidateStartIndex + idx2, answerSheetAllocations);
      }

      // Column 3
      const idx3 = i + 16;
      if (candidates[idx3]) {
        row.col3 = candidates[idx3].rollNo;
        row.row3RollNo = candidates[idx3].rollNo;
        row.row3QpCode = this.getQPCode(candidates[idx3]);
        row.row3SheetNo = this.getSheetNo(candidates[idx3], globalCandidateStartIndex + idx3, answerSheetAllocations);
      }

      rows.push(row);
    }

    return rows;
  }

  getQPCode(candidate) {
    // QP Code logic - can be enhanced based on subject/medium
    const qpCodes = ['1', '2', '3'];
    return qpCodes[Math.floor(Math.random() * qpCodes.length)];
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

  buildMainGateData(seatingData) {
    const { datesheet, rooms } = seatingData;

    return {
      schoolName: this.schoolName,
      centreNo: this.centreNo,
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
    const { datesheet, rooms } = seatingData;
    const slips = [];
    const examName = this.getExamName(datesheet.class);
    const examYear = this.getExamYear(datesheet.date);

    for (let i = 0; i < rooms.length; i += 2) {
      const slip1 = rooms[i];
      const slip2 = rooms[i + 1];

      if (slip1) {
        slips.push({
          schoolName: this.schoolName,
          schoolAddress: this.schoolAddress,
          centreNo: this.centreNo,
          className: datesheet.class,
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
          schoolName: this.schoolName,
          schoolAddress: this.schoolAddress,
          centreNo: this.centreNo,
          className: datesheet.class,
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
    const { datesheet, rooms } = seatingData;
    const slips = [];
    const examName = this.getExamName(datesheet.class);
    const examYear = this.getExamYear(datesheet.date);

    for (let i = 0; i < rooms.length; i += 2) {
      const slip1 = rooms[i];
      const slip2 = rooms[i + 1];

      if (slip1) {
        slips.push({
          schoolName: this.schoolName,
          schoolAddress: this.schoolAddress,
          centreNo: this.centreNo,
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
          schoolName: this.schoolName,
          schoolAddress: this.schoolAddress,
          centreNo: this.centreNo,
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
    const { datesheet, rooms } = seatingData;
    const examName = this.getExamName(datesheet.class);
    const examYear = this.getExamYear(datesheet.date);

    return {
      rooms: rooms.map((room, index) => ({
        schoolName: this.schoolName,
        schoolAddress: this.schoolAddress,
        centreNo: this.centreNo,
        examName: examName,
        examYear: `${examYear}`,
        subjectName: datesheet.subjectName.toUpperCase(),
        examDate: this.formatDate(datesheet.date, false),
        roomNo: room.roomNo,
        rows: room.rows,
        registered: room.registered,
        last: index === rooms.length - 1
      }))
    };
  }
}

module.exports = new SeatingPlanBuilder();
