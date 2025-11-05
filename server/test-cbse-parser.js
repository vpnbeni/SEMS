const fs = require('fs')
const path = require('path')
const CBSEDatesheetParser = require('./src/utils/cbseDatesheetParser')

const testCBSEParser = async () => {
  try {
    console.log('🧪 Testing CBSE Datesheet Parser...\n')
    
    const pdfPath = path.join(__dirname, '../client/src/public/CBSE Full Datesheet.pdf')
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ CBSE Full Datesheet.pdf not found')
      return
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath)
    const parser = new CBSEDatesheetParser()
    
    console.log('📄 Parsing CBSE datesheet...')
    const result = await parser.parsePDF(pdfBuffer)
    
    if (result.success) {
      console.log('✅ Parsing successful!')
      console.log(`📊 Found ${result.data.count} exam entries`)
      
      // Show statistics
      const stats = parser.getStatistics(result.data.entries)
      console.log('\n📈 Statistics:')
      console.log(`   Total entries: ${stats.total}`)
      console.log(`   Class 10th: ${stats.class10th}`)
      console.log(`   Class 12th: ${stats.class12th}`)
      console.log(`   Unique dates: ${stats.dates}`)
      console.log(`   Unique subjects: ${stats.subjects}`)
      
      // Show first 10 entries
      console.log('\n📋 First 10 entries:')
      result.data.entries.slice(0, 10).forEach((entry, index) => {
        console.log(`${(index + 1).toString().padStart(2, '0')}. ${entry.examDate} | ${entry.subject.code} | ${entry.subject.name} | ${entry.subject.class} | ${entry.subject.duration}h`)
      })
      
      // Show date range
      const dates = result.data.entries.map(e => e.examDate).sort()
      console.log(`\n📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`)
      
      // Show subjects by class
      console.log('\n📚 Subjects by class:')
      const class10Subjects = result.data.entries.filter(e => e.subject.class === '10th')
      const class12Subjects = result.data.entries.filter(e => e.subject.class === '12th')
      
      console.log(`   Class 10th: ${class10Subjects.length} subjects`)
      console.log(`   Class 12th: ${class12Subjects.length} subjects`)
      
    } else {
      console.error('❌ Parsing failed:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testCBSEParser()