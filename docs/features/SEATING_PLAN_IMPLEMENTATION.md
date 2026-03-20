# Seating Plan Implementation Guide

## Overview
This document outlines the complete implementation of the seating plan feature for the examination management system.

## Phase 1: Database Models

### SeatingPlan Model
```javascript
{
  examDate: Date,
  dayName: String,
  subjectCode: String,
  subjectName: String,
  class: String,
  totalCandidates: Number,
  roomsAllocated: Number,
  startingRoom: String, // For rotation tracking
  rooms: [
    {
      roomNo: String,
      floor: String,
      capacity: Number,
      candidatesAssigned: Number,
      seats: [
        {
          seatNumber: Number, // 1-24
          rollNumber: String,
          candidateName: String,
          candidateId: ObjectId
        }
      ]
    }
  ],
  generatedAt: Date,
  generatedBy: ObjectId,
  status: 'draft' | 'published',
  publishedAt: Date
}
```

### RoomAllocation Model (Enhanced)
```javascript
{
  roomNo: String,
  class: String,
  floor: String,
  capacity: { type: Number, default: 24 },
  isActive: Boolean,
  lastUsedDate: Date,
  allocationHistory: [
    {
      examDate: Date,
      subjectCode: String,
      candidateCount: Number
    }
  ]
}
```

## Phase 2: Backend API Endpoints

### 1. Generate Seating Plan
```
POST /api/seating-plan/generate
Body: {
  examDate: "2026-02-17",
  subjectCode: "041",
  class: "10"
}
Response: {
  success: true,
  data: {
    seatingPlan: {...},
    roomsUsed: 5,
    candidatesAllocated: 120
  }
}
```

### 2. Get Seating Plan
```
GET /api/seating-plan/:examDate/:subjectCode/:class
Response: {
  success: true,
  data: seatingPlan
}
```

### 3. Get All Seating Plans
```
GET /api/seating-plan
Query: ?examDate=2026-02-17&class=10
Response: {
  success: true,
  data: [seatingPlans],
  count: 10
}
```

### 4. Publish Seating Plan
```
POST /api/seating-plan/:id/publish
Response: {
  success: true,
  message: "Seating plan published"
}
```

### 5. Export Seating Plan
```
GET /api/seating-plan/:id/export/:format
Formats: notice-board, room-folder, room-door, cbse-copy
Response: PDF/Excel file
```

## Phase 3: Seating Allocation Algorithm

### Core Algorithm Steps

1. **Fetch Candidates**
   - Get all candidates for the specific exam date, subject, and class
   - Filter only active candidates
   - Sort by roll number

2. **Calculate Room Requirements**
   - Total candidates ÷ 24 = rooms needed (rounded up)
   - Example: 50 candidates = 3 rooms

3. **Determine Starting Room (Rotation)**
   - Check last used room from previous exam day
   - Find next available room in sequence
   - Implement circular rotation

4. **Allocate Rooms**
   - Select required number of rooms starting from rotation point
   - Mark rooms as allocated for that date

5. **Distribute Candidates**
   - Fill rooms sequentially with 24 candidates each
   - Assign seat numbers 1-24 in each room
   - Last room gets remaining candidates

6. **Generate Seating Plan Document**
   - Create seating plan record in database
   - Store room-wise allocation
   - Store seat-wise candidate mapping

### Pseudo-code
```javascript
async function generateSeatingPlan(examDate, subjectCode, classLevel) {
  // 1. Fetch candidates
  const candidates = await Candidate.find({
    class: classLevel,
    subjects: { $in: [subjectCode] },
    isActive: true
  }).sort({ rollNumber: 1 })
  
  // 2. Calculate rooms needed
  const roomsNeeded = Math.ceil(candidates.length / 24)
  
  // 3. Get starting room (rotation)
  const lastUsedRoom = await getLastUsedRoom(examDate)
  const availableRooms = await Room.find({ 
    class: classLevel, 
    isActive: true 
  }).sort({ roomNo: 1 })
  
  const startingIndex = findNextRoomIndex(lastUsedRoom, availableRooms)
  
  // 4. Allocate rooms
  const allocatedRooms = []
  for (let i = 0; i < roomsNeeded; i++) {
    const roomIndex = (startingIndex + i) % availableRooms.length
    allocatedRooms.push(availableRooms[roomIndex])
  }
  
  // 5. Distribute candidates
  const seatingPlan = {
    examDate,
    subjectCode,
    class: classLevel,
    totalCandidates: candidates.length,
    roomsAllocated: roomsNeeded,
    startingRoom: allocatedRooms[0].roomNo,
    rooms: []
  }
  
  let candidateIndex = 0
  for (const room of allocatedRooms) {
    const roomPlan = {
      roomNo: room.roomNo,
      floor: room.floor,
      capacity: 24,
      candidatesAssigned: 0,
      seats: []
    }
    
    for (let seatNo = 1; seatNo <= 24 && candidateIndex < candidates.length; seatNo++) {
      const candidate = candidates[candidateIndex]
      roomPlan.seats.push({
        seatNumber: seatNo,
        rollNumber: candidate.rollNumber,
        candidateName: candidate.name,
        candidateId: candidate._id
      })
      candidateIndex++
      roomPlan.candidatesAssigned++
    }
    
    seatingPlan.rooms.push(roomPlan)
  }
  
  // 6. Save to database
  const savedPlan = await SeatingPlan.create(seatingPlan)
  
  return savedPlan
}
```

