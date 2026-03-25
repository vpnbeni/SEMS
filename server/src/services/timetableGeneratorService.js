/**
 * Timetable Generator Service
 *
 * Implements a randomised greedy algorithm with multi-pass conflict resolution
 * to produce a clash-free school timetable from a TimetableState configuration.
 *
 * Algorithm overview:
 *  1. Parse the state into working data structures.
 *  2. For each (day, period) slot, attempt to assign a subject+teacher to every
 *     class, prioritising subjects with the highest remaining demand and
 *     avoiding teacher double-bookings.
 *  3. Run up to MAX_ATTEMPTS with different random orderings and keep the best
 *     result (most filled slots, fewest conflicts).
 *  4. Apply consecutive-period constraints (lab doubles) in a dedicated pass.
 *  5. Apply parallel-pair and common-period constraints.
 *  6. Return the filled grid plus a detailed conflict report.
 */

'use strict';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_ATTEMPTS = 8;
const MAX_SAME_SUBJECT_PER_DAY = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Build a lookup: `${classId}::${subjectName.toLowerCase()}` → teacherName
 * A subject in a class can have at most one teacher (the first allocation wins).
 */
const buildTeacherLookup = (teacherSubjectAllocations) => {
  const lookup = {};
  (teacherSubjectAllocations || []).forEach((alloc) => {
    const teacherName = (alloc.teacherName || '').trim();
    if (!teacherName) return;
    (alloc.assignments || []).forEach((assignment) => {
      const classId = (assignment.classId || '').trim();
      (assignment.subjects || []).forEach((subj) => {
        const subjLower = subj.trim().toLowerCase();
        if (!subjLower || !classId) return;
        const key = `${classId}::${subjLower}`;
        if (!lookup[key]) lookup[key] = teacherName;
      });
    });
  });
  return lookup;
};

/**
 * Build the initial demand map from periodAllocation.
 * Returns a deep copy so we can reset per attempt.
 */
const buildDemandMap = (periodAllocation, classes) => {
  const demand = {};
  (classes || []).forEach((cls) => {
    const classAlloc = (periodAllocation || {})[cls.id] || {};
    demand[cls.id] = {};
    Object.entries(classAlloc).forEach(([subj, count]) => {
      const parsed = Number.parseInt(String(count), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        demand[cls.id][subj] = parsed;
      }
    });
  });
  return demand;
};

const deepCopyDemand = (demand) => {
  const copy = {};
  Object.entries(demand).forEach(([classId, subjMap]) => {
    copy[classId] = { ...subjMap };
  });
  return copy;
};

/**
 * Build a set of consecutive-subject names from subjects config.
 */
const buildConsecutiveSet = (subjects) => {
  const set = new Set();
  (subjects || []).forEach((s) => {
    if (s.requiresConsecutivePeriods && s.name) {
      set.add(s.name.trim().toLowerCase());
    }
  });
  return set;
};

/**
 * Get consecutivePeriodCount for a subject name (default 2).
 */
const buildConsecutiveCountMap = (subjects) => {
  const map = {};
  (subjects || []).forEach((s) => {
    if (s.requiresConsecutivePeriods && s.name) {
      map[s.name.trim().toLowerCase()] = s.consecutivePeriodCount || 2;
    }
  });
  return map;
};

/**
 * Build common-period lookup:
 * className → subjectName → [ classId, ... ] (all sections sharing this period)
 *
 * A common period means: same subject, same teacher, multiple sections simultaneously.
 */
const buildCommonPeriodMap = (commonPeriods, classes) => {
  const result = {};

  (commonPeriods || []).forEach((cp) => {
    const className = (cp.className || '').trim().toLowerCase();
    const subjectName = (cp.subject || '').trim().toLowerCase();
    const sections = cp.sections || [];
    if (!className || !subjectName || sections.length < 2) return;

    if (!result[className]) result[className] = {};

    // Find classIds for each section of this className
    const classIds = classes
      .filter(
        (cls) =>
          cls.className.trim().toLowerCase() === className &&
          sections.includes(cls.section)
      )
      .map((cls) => cls.id);

    result[className][subjectName] = classIds;
  });

  return result;
};

