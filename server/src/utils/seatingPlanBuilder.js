const Candidate = require('../models/Candidate');
const Room = require('../models/Room');
const CBSEDatesheet = require('../models/CBSEDatesheet');

class SeatingPlanBuilder {
  constructor() {
    this.schoolName = 'INTERNATIONAL BHARTI SCHOOL, ROHTAK';
    this.schoolAddress = 'Gohana Road, Rohtak';
    this.centreNo = '827403';
  }

  async buildSeatingData(entryId) {
    try {
      const Form66 = require('../models/Form66');
      
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
        startSeatOffset
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
        totalCandidates: candidates.length
      };
    } catch (error) {
      console.error('Seating Plan Builder Error:', error);
      throw error;
    }
  }

  /**
   * Filter datesheet entries to only include those that have candidates at this centre
   * This ensures room rotation is calculated based on actual exams being conducted
   */
  async filterEntriesWithCandidates(allEntries) {
    const entriesWithCandidates = [];
    
    for (const entry of allEntries) {
      const candidates = await this.getCandidatesForExam(entry);
      if (candidates.length > 0) {
        entriesWithCandidates.push(entry);
      }
    }
    
    return entriesWithCandidates;
  }

  async getCandidatesForExam(entry) {
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
    return candidates;
  }

  /**
   * Normalize date to YYYY-MM-DD string for consistent comparison
   */
  normalizeDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      const timeA = a.timeSlot?.start || '09:00';
      const timeB = b.timeSlot?.start || '09:00';
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

    let totalPreviousCandidates = 0;
    for (let i = 0; i < currentExamIndex; i++) {
      const prevExam = allSameDayExams[i];
      const prevCandidates = await this.getCandidatesForExam(prevExam);
      totalPreviousCandidates += prevCandidates.length;
      console.log(`  Previous exam ${prevExam.subject.code} (${prevExam.subject.class}): ${prevCandidates.length} candidates`);
    }

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

  allocateCandidatesToRoomsWithOffset(candidates, rooms, startRoomIndex, startSeatOffset) {
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

      // Build rows with offset consideration
      const rows = this.buildRowsWithOffset(roomCandidates, seatOffset);
      
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

  buildRowsWithOffset(candidates, seatOffset = 0) {
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

      // Column 1 (seats 0-7)
      const seat1 = seats[i];
      if (seat1) {
        row.col1 = seat1.rollNo;
        row.row1RollNo = seat1.rollNo;
        row.row1QpCode = this.getQPCode(seat1);
        row.row1SheetNo = this.getSheetNo(seat1, i);
      }

      // Column 2 (seats 8-15)
      const seat2 = seats[i + 8];
      if (seat2) {
        row.col2 = seat2.rollNo;
        row.row2RollNo = seat2.rollNo;
        row.row2QpCode = this.getQPCode(seat2);
        row.row2SheetNo = this.getSheetNo(seat2, i + 8);
      }

      // Column 3 (seats 16-23)
      const seat3 = seats[i + 16];
      if (seat3) {
        row.col3 = seat3.rollNo;
        row.row3RollNo = seat3.rollNo;
        row.row3QpCode = this.getQPCode(seat3);
        row.row3SheetNo = this.getSheetNo(seat3, i + 16);
      }

      rows.push(row);
    }

    return rows;
  }

  allocateCandidatesToRooms(candidates, rooms) {
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

      const rows = this.buildRows(roomCandidates);
      
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

  buildRows(candidates) {
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
        row.row1SheetNo = this.getSheetNo(candidates[idx1], idx1);
      }

      // Column 2
      const idx2 = i + 8;
      if (candidates[idx2]) {
        row.col2 = candidates[idx2].rollNo;
        row.row2RollNo = candidates[idx2].rollNo;
        row.row2QpCode = this.getQPCode(candidates[idx2]);
        row.row2SheetNo = this.getSheetNo(candidates[idx2], idx2);
      }

      // Column 3
      const idx3 = i + 16;
      if (candidates[idx3]) {
        row.col3 = candidates[idx3].rollNo;
        row.row3RollNo = candidates[idx3].rollNo;
        row.row3QpCode = this.getQPCode(candidates[idx3]);
        row.row3SheetNo = this.getSheetNo(candidates[idx3], idx3);
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

  getSheetNo(candidate, index) {
    // Generate sheet number based on some logic
    const baseSheetNo = 626100;
    return (baseSheetNo + index + 1).toString();
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

  buildMainGateData(seatingData) {
    const { datesheet, rooms } = seatingData;
    
    return {
      schoolName: this.schoolName,
      centreNo: this.centreNo,
      examDate: this.formatDate(datesheet.date, true),
      subjectName: datesheet.subjectName,
      className: datesheet.class,
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
          className: datesheet.class,
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
          className: datesheet.class,
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