## Phase 4: Frontend Implementation

### Seating Plan Page Structure

```
/seatingplan
├── Tabs
│   ├── Notice Board Format
│   ├── Invigilator Slip Format
│   ├── Room Door Slip Format
│   └── CBSE Copy Format
├── Datesheet Table (existing)
└── Generate Button (per exam)
```

### UI Components Needed

1. **Generate Seating Plan Button**
   - Appears next to each exam in datesheet table
   - Triggers seating plan generation
   - Shows loading state

2. **Seating Plan Preview**
   - Shows generated seating plan
   - Room-wise view
   - Seat-wise candidate list

3. **Export Options**
   - Notice Board format (PDF)
   - Invigilator Slip (PDF)
   - Room Door Slip (PDF)
   - CBSE Copy (Excel/PDF)

4. **Status Indicators**
   - Draft (yellow)
   - Published (green)
   - Not Generated (gray)

## Phase 5: Output Formats

### 1. Notice Board Format
```
EXAMINATION SEATING PLAN
Date: 17 Feb 2026 (Monday)
Subject: 041 - Mathematics Standard
Class: 10th

Room 101 (Ground Floor) - 24 Candidates
Seat 1: 1001 - John Doe
Seat 2: 1002 - Jane Smith
...

Room 102 (Ground Floor) - 24 Candidates
...
```

### 2. Invigilator Slip Format
```
ROOM: 101
FLOOR: Ground Floor
DATE: 17 Feb 2026 (Monday)
SUBJECT: Mathematics Standard (041)
CLASS: 10th
TOTAL CANDIDATES: 24

SEATING ARRANGEMENT:
Row 1: Seats 1-6
Row 2: Seats 7-12
Row 3: Seats 13-18
Row 4: Seats 19-24

CANDIDATE LIST:
1. 1001 - John Doe
2. 1002 - Jane Smith
...
```

### 3. Room Door Slip Format
```
┌─────────────────────────────┐
│     EXAMINATION ROOM        │
│                             │
│     ROOM NO: 101            │
│     FLOOR: Ground Floor     │
│                             │
│     DATE: 17 Feb 2026       │
│     SUBJECT: Mathematics    │
│     CLASS: 10th             │
│                             │
│     CANDIDATES: 24          │
└─────────────────────────────┘
```

### 4. CBSE Copy Format (Excel)
```
| Sr No | Roll No | Name | Room No | Seat No | Floor | Subject | Date |
|-------|---------|------|---------|---------|-------|---------|------|
| 1     | 1001    | John | 101     | 1       | GF    | Math    | ... |
```

## Phase 6: Implementation Steps

### Step 1: Create Database Models
- [ ] Create SeatingPlan model
- [ ] Update Room model with allocation tracking
- [ ] Add indexes for performance

### Step 2: Build Backend API
- [ ] Create seating plan controller
- [ ] Implement generation algorithm
- [ ] Add room rotation logic
- [ ] Create API routes
- [ ] Add validation and error handling

### Step 3: Build Frontend
- [ ] Update SeatingPlan page
- [ ] Add generate button to datesheet table
- [ ] Create seating plan preview component
- [ ] Implement tab-based format views
- [ ] Add export functionality

### Step 4: Generate Output Formats
- [ ] Create PDF templates
- [ ] Implement Excel export
- [ ] Add print functionality
- [ ] Style each format appropriately

### Step 5: Testing
- [ ] Test with various candidate counts
- [ ] Test room rotation logic
- [ ] Test edge cases (1 candidate, 1000 candidates)
- [ ] Test export formats
- [ ] Test concurrent generation

### Step 6: Documentation
- [ ] API documentation
- [ ] User guide
- [ ] Admin guide
- [ ] Troubleshooting guide

## Next Steps

1. **Start with Backend**: Create models and API
2. **Test Algorithm**: Verify room rotation and allocation
3. **Build Frontend**: Connect to API and display data
4. **Generate Formats**: Create PDF/Excel exports
5. **Deploy and Test**: Full system testing

## Success Criteria

- ✅ Seating plan generates correctly for any number of candidates
- ✅ Room rotation works across multiple exam days
- ✅ All four output formats are generated properly
- ✅ System handles edge cases gracefully
- ✅ Performance is acceptable (< 5 seconds for 1000 candidates)
- ✅ Data integrity is maintained
- ✅ Audit trail is complete

## Timeline Estimate

- Phase 1 (Models): 2 hours
- Phase 2 (Backend API): 4 hours
- Phase 3 (Algorithm): 3 hours
- Phase 4 (Frontend): 4 hours
- Phase 5 (Formats): 3 hours
- Phase 6 (Testing): 2 hours

**Total: ~18 hours of development**

---

Ready to start implementation? Let's begin with Phase 1: Database Models!