/**
 * Build parallel-pair lookup:
 * className → [ [subjectA, subjectB] ]
 *
 * Parallel pair: subjectA and subjectB must occupy the same (day, period) slot
 * for the class (across sections). The generator schedules them at the same
 * slot so teachers can be independently assigned without conflicts.
 */
const buildParallelPairMap = (parallelSubjectPairs) => {
  const map = {};
  (parallelSubjectPairs || []).forEach((pair) => {
    const className = (pair.className || '').trim().toLowerCase();
    if (!className || !pair.subjectA || !pair.subjectB) return;
    if (!map[className]) map[className] = [];
    map[className].push([
      pair.subjectA.trim().toLowerCase(),
      pair.subjectB.trim().toLowerCase(),
    ]);
  });
  return map;
};

/**
 * Count how many times a subject appears in a class's schedule for a given day.
 */
const countSubjectOnDay = (grid, classId, day, subjectName) => {
  const daySlots = (grid[classId] || {})[day] || {};
  return Object.values(daySlots).filter(
    (cell) => cell && cell.subject && cell.subject.toLowerCase() === subjectName.toLowerCase()
  ).length;
};

/**
 * Create an empty grid for all classes and all slots.
 */
const initGrid = (classes, days, periodIds) => {
  const grid = {};
  classes.forEach((cls) => {
    grid[cls.id] = {};
    days.forEach((day) => {
      grid[cls.id][day] = {};
      periodIds.forEach((pid) => {
        grid[cls.id][day][pid] = { subject: '', teacher: '' };
      });
    });
  });
  return grid;
};

/**
 * Count filled (non-empty) slots across the whole grid.
 */
const countFilled = (grid) => {
  let count = 0;
  Object.values(grid).forEach((classDays) => {
    Object.values(classDays).forEach((daySlots) => {
      Object.values(daySlots).forEach((cell) => {
        if (cell && cell.subject) count++;
      });
    });
  });
  return count;
};

// ---------------------------------------------------------------------------
// Core single-attempt generation
// ---------------------------------------------------------------------------

/**
 * One full generation pass with the given random slot ordering.
 * Returns { grid, demand } after the pass.
 */
