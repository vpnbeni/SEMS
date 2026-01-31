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
      
      // Get Form 66 records for this exam date and subject
      // Form 66 contains the actual roll numbers for the exam
      const form66Records = await Form66.find({
        examDate: entry.examDate,
        subjectCode: entry.subject.code,
        isActive: true
      }).sort({ rollNo: 1 });

      console.log(`Found ${form66Records.length} Form 66 records for ${entry.subject.code} on ${entry.examDate}`);

      // If no Form 66 records, fall back to candidates
      let candidates = form66Records;
      if (form66Records.length === 0) {
        console.log('No Form 66 records found, falling back to Candidate model');
        
        // Class is stored in entry.subject.class (e.g., '10th' or '12th')
        const classValue = entry.subject.class;
        // Normalize class format just in case (model expects '10th' or '12th')
        const normalizedClass = classValue && classValue.endsWith('th') ? classValue : `${classValue}th`;
        
        // Query using subjectCodes.code since subjects field contains ObjectIds
        candidates = await Candidate.find({
          class: normalizedClass,
          'subjectCodes.code': entry.subject.code,
          status: 'active'
        }).sort({ rollNumber: 1 });
        
        // Map rollNumber to rollNo for consistency with Form66
        candidates = candidates.map(c => ({
          ...c.toObject(),
          rollNo: c.rollNumber
        }));
        
        console.log(`Found ${candidates.length} candidates from Candidate model`);
      }

      // Build room allocations
      const roomAllocations = this.allocateCandidatesToRooms(candidates, rooms);
      
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
