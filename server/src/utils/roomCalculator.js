const CANDIDATES_PER_ROOM = 24

const getEntryClass = (entry) =>
  entry.class || (entry.subject && entry.subject.class) || ''

/**
 * Calculates rooms needed for a group of datesheet entries on the same exam day.
 *
 * Uses a greedy remainder-merging approach: entries are processed largest-first
 * so that smaller subjects can fill vacant seats in partially-occupied rooms,
 * reducing the total room count for the day.
 *
 * @param {Array} entries - Datesheet entries (must already have `candidateCount`).
 *   Each entry is mutated in place to add `roomsNeeded`.
 * @returns {Array} The same entries with `roomsNeeded` set.
 */
function calculateRoomsForDay(entries) {
  if (!entries || entries.length === 0) return entries

  const sorted = [...entries].sort((a, b) => b.candidateCount - a.candidateCount)
  const availableSlots = [] // { seats, hostEntry }

  for (const entry of sorted) {
    const count = entry.candidateCount
    const remainder = count % CANDIDATES_PER_ROOM
    entry.roomsNeeded = Math.ceil(count / CANDIDATES_PER_ROOM)
    entry._hostEntry = null

    if (remainder > 0) {
      let bestIdx = -1
      let bestSize = Infinity
      for (let i = 0; i < availableSlots.length; i++) {
        if (availableSlots[i].seats >= remainder && availableSlots[i].seats < bestSize) {
          bestIdx = i
          bestSize = availableSlots[i].seats
        }
      }

      if (bestIdx >= 0) {
        entry.roomsNeeded -= 1
        entry._hostEntry = availableSlots[bestIdx].hostEntry
        availableSlots[bestIdx].seats -= remainder
        if (availableSlots[bestIdx].seats === 0) availableSlots.splice(bestIdx, 1)
      } else {
        availableSlots.push({ seats: CANDIDATES_PER_ROOM - remainder, hostEntry: entry })
      }
    }
  }

  // Re-sort for display: group same class together, largest first within class
  sorted.sort((a, b) => {
    const classA = getEntryClass(a)
    const classB = getEntryClass(b)
    if (classA !== classB) return classA < classB ? -1 : 1
    return b.candidateCount - a.candidateCount
  })

  // Compute cumulative room positions and set sharedRoomPosition
  const lastRoomPosition = new Map()
  let cumulative = 0
  for (const entry of sorted) {
    if (entry.roomsNeeded > 0) {
      cumulative += entry.roomsNeeded
      lastRoomPosition.set(entry, cumulative)
    }
  }
  for (const entry of sorted) {
    if (entry._hostEntry) {
      entry.sharedRoomPosition = lastRoomPosition.get(entry._hostEntry) || null
    }
    delete entry._hostEntry
  }

  return sorted
}

/**
 * Groups entries by exam date, applies per-day room calculation,
 * and returns the flattened result.
 *
 * @param {Array} entries - Datesheet entries with `candidateCount` and an
 *   `examDate` field (Date or string).
 * @returns {Array} Entries with `roomsNeeded` set via the remainder-merging algorithm.
 */
function calculateRoomsGroupedByDate(entries) {
  if (!entries || entries.length === 0) return entries

  const byDate = new Map()
  for (const entry of entries) {
    const dateKey = entry.examDate instanceof Date
      ? entry.examDate.toISOString().slice(0, 10)
      : new Date(entry.examDate).toISOString().slice(0, 10)
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey).push(entry)
  }

  const result = []
  for (const group of byDate.values()) {
    result.push(...calculateRoomsForDay(group))
  }

  return result
}

module.exports = {
  CANDIDATES_PER_ROOM,
  calculateRoomsForDay,
  calculateRoomsGroupedByDate
}