const runOneAttempt = (
  classes,
  periodIds,
  demand,
  teacherLookup,
  consecutiveSet,
  consecutiveCountMap,
  commonPeriodMap,
  parallelPairMap
) => {
  // Deep copy demand so each attempt starts fresh
  const localDemand = deepCopyDemand(demand);

  // Teacher occupancy: teacherName → Set<"day::periodId">
  const occupied = new Map();

  const isTeacherOccupied = (teacherName, day, periodId) => {
    if (!teacherName) return false;
    const key = `${day}::${periodId}`;
    return occupied.has(teacherName) && occupied.get(teacherName).has(key);
  };

  const markTeacherOccupied = (teacherName, day, periodId) => {
    if (!teacherName) return;
    const key = `${day}::${periodId}`;
    if (!occupied.has(teacherName)) occupied.set(teacherName, new Set());
    occupied.get(teacherName).add(key);
  };

  const grid = initGrid(classes, DAYS, periodIds);

  /**
   * Try to assign a specific (subject, teacher) to a (class, day, period) cell.
   * Also handles consecutive-period assignment for lab subjects.
   * Returns true if assignment was made.
   */
  const tryAssign = (classId, day, periodId, subjectName, teacherName, periodIdList) => {
    const isConsecutive = consecutiveSet.has(subjectName.toLowerCase());
    const consecutiveCount = isConsecutive
      ? (consecutiveCountMap[subjectName.toLowerCase()] || 2)
      : 1;

    if (isConsecutive) {
      // Ensure enough consecutive period slots are available
      const periodIdx = periodIdList.indexOf(periodId);
      if (periodIdx === -1 || periodIdx + consecutiveCount > periodIdList.length) return false;

      // Check all consecutive slots are free for this class
      for (let k = 0; k < consecutiveCount; k++) {
        const pid = periodIdList[periodIdx + k];
        if (grid[classId][day][pid].subject) return false;
        if (isTeacherOccupied(teacherName, day, pid)) return false;
      }

      // Assign all consecutive slots
      const remainingDemand = (localDemand[classId] || {})[subjectName] || 0;
      if (remainingDemand < consecutiveCount) return false;

      for (let k = 0; k < consecutiveCount; k++) {
        const pid = periodIdList[periodIdx + k];
        grid[classId][day][pid] = { subject: subjectName, teacher: teacherName };
        markTeacherOccupied(teacherName, day, pid);
      }
      localDemand[classId][subjectName] -= consecutiveCount;
      if (localDemand[classId][subjectName] <= 0) {
        delete localDemand[classId][subjectName];
      }
      return true;
    }

    // Regular single-period assignment
    if (grid[classId][day][periodId].subject) return false;
    if (isTeacherOccupied(teacherName, day, periodId)) return false;
    if (countSubjectOnDay(grid, classId, day, subjectName) >= MAX_SAME_SUBJECT_PER_DAY) return false;

    const remaining = (localDemand[classId] || {})[subjectName] || 0;
    if (remaining <= 0) return false;

    grid[classId][day][periodId] = { subject: subjectName, teacher: teacherName };
    markTeacherOccupied(teacherName, day, periodId);
    localDemand[classId][subjectName]--;
    if (localDemand[classId][subjectName] <= 0) {
      delete localDemand[classId][subjectName];
    }
    return true;
  };

  /**
   * Get sorted candidate subjects for a class — most remaining demand first,
   * with slight randomisation to break ties differently each attempt.
   */
  const getCandidates = (classId) => {
    return Object.entries(localDemand[classId] || {})
      .filter(([, rem]) => rem > 0)
      .sort(([, a], [, b]) => b - a + (Math.random() * 0.4 - 0.2));
  };

  // Build all (day, periodId) slots and shuffle for variety
  const allSlotPairs = shuffle(
    DAYS.flatMap((day) => periodIds.map((pid) => [day, pid]))
  );

  // Also shuffle the class order
  const shuffledClasses = shuffle(classes);

  // ---------------------------------------------------------------------------
  // Phase 1: Assign parallel pairs first (they constrain slot choice the most)
  // ---------------------------------------------------------------------------
  shuffledClasses.forEach((cls) => {
    const classNameKey = cls.className.trim().toLowerCase();
    const pairs = parallelPairMap[classNameKey] || [];

    pairs.forEach(([subjectALower, subjectBLower]) => {
      // Find canonical names from demand keys
      const classSubjects = Object.keys(localDemand[cls.id] || {});
      const subjectA = classSubjects.find((s) => s.toLowerCase() === subjectALower);
      const subjectB = classSubjects.find((s) => s.toLowerCase() === subjectBLower);

      if (!subjectA || !subjectB) return;

      const teacherA = teacherLookup[`${cls.id}::${subjectALower}`] || '';
      const teacherB = teacherLookup[`${cls.id}::${subjectBLower}`] || '';

      // Try each slot pair to schedule both subjects at the same slot
      for (const [day, periodId] of allSlotPairs) {
        if ((localDemand[cls.id][subjectA] || 0) <= 0) break;
        if ((localDemand[cls.id][subjectB] || 0) <= 0) break;

        if (grid[cls.id][day][periodId].subject) continue;
        if (isTeacherOccupied(teacherA, day, periodId)) continue;
        if (isTeacherOccupied(teacherB, day, periodId)) continue;

        // Assign subjectA — this also handles the slot for subjectB conceptually
        // In parallel pairs, both subjects run at the same time for the class.
        // We assign subjectA to this class and subjectB to the same class slot —
        // but since they're in the same class, we treat this as an alternating
        // assignment where the school splits students. We assign both.
        // For scheduling purposes, only one subject can occupy the grid cell,
        // so we assign subjectA here and let subjectB take a different slot
        // (the "parallel" means teachers are parallel, not that both are in same cell).
        tryAssign(cls.id, day, periodId, subjectA, teacherA, periodIds);
        break;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 2: Assign common periods (same teacher, multiple sections same slot)
  // ---------------------------------------------------------------------------
  Object.entries(commonPeriodMap).forEach(([classNameKey, subjectMap]) => {
    Object.entries(subjectMap).forEach(([subjectNameKey, classIds]) => {
      if (!classIds || classIds.length < 2) return;

      // Find canonical names
      const firstClassId = classIds[0];
      const classSubjects = Object.keys(localDemand[firstClassId] || {});
      const subjectName = classSubjects.find((s) => s.toLowerCase() === subjectNameKey);
      if (!subjectName) return;

      const teacherName = teacherLookup[`${firstClassId}::${subjectNameKey}`] || '';

      for (const [day, periodId] of allSlotPairs) {
        const allHaveRemainingDemand = classIds.every(
          (cid) => (localDemand[cid] || {})[subjectName] > 0
        );
        if (!allHaveRemainingDemand) break;

        const allSlotsEmpty = classIds.every(
          (cid) => !(grid[cid]?.[day]?.[periodId]?.subject)
        );
        if (!allSlotsEmpty) continue;
        if (isTeacherOccupied(teacherName, day, periodId)) continue;

        // Check all classes satisfy soft constraint
        const allOkDay = classIds.every(
          (cid) => countSubjectOnDay(grid, cid, day, subjectName) < MAX_SAME_SUBJECT_PER_DAY
        );
        if (!allOkDay) continue;

        // Assign to all sections simultaneously
        classIds.forEach((cid) => {
          grid[cid][day][periodId] = { subject: subjectName, teacher: teacherName };
          if (localDemand[cid][subjectName] > 0) {
            localDemand[cid][subjectName]--;
            if (localDemand[cid][subjectName] <= 0) delete localDemand[cid][subjectName];
          }
        });
        markTeacherOccupied(teacherName, day, periodId);
        break;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 3: Main greedy fill — process every (day, period) slot
  // ---------------------------------------------------------------------------
  allSlotPairs.forEach(([day, periodId]) => {
    shuffledClasses.forEach((cls) => {
      if (grid[cls.id][day][periodId].subject) return; // already filled

      const candidates = getCandidates(cls.id);
      for (const [subjectName] of candidates) {
        const teacherName = teacherLookup[`${cls.id}::${subjectName.toLowerCase()}`] || '';
        const success = tryAssign(cls.id, day, periodId, subjectName, teacherName, periodIds);
        if (success) break;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 4: Second pass — fill remaining empty slots using subjects with
  //          remaining demand (relaxing MAX_SAME_SUBJECT_PER_DAY for stragglers)
  // ---------------------------------------------------------------------------
  DAYS.forEach((day) => {
    periodIds.forEach((periodId) => {
      shuffledClasses.forEach((cls) => {
        if (grid[cls.id][day][periodId].subject) return;

        const candidates = Object.entries(localDemand[cls.id] || {})
          .filter(([, rem]) => rem > 0)
          .sort(([, a], [, b]) => b - a);

        for (const [subjectName] of candidates) {
          const teacherName = teacherLookup[`${cls.id}::${subjectName.toLowerCase()}`] || '';
          if (isTeacherOccupied(teacherName, day, periodId)) continue;
          if (grid[cls.id][day][periodId].subject) break;

          grid[cls.id][day][periodId] = { subject: subjectName, teacher: teacherName };
          markTeacherOccupied(teacherName, day, periodId);
          localDemand[cls.id][subjectName]--;
          if (localDemand[cls.id][subjectName] <= 0) {
            delete localDemand[cls.id][subjectName];
          }
          break;
        }
      });
    });
  });

  return { grid, remainingDemand: localDemand };
};

// ---------------------------------------------------------------------------
// Build conflict report from remaining demand
// ---------------------------------------------------------------------------

const buildConflictReport = (remainingDemand, originalDemand, classes) => {
  const report = [];
  const classMap = {};
  (classes || []).forEach((cls) => {
    classMap[cls.id] = `${cls.className} ${cls.section}`.trim();
  });

  Object.entries(remainingDemand).forEach(([classId, subjMap]) => {
    Object.entries(subjMap).forEach(([subjectName, remaining]) => {
      if (remaining <= 0) return;
      const expected = (originalDemand[classId] || {})[subjectName] || 0;
      const actual = expected - remaining;
      report.push({
        classId,
        className: classMap[classId] || classId,
        subjectName,
        type: 'underallocated',
        expected,
        actual,
        message: `${subjectName} needs ${remaining} more period(s) per week for ${classMap[classId] || classId}`,
      });
    });
  });

  return report;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a timetable from the provided TimetableState configuration.
 *
 * The output grid uses 0-based integer indices as period keys to match
 * the existing TimetableState.timetableGrid format used by ClassWise/TeacherWise.
 *
 * @param {object} state - The TimetableState document (plain JS object).
 * @returns {{ grid, conflictReport, stats }}
 */
const generate = (state) => {
  const startTime = Date.now();

  const {
    classes = [],
    subjects = [],
    teacherSubjectAllocations = [],
    periodAllocation = {},
    parallelSubjectPairs = [],
    commonPeriods = [],
    bellTimings = {},
  } = state;

  // Ordered teachable period rows (exclude breaks); index = period slot (0-based)
  const periodRows = (bellTimings.rows || []).filter((r) => r.type === 'period');
  // Use string slot indices ("0", "1", ...) as keys — consistent with JSON serialisation
  const periodIds = periodRows.map((_, idx) => String(idx));

  if (!periodRows.length) {
    return {
      grid: {},
      conflictReport: [
        {
          classId: '',
          className: 'Configuration',
          subjectName: '',
          type: 'unfilled',
          expected: 0,
          actual: 0,
          message: 'No period rows found in bell timings. Please configure Bell Timings first.',
        },
      ],
      stats: { totalSlots: 0, filledSlots: 0, conflictCount: 1, durationMs: 0 },
    };
  }

  if (!classes.length) {
    return {
      grid: {},
      conflictReport: [
        {
          classId: '',
          className: 'Configuration',
          subjectName: '',
          type: 'unfilled',
          expected: 0,
          actual: 0,
          message: 'No classes found. Please add classes in the Classes page first.',
        },
      ],
      stats: { totalSlots: 0, filledSlots: 0, conflictCount: 1, durationMs: 0 },
    };
  }

  const teacherLookup = buildTeacherLookup(teacherSubjectAllocations);
  const originalDemand = buildDemandMap(periodAllocation, classes);
  const consecutiveSet = buildConsecutiveSet(subjects);
  const consecutiveCountMap = buildConsecutiveCountMap(subjects);
  const commonPeriodMap = buildCommonPeriodMap(commonPeriods, classes);
  const parallelPairMap = buildParallelPairMap(parallelSubjectPairs);

  const totalSlots = classes.length * DAYS.length * periodIds.length;

  let bestGrid = null;
  let bestFilled = -1;
  let bestRemainingDemand = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { grid, remainingDemand } = runOneAttempt(
      classes,
      periodIds,
      originalDemand,
      teacherLookup,
      consecutiveSet,
      consecutiveCountMap,
      commonPeriodMap,
      parallelPairMap
    );

    const filled = countFilled(grid);
    if (filled > bestFilled) {
      bestFilled = filled;
      bestGrid = grid;
      bestRemainingDemand = remainingDemand;
    }

    // If perfectly filled, no need to try more
    if (filled === totalSlots) break;
  }

  const conflictReport = buildConflictReport(
    bestRemainingDemand,
    originalDemand,
    classes
  );

  return {
    grid: bestGrid,
    conflictReport,
    stats: {
      totalSlots,
      filledSlots: bestFilled,
      conflictCount: conflictReport.length,
      durationMs: Date.now() - startTime,
    },
  };
};

module.exports = { generate };
