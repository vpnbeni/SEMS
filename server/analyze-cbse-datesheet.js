const fs = require('fs')
const path = require('path')
const pdf = require('pdf-parse')

// Analyze CBSE Full Datesheet PDF
const analyzeCBSEDatesheet = async () => {
  try {
    console.log('📄 Analyzing CBSE Full Datesheet PDF...\n')
    
    const pdfPath = path.join(__dirname, '../client/src/public/CBSE Full Datesheet.pdf')
    console.log('📁 Looking for PDF at:', pdfPath)
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ CBSE Full Datesheet.pdf not found at:', pdfPath)
      return
    }
    
    const dataBuffer = fs.readFileSync(pdfPath)
    const data = await pdf(dataBuffer)
    
    console.log('📊 PDF Analysis Results:')
    console.log('='.repeat(50))
    console.log(`📄 Pages: ${data.numpages}`)
    console.log(`📝 Text Length: ${data.text.length} characters`)
    console.log('='.repeat(50))
    
    console.log('\n📝 Raw Text Content:')
    console.log('-'.repeat(50))
    console.log(data.text)
    console.log('-'.repeat(50))
    
    // Analyze the structure
    console.log('\n🔍 Structure Analysis:')
    console.log('-'.repeat(30))
    
    const lines = data.text.split('\n').filter(line => line.trim().length > 0)
    console.log(`📋 Total non-empty lines: ${lines.length}`)
    
    console.log('\n📋 Line-by-line breakdown:')
    lines.forEach((line, index) => {
      console.log(`${(index + 1).toString().padStart(3, '0')}: ${line.trim()}`)
    })
    
    // Look for date patterns
    console.log('\n📅 Date Pattern Analysis:')
    console.log('-'.repeat(30))
    
    const datePatterns = [
      /\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b.*\d{1,2}.*\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b.*\d{4}/i,
      /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}/,
      /\d{1,2}\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{4}/i
    ]
    
    lines.forEach((line, index) => {
      datePatterns.forEach((pattern, patternIndex) => {
        if (pattern.test(line)) {
          console.log(`📅 Date found (Pattern ${patternIndex + 1}) on line ${index + 1}: ${line.trim()}`)
        }
      })
    })
    
    // Look for time patterns
    console.log('\n⏰ Time Pattern Analysis:')
    console.log('-'.repeat(30))
    
    const timePatterns = [
      /\d{1,2}:\d{2}\s*(AM|PM)/i,
      /\d{1,2}\.\d{2}\s*(AM|PM)/i,
      /\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/i
    ]
    
    lines.forEach((line, index) => {
      timePatterns.forEach((pattern, patternIndex) => {
        if (pattern.test(line)) {
          console.log(`⏰ Time found (Pattern ${patternIndex + 1}) on line ${index + 1}: ${line.trim()}`)
        }
      })
    })
    
    // Look for subject code patterns
    console.log('\n📚 Subject Code Pattern Analysis:')
    console.log('-'.repeat(30))
    
    const subjectCodePatterns = [
      /\b\d{3}\b/,  // 3-digit codes
      /\b\d{2}\b/,  // 2-digit codes
      /\b[A-Z]{2,4}\d{2,3}\b/i  // Letter-number combinations
    ]
    
    lines.forEach((line, index) => {
      subjectCodePatterns.forEach((pattern, patternIndex) => {
        const matches = line.match(pattern)
        if (matches) {
          console.log(`📚 Subject code found (Pattern ${patternIndex + 1}) on line ${index + 1}: ${matches[0]} in "${line.trim()}"`)
        }
      })
    })
    
    // Generate parsing suggestions
    console.log('\n💡 Parsing Suggestions:')
    console.log('-'.repeat(30))
    
    if (lines.length > 0) {
      console.log('Based on the analysis, here are the recommended parsing patterns:')
      
      // Check if it's a structured format
      const hasDateHeaders = lines.some(line => 
        /\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/i.test(line)
      )
      
      const hasTimeEntries = lines.some(line => 
        /\d{1,2}:\d{2}\s*(AM|PM)/i.test(line)
      )
      
      if (hasDateHeaders) {
        console.log('✅ Format appears to use day-based headers')
      }
      
      if (hasTimeEntries) {
        console.log('✅ Format includes time information')
      }
      
      // Suggest regex patterns
      console.log('\n🔧 Suggested Regex Patterns:')
      console.log('Date header:', '/\\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\\b.*\\d{1,2}.*\\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\\b.*\\d{4}/i')
      console.log('Time entry:', '/\\d{1,2}:\\d{2}\\s*(AM|PM)\\s*-\\s*\\d{1,2}:\\d{2}\\s*(AM|PM)/i')
      console.log('Subject code:', '/\\b\\d{3}\\b/')
    }
    
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the analysis
analyzeCBSEDatesheet()