/**
 * Date Helper Utility
 * Provides functions to work with dates and automatically calculate day names
 */

/**
 * Get day name from date
 * @param {Date|string} date - Date object or date string
 * @returns {string} Day name (e.g., "Monday", "Tuesday")
 */
function getDayName(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dateObj.getDay()]
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Add day name to datesheet entry
 * @param {Object} entry - Datesheet entry object
 * @returns {Object} Entry with dayName added
 */
function addDayNameToEntry(entry) {
  if (entry.examDate) {
    entry.dayName = getDayName(entry.examDate)
  }
  return entry
}

/**
 * Add day names to multiple entries
 * @param {Array} entries - Array of datesheet entries
 * @returns {Array} Entries with dayName added
 */
function addDayNamesToEntries(entries) {
  return entries.map(entry => addDayNameToEntry(entry))
}

/**
 * Get date with day name object
 * @param {Date|string} date - Date object or date string
 * @returns {Object} Object with date and dayName
 */
function getDateWithDay(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return {
    date: formatDate(dateObj),
    dayName: getDayName(dateObj)
  }
}

module.exports = {
  getDayName,
  formatDate,
  addDayNameToEntry,
  addDayNamesToEntries,
  getDateWithDay
}
