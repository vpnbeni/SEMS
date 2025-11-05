const fs = require('fs')
const path = require('path')
const pdf = require('pdf-parse')

const testPDF = async () => {
  try {
    console.log('Starting PDF analysis...')
    
    const pdfPath = path.join(__dirname, '../client/src/public/CBSE Full Datesheet.pdf')
    console.log('PDF Path:', pdfPath)
    console.log('File exists:', fs.existsSync(pdfPath))
    
    if (!fs.existsSync(pdfPath)) {
      console.log('File not found!')
      return
    }
    
    console.log('Reading PDF...')
    const dataBuffer = fs.readFileSync(pdfPath)
    console.log('Buffer size:', dataBuffer.length)
    
    console.log('Parsing PDF...')
    const data = await pdf(dataBuffer)
    
    console.log('PDF parsed successfully!')
    console.log('Pages:', data.numpages)
    console.log('Text length:', data.text.length)
    console.log('Full text content:')
    console.log('='.repeat(80))
    console.log(data.text)
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testPDF()