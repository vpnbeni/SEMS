const pdf = require('pdf-parse')
const { getDayName } = require('./dateHelper')

/**
 * Parse CBSE Full Datesheet PDF format
 * Format: DATE | Sub Code | Subject Name | Class | Duration (Hours) | Answer Sheet
 * Example: 3/2/2026 | 002 | HINDI COURSE - A | 10th | 3 | 32 Pages
 */
class CBSEDatesheetParser {

  /**
   * Parse CBSE datesheet PDF buffer
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Object>} Parsed datesheet data
   */
  async parsePDF(pdfBuffer) {
    try {
      console.log('📄 Parsing CBSE Datesheet PDF...')

      const data = await pdf(pdfBuffer)
      console.log(`📊 Extracted ${data.text.length} characters from ${data.numpages} pages`)

      const entries = this.parseTextContent(data.text)

      return {
        success: true,
        data: {
          entries,
          count: entries.length,
          source: 'CBSE Full Datesheet',
          format: 'CBSE Standard Format'
        }
      }

    } catch (error) {
      console.error('❌ Error parsing CBSE datesheet:', error)
      return {
        success: false,
        error: error.message,
        data: { entries: [], count: 0 }
      }
    }
  }

  /**
   * Parse text content and extract exam entries
   * @param {string} text - Raw text from PDF
   * @returns {Array} Array of parsed exam entries
   */
  parseTextContent(text) {
    const entries = []
    const lines = text.split('\n').filter(line => line.trim().length > 0)

    console.log(`📋 Processing ${lines.length} lines...`)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\s+/g, ' ').trim()

      // Skip header lines
      if (this.isHeaderLine(line)) {
        continue
      }

      // Try to parse as exam entry
      let entry = this.parseExamEntry(line)
      if (!entry && i < lines.length - 1) {
        const combinedLine = `${line} ${lines[i + 1].replace(/\s+/g, ' ').trim()}`.trim()
        entry = this.parseExamEntry(combinedLine)
        if (entry) {
          i += 1
        }
      }
      if (entry) {
        entries.push(entry)
      }
    }

    console.log(`✅ Successfully parsed ${entries.length} exam entries`)
    return entries
  }

  /**
   * Check if line is a header line
   * @param {string} line - Line to check
   * @returns {boolean} True if header line
   */
  isHeaderLine(line) {
    const headerPatterns = [
      /^DATE.*Sub Code.*Subject Name.*Class/i,
      /^Date.*Sub Code.*Subject Name.*Class/i,
      /^Duration.*Hours.*Answer Sheet/i,
      /^=+$/,
      /^-+$/,
      /^\s*$/
    ]

    return headerPatterns.some(pattern => pattern.test(line))
  }

  /**
   * Parse individual exam entry line
   * @param {string} line - Line to parse
   * @returns {Object|null} Parsed entry or null if invalid
   */
  parseExamEntry(line) {
    try {
      // CBSE format variations:
      // 1) 3/2/2026 002 HINDI COURSE - A 10th 3 32 Pages
      // 2) 3/2/2026002HINDI COURSE - A10th332 Pages
      const normalizedLine = line.replace(/\s+/g, ' ').trim()

      let dateStr, subjectCode, subjectName, classLevel, duration, answerSheetText
      const unifiedPattern = /^(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{3})\s*(.+?)\s*(10th|12th)\s*(\d)\s*(.*)$/i
      const match = normalizedLine.match(unifiedPattern)
      if (!match) {
        return null
      }
      dateStr = match[1]
      subjectCode = match[2]
      subjectName = match[3].trim()
      classLevel = match[4].toLowerCase()
      duration = parseInt(match[5], 10) || 3
      answerSheetText = (match[6] || '').trim()

      if (!subjectName) {
        return null
      }

      const answerSheetMatch = answerSheetText.match(/(\d+)\s*(Pages?|Graph)/i)
      let answerSheet = '32 Pages' // Default
      if (answerSheetMatch) {
        const pages = answerSheetMatch[1]
        const type = answerSheetMatch[2]
        answerSheet = `${pages} ${type}`
      } else if (answerSheetText.toLowerCase().includes('graph')) {
        answerSheet = '40 Graph'
      } else if (answerSheetText.toLowerCase().includes('20')) {
        answerSheet = '20 Pages'
      }

      // Convert date format from M/D/YYYY to YYYY-MM-DD
      const examDate = this.convertDateFormat(dateStr)

      const entry = {
        examDate,
        dayName: getDayName(examDate), // Automatically calculate day name
        subject: {
          code: subjectCode,
          name: subjectName,
          class: classLevel,
          duration: duration
        },
        timeSlot: {
          start: '10:30',
          end: this.calculateEndTime('10:30', duration * 60) // Convert hours to minutes
        },
        duration: duration * 60, // Convert to minutes for consistency
        answerSheet: this.mapAnswerSheet(answerSheet),
        isOptional: false,
        instructions: []
      }

      return entry

    } catch (error) {
      console.warn(`⚠️  Failed to parse line: "${line}" - ${error.message}`)
      return null
    }
  }

  /**
   * Convert date from M/D/YYYY to YYYY-MM-DD format
   * @param {string} dateStr - Date in M/D/YYYY format
   * @returns {string} Date in YYYY-MM-DD format
   */
  convertDateFormat(dateStr) {
    const [month, day, year] = dateStr.split('/')
    const paddedMonth = month.padStart(2, '0')
    const paddedDay = day.padStart(2, '0')
    return `${year}-${paddedMonth}-${paddedDay}`
  }

  /**
   * Calculate end time based on start time and duration
   * @param {string} startTime - Start time in HH:MM format
   * @param {number} durationMinutes - Duration in minutes
   * @returns {string} End time in HH:MM format
   */
  calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + durationMinutes

    const endHours = Math.floor(endMinutes / 60) % 24
    const endMins = endMinutes % 60

    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  }

  /**
   * Map answer sheet format to standard format
   * @param {string} answerSheet - Answer sheet description
   * @returns {string} Standardized answer sheet format
   */
  mapAnswerSheet(answerSheet) {
    const normalized = (answerSheet || '').toLowerCase()
    if (normalized.includes('32') && normalized.includes('page')) {
      return '32_pages'
    } else if (normalized.includes('20') && normalized.includes('page')) {
      return '20_pages'
    } else if (normalized.includes('40') && normalized.includes('graph')) {
      return '40_graph'
    } else if (normalized.includes('graph')) {
      return '40_graph'
    } else {
      return '32_pages' // Default
    }
  }

  /**
   * Get statistics about parsed data
   * @param {Array} entries - Parsed entries
   * @returns {Object} Statistics
   */
  getStatistics(entries) {
    const stats = {
      total: entries.length,
      class10th: entries.filter(e => e.subject.class === '10th').length,
      class12th: entries.filter(e => e.subject.class === '12th').length,
      dates: [...new Set(entries.map(e => e.examDate))].length,
      subjects: [...new Set(entries.map(e => e.subject.code))].length
    }

    return stats
  }
}

module.exports = CBSEDatesheetParser
