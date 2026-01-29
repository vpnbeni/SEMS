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
      const line = lines[i].trim()
      
      // Skip header lines
      if (this.isHeaderLine(line)) {
        continue
      }
      
      // Try to parse as exam entry
      const entry = this.parseExamEntry(line)
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
      // CBSE format: DATE + SubCode + SubjectName + Class + Duration + AnswerSheet
      // Example: 3/2/2026002HINDI COURSE - A10th 332 Pages
      
      // Extract date (M/D/YYYY format)
      const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/)
      if (!dateMatch) {
        return null
      }
      
      const dateStr = dateMatch[1]
      const remainingText = line.substring(dateMatch[0].length)
      
      // Extract subject code (3 digits)
      const codeMatch = remainingText.match(/^(\d{3})/)
      if (!codeMatch) {
        return null
      }
      
      const subjectCode = codeMatch[1]
      let afterCode = remainingText.substring(codeMatch[0].length)
      
      // Extract class (10th or 12th) - look for it at the end part
      const classMatch = afterCode.match(/(10th|12th)/)
      if (!classMatch) {
        return null
      }
      
      const classLevel = classMatch[1]
      const classIndex = afterCode.indexOf(classLevel)
      
      // Subject name is between code and class
      const subjectName = afterCode.substring(0, classIndex).trim()
      
      // Extract duration and answer sheet from after class
      const afterClass = afterCode.substring(classIndex + classLevel.length).trim()
      
      // Duration is typically a single digit (2, 3, 4) followed by answer sheet info
      // The format appears to be: ClassDurationAnswerSheetInfo
      // e.g., "10th 332 Pages" where 3 is duration and 32 Pages is answer sheet
      const durationMatch = afterClass.match(/^(\d)/)
      const duration = durationMatch ? parseInt(durationMatch[1]) : 3 // Default 3 hours
      
      // Extract answer sheet info - skip the first digit (duration) and get the rest
      const answerSheetText = afterClass.substring(1) // Skip duration digit
      const answerSheetMatch = answerSheetText.match(/(\d+)\s*(Pages?|Graph)/)
      let answerSheet = '32 Pages' // Default
      if (answerSheetMatch) {
        const pages = answerSheetMatch[1]
        const type = answerSheetMatch[2]
        answerSheet = `${pages} ${type}`
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
          start: '09:00',
          end: this.calculateEndTime('09:00', duration * 60) // Convert hours to minutes
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
    if (answerSheet.includes('32') && answerSheet.includes('Pages')) {
      return '32_pages'
    } else if (answerSheet.includes('20') && answerSheet.includes('Pages')) {
      return '20_pages'
    } else if (answerSheet.includes('40') && answerSheet.includes('Graph')) {
      return '40_graph'
    } else if (answerSheet.includes('Graph')) {
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