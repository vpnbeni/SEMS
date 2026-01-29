# Seating Arrangement Rules

## Overview
This document defines the rules and metadata for seating arrangements in examination rooms.

## Critical Seating Rules

### 🔴 IMPORTANT: Daily Room Rotation Rule
**Seating arrangements MUST start from a new room for each exam day**

#### Purpose
- Prevents students from having fixed seats throughout the examination period
- Ensures fairness and reduces the possibility of malpractice
- Maintains examination integrity by varying seating positions

#### Implementation
1. **Day 1**: Start allocation from Room 101
2. **Day 2**: Start allocation from Room 102 (or next available room)
3. **Day 3**: Start allocation from Room 103 (or next available room)
4. **Continue rotating** through available rooms for each exam day

#### Example Scenario
```
Exam Day 1 (Feb 17, 2026):
- Subject: Mathematics
- Candidates: 50
- Rooms Used: 101, 102, 103 (24 + 24 + 2)

Exam Day 2 (Feb 18, 2026):
- Subject: Science
- Candidates: 45
- Rooms Used: 104, 105 (24 + 21)
- NOTE: Starting from Room 104, NOT Room 101

Exam Day 3 (Feb 19, 2026):
- Subject: English
- Candidates: 60
- Rooms Used: 106, 107, 108 (24 + 24 + 12)
- NOTE: Starting from Room 106, continuing the rotation
```

### 🔴 IMPORTANT: Dynamic Room Allocation
**Total rooms used depend on the number of candidates appearing on that particular day**

#### Key Points
- Room allocation is **NOT fixed** for the entire examination period
- Each exam day has its own allocation based on actual candidate count
- Rooms are allocated **on-demand** per exam/subject

#### Example: Variable Daily Allocation
```
Monday (100 candidates):
- Rooms needed: 5 rooms (24+24+24+24+4)
- Rooms used: 101-105

Tuesday (48 candidates):
- Rooms needed: 2 rooms (24+24)
- Rooms used: 106-107
- NOTE: Only 2 rooms needed, not 5

Wednesday (150 candidates):
- Rooms needed: 7 rooms (24+24+24+24+24+24+6)
- Rooms used: 108-114
- NOTE: More rooms needed based on higher candidate count
```

## Room Capacity Rules

### Standard Capacity
- **Default capacity per room**: 24 candidates
- Each examination room is designed to accommodate exactly 24 candidates in a standard seating arrangement

### Allocation Logic

#### When candidates are divisible by 24
- Example: 72 candidates = 3 rooms (24 + 24 + 24)
- Example: 48 candidates = 2 rooms (24 + 24)

#### When candidates are NOT divisible by 24
- Remaining candidates will be allocated to the next room
- Example: 50 candidates = 3 rooms (24 + 24 + 2)
- Example: 75 candidates = 4 rooms (24 + 24 + 24 + 3)
- Example: 25 candidates = 2 rooms (24 + 1)

### Calculation Formula
```
Total Rooms Needed = Math.ceil(Total Candidates / 24)
```

Where:
- `Total Candidates` = Number of students appearing for the exam
- `24` = Standard room capacity
- `Math.ceil()` = Rounds up to ensure all candidates have seats

## Implementation Examples

### Example 1: Exact Division
- **Candidates**: 96
- **Calculation**: 96 ÷ 24 = 4
- **Rooms Needed**: 4
- **Distribution**: Room 1 (24), Room 2 (24), Room 3 (24), Room 4 (24)

### Example 2: With Remainder
- **Candidates**: 100
- **Calculation**: 100 ÷ 24 = 4.166... → ceil(4.166) = 5
- **Rooms Needed**: 5
- **Distribution**: Room 1 (24), Room 2 (24), Room 3 (24), Room 4 (24), Room 5 (4)

### Example 3: Small Group
- **Candidates**: 15
- **Calculation**: 15 ÷ 24 = 0.625 → ceil(0.625) = 1
- **Rooms Needed**: 1
- **Distribution**: Room 1 (15)

## Seating Arrangement Patterns

### Standard 24-Seat Layout
```
Row 1:  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
Row 2:  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
Row 3:  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
Row 4:  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
```

### Spacing Requirements
- Minimum distance between candidates: As per examination board guidelines
- Aisle space: Adequate for invigilator movement
- Emergency exit access: Must be maintained

## Auto-Allocation Algorithm

When using the "Auto Allocate" feature:

1. **Identify exam date** and subject
2. **Count total candidates** appearing for that specific exam
3. **Calculate rooms needed**: `Math.ceil(candidates / 24)`
4. **Determine starting room**:
   - Check last used room from previous exam day
   - Start from the next available room in sequence
   - Implement room rotation to prevent fixed seating
