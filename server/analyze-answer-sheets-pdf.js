const fs = require('fs')
const path = require('path')
const pdf = require('pdf-parse')

async function analyzeAnswerSheetsPDF() {
  try {
    console.log('📄 Analyzing Answer Sheets PDF...\n')
    
    // Read the PDF file
    const pdfPath = path.join(__dirname, '../client/src/Answer Sheets.pdf')
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found at:', pdfPath)
      return
    }
    
    const dataBuffer = fs.readFileSync(pdfPath)
    console.log(`✅ PDF file loaded: ${(dataBuffer.length / 1024).toFixed(2)} KB\n`)
    
    // Parse PDF
    const data = await pdf(dataBuffer)
    
    console.log('📊 PDF Information:')
    console.log(`   Pages: ${data.numpages}`)
    console.log(`   Text Length: ${data.text.length} characters\n`)
    
    console.log('📝 Raw Text Content:')
    console.log('=' .repeat(80))
    console.log(data.text)
    console.log('='.repeat(80))
    
    // Analyze line by line
    const lines = data.text.split('\n').filter(line => line.trim().length > 0)
    console.log(`\n📋 Total Lines: ${lines.length}\n`)
    
    console.log('🔍 Line-by-Line Analysis:')
    lines.forEach((line, index) => {
      console.log(`Line ${index + 1}: "${line.trim()}"`)
    })
    
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error)
  }
}

// Run the analysis
analyzeAnswerSheetsPDF()
