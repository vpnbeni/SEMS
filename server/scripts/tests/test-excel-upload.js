const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

async function testExcelUpload() {
  try {
    console.log('🧪 Testing Excel Upload...\n')
    
    const excelPath = path.join(__dirname, '../client/public/Answer Sheets.xlsx')
    
    if (!fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found at:', excelPath)
      return
    }
    
    console.log('📂 Reading file from:', excelPath)
    
    // Create form data
    const formData = new FormData()
    formData.append('file', fs.createReadStream(excelPath))
    
    console.log('📤 Uploading to server...')
    
    // Upload to server
    const response = await axios.post('http://localhost:5000/api/answersheets/upload/excel', formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })
    
    console.log('\n✅ Upload Response:')
    console.log(JSON.stringify(response.data, null, 2))
    
    if (response.data.success) {
      console.log('\n📊 Summary:')
      console.log(`  Created: ${response.data.data.created}`)
      console.log(`  Failed: ${response.data.data.failed}`)
      console.log(`  Skipped: ${response.data.data.skipped}`)
      console.log(`  Total: ${response.data.data.total}`)
      
      if (response.data.data.entries && response.data.data.entries.length > 0) {
        console.log('\n📝 Created Entries:')
        response.data.data.entries.forEach((entry, idx) => {
          console.log(`  ${idx + 1}. ${entry.answerSheetType} (${entry.class}) - ${entry.serialFrom} to ${entry.serialTo} = ${entry.total} sheets`)
        })
      }
      
      if (response.data.data.skippedEntries && response.data.data.skippedEntries.length > 0) {
        console.log('\n⚠️  Skipped Entries:')
        response.data.data.skippedEntries.forEach((entry, idx) => {
          console.log(`  ${idx + 1}. ${entry.type} - ${entry.reason}`)
        })
      }
      
      if (response.data.data.errors && response.data.data.errors.length > 0) {
        console.log('\n❌ Errors:')
        response.data.data.errors.forEach((error, idx) => {
          console.log(`  ${idx + 1}. ${error.entry.answerSheetType} - ${error.error}`)
        })
      }
    }
    
  } catch (error) {
    console.error('\n❌ Upload Failed:')
    if (error.response) {
      console.error('  Status:', error.response.status)
      console.error('  Data:', error.response.data)
    } else {
      console.error('  Error:', error.message)
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:5000/api/answersheets')
    return true
  } catch (error) {
    return false
  }
}

async function main() {
  const serverRunning = await checkServer()
  
  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:5000')
    console.log('💡 Please start the server first with: npm run dev')
    return
  }
  
  console.log('✅ Server is running\n')
  await testExcelUpload()
}

main()
