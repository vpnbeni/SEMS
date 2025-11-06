const pdf = require('pdf-parse')

/**
 * Parse Answer Sheets PDF format
 * Format: Sr No | Type | Pages | Class | Colour | Suffix | From | To
 * Example: 1Main3210RedO
 */
class AnswerSheetsParser {
  
  /**
   * Parse Answer Sheets PDF buffer
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Object>} Parsed answer sheets data
   */
  async parsePDF(pdfBuffer) {
    try {
      console.log('📄 Parsing Answer Sheets PDF...')
      
      const data = await pdf(pdfBuffer)
      console.log(`📊 Extracted ${data.text.length} characters from ${data.numpages} pages`)
      
      const entries = this.parseTextContent(data.text)
      
      return {
        success: true,
        data: {
          entries,
          count: entries.length,
          source: 'Answer Sheets Specification',
          format: 'Standard Format'
        }
      }
      
    } catch (error) {
      console.error('❌ Error parsing answer sheets:', error)
      return {
        success: false,
        error: error.message,
        data: { entries: [], count: 0 }
      }
    }
  }
  
  /**
   * Parse text content and extract answer sheet entries
   * @param {string} text - Raw text from PDF
   * @returns {Array} Array of parsed answer sheet entries
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
      
      // Try to parse as answer sheet entry
      const entry = this.parseAnswerSheetEntry(line)
      if (entry) {
        entries.push(entry)
      }
    }
    
    console.log(`✅ Successfully parsed ${entries.length} answer sheet entries`)
    return entries
  }
  
  /**
   * Check if line is a header line
   * @param {string} line - Line to check
   * @returns {boolean} True if header line
   */
  isHeaderLine(line) {
    const headerPatterns = [
      /^Sr\s*No.*Type.*Pages.*Class/i,
      /^=+$/,
      /^-+$/,
      /^\s*$/
    ]
    
    return headerPatterns.some(pattern => pattern.test(line))
  }
  
  /**
   * Parse individual answer sheet entry line
   * @param {string} line - Line to parse
   * @returns {Object|null} Parsed entry or null if invalid
   */
  parseAnswerSheetEntry(line) {
    try {
      // Format: SrNoTypePagesClassColourSuffixFromTo
      // Example: 1Main3210RedO
      // Example: 7Supplementary1610YellowG
      // Example: 9for BLIND3210RedB
      
      // Extract serial number at the start
      const srNoMatch = line.match(/^(\d+)/)
      if (!srNoMatch) {
        return null
      }
      
      const srNo = parseInt(srNoMatch[1])
      let remainingText = line.substring(srNoMatch[0].length)
      
      // Extract type (Main, Graph, Supplementary, for BLIND, Sheets)
      let answerSheetType = ''
      if (remainingText.startsWith('Main')) {
        answerSheetType = 'Main'
        remainingText = remainingText.substring(4)
      } else if (remainingText.startsWith('Graph')) {
        answerSheetType = 'Graph'
        remainingText = remainingText.substring(5)
      } else if (remainingText.startsWith('Supplementary')) {
        answerSheetType = 'Supplementary'
        remainingText = remainingText.substring(13)
      } else if (remainingText.startsWith('for BLIND')) {
        answerSheetType = 'For Blind'
        remainingText = remainingText.substring(9)
      } else if (remainingText.startsWith('Drawing Sheets')) {
        answerSheetType = 'Drawing Sheets'
        remainingText = remainingText.substring(14)
      } else if (remainingText.startsWith('Sheets')) {
        answerSheetType = 'Drawing Sheets'
        remainingText = remainingText.substring(6)
      } else {
        return null
      }
      
      // Extract pages (2 digits)
      const pagesMatch = remainingText.match(/^(\d{1,2})/)
      if (!pagesMatch) {
        return null
      }
      
      const pages = parseInt(pagesMatch[1])
      remainingText = remainingText.substring(pagesMatch[0].length)
      
      // Extract class (10 or 12)
      const classMatch = remainingText.match(/^(\d{1,2})/)
      if (!classMatch) {
        return null
      }
      
      const classLevel = classMatch[1]
      remainingText = remainingText.substring(classMatch[0].length)
      
      // Extract colour (Red, Blue, Yellow, Pink, White)
      let colour = ''
      const colourPatterns = [
        { pattern: 'Red', value: 'Red' },
        { pattern: 'Blue', value: 'Blue' },
        { pattern: 'Yellow', value: 'Yellow' },
        { pattern: 'Pink', value: 'Pink' },
        { pattern: 'White', value: 'White' }
      ]
      
      for (const { pattern, value } of colourPatterns) {
        if (remainingText.startsWith(pattern)) {
          colour = value
          remainingText = remainingText.substring(pattern.length)
          break
        }
      }
      
      if (!colour) {
        return null
      }
      
      // Extract suffix (single letter)
      const suffixMatch = remainingText.match(/^([A-Z])/)
      const suffix = suffixMatch ? suffixMatch[1] : ''
      
      const entry = {
        srNo,
        answerSheetType,
        pages,
        colour,
        class: classLevel,
        suffix,
        // These will be filled when receiving actual sheets
        serialFrom: null,
        serialTo: null,
        total: 0
      }
      
      return entry
      
    } catch (error) {
      console.warn(`⚠️  Failed to parse line: "${line}" - ${error.message}`)
      return null
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
      class10: entries.filter(e => e.class === '10').length,
      class12: entries.filter(e => e.class === '12').length,
      byType: {},
      byColour: {}
    }
    
    // Count by type
    entries.forEach(entry => {
      stats.byType[entry.answerSheetType] = (stats.byType[entry.answerSheetType] || 0) + 1
      stats.byColour[entry.colour] = (stats.byColour[entry.colour] || 0) + 1
    })
    
    return stats
  }
}

module.exports = AnswerSheetsParser