5. **Select available rooms** from the room pool (starting from rotation point)
6. **Distribute candidates**:
   - Fill rooms sequentially with 24 candidates each
   - Last room gets remaining candidates (if any)
   - Randomize or shuffle candidate order to vary seating positions
7. **Generate seating plan** for each room
8. **Record allocation** with exam date, rooms used, and starting room for next day

### Room Rotation Logic
```javascript
// Pseudo-code for room rotation
function allocateRoomsForExam(examDate, candidates, availableRooms) {
  // Get last used room from previous exam day
  const lastUsedRoom = getLastUsedRoom(examDate - 1)
  
  // Find next starting room
  const startingRoomIndex = findNextRoomIndex(lastUsedRoom, availableRooms)
  
  // Calculate rooms needed
  const roomsNeeded = Math.ceil(candidates.length / 24)
  
  // Allocate rooms starting from rotation point
  const allocatedRooms = []
  for (let i = 0; i < roomsNeeded; i++) {
    const roomIndex = (startingRoomIndex + i) % availableRooms.length
    allocatedRooms.push(availableRooms[roomIndex])
  }
  
  // Distribute candidates across rooms
  return distributeCandidate(candidates, allocatedRooms, 24)
}
```

## Special Cases

### Mixed Class Examinations
- If Class 10 and Class 12 students take the same exam:
  - Allocate separate rooms for each class when possible
  - If mixed allocation is necessary, maintain clear separation
  - Apply room rotation rule separately for each class

### Subject-Specific Requirements
- Some subjects may require special seating (e.g., practical exams)
- Drawing/Art exams may need different capacity (fewer students per room)
- Computer-based exams follow different rules

### Multiple Exams on Same Day
If multiple exams occur on the same day (different time slots):
1. **Morning Session**: Start from rotation point A
2. **Afternoon Session**: Start from rotation point B (next available after morning)
3. Maintain separate rotation tracking for each session

### Room Unavailability
If a room in the rotation sequence is unavailable:
- Skip to next available room
- Continue rotation from that point
- Document the skip for audit purposes

## Metadata Storage

### Room Model
```javascript
{
  roomNo: String,
  class: String,
  floor: String,
  capacity: 24, // Default capacity
  status: 'available' | 'allocated' | 'maintenance',
  allocatedTo: {
    examDate: Date,
    subjectCode: String,
    candidateCount: Number,
    candidates: [Array of candidate IDs]
  }
}
```

### Allocation Record
```javascript
{
  examDate: Date,
  subjectCode: String,
  subjectName: String,
  class: String,
  totalCandidates: Number,
  roomsAllocated: [
    {
      roomNo: String,
      floor: String,
      candidateCount: Number,
      candidates: [Array of candidate objects with roll numbers]
    }
  ]
}
```

## Future Enhancements

1. **Configurable Capacity**: Allow different capacities per room
2. **Room Preferences**: Priority allocation based on room features
3. **Accessibility**: Special seating for candidates with special needs
4. **Optimization**: Minimize room usage while maintaining spacing
5. **Conflict Detection**: Prevent double-booking of rooms

## Important Implementation Notes

### Daily Allocation Principles
1. **Fresh Start Each Day**: Every exam day begins with a new room allocation
2. **No Fixed Seats**: Students should not have the same seat across multiple exam days
3. **Dynamic Capacity**: Room usage varies based on daily candidate count
4. **Rotation Enforcement**: System must enforce room rotation automatically

### Benefits of Room Rotation
- **Fairness**: All students experience different seating positions
- **Security**: Reduces familiarity with specific locations
- **Flexibility**: Optimizes room usage based on actual needs
- **Integrity**: Maintains examination standards and prevents malpractice

### System Requirements
- Track last used room for each exam day
- Calculate starting room for next exam day
- Support variable candidate counts per day
- Generate unique seating arrangements for each exam
- Maintain audit trail of room allocations

## Notes

- This 24-candidate rule is the standard for CBSE examinations
- Local examination boards may have different capacity requirements
- Always verify with current examination guidelines
- Room capacity may be reduced for social distancing requirements
- **Room rotation is mandatory** to maintain examination integrity
- **Daily allocation is independent** - do not carry over room assignments

## Related Documents

- `SEATING_PLAN_FORMATS.md` - Different seating plan output formats
- `ROOM_ALLOCATION_API.md` - API documentation for room allocation
- `AUTO_ALLOCATION_ALGORITHM.md` - Detailed algorithm documentation
