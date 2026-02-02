/**
 * Test script to verify day names are returned by the API
 */

const mongoose = require('mongoose')
require('dotenv').config()

const CBSEDatesheet = require('./src/models/CBSEDatesheet')

async function testDayNamesAPI() {
  try {
    console.log('🔄 Connecting to database...')
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examination_management_system')
    console.log('✅ Connected to database\n')

    // Get active CBSE datesheet
    const cbseDatesheet = await CBSEDatesheet.getActive()
    
    if (!cbseDatesheet) {
      console.log('❌ No CBSE datesheet found')
      return
    }
    
    console.log(`📄 Found datesheet: ${cbseDatesheet.title}`)
    console.log(`   Total entries: ${cbseDatesheet.entries.length}\n`)
    
    // Check first 10 entries for day names
    console.log('📋 Checking day names in first 10 entries:\n')
    
    cbseDatesheet.entries.slice(0, 10).forEach((entry, index) => {
      const date = new Date(entry.examDate)
      const formattedDate = date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
      
      console.log(`${index + 1}. ${formattedDate}`)
      console.log(`   Day Name: ${entry.dayName || 'MISSING'}`)
      console.log(`   Subject: ${entry.subject.code} - ${entry.subject.name}`)
      console.log(`   Class: ${entry.subject.class}\n`)
    })
    
    // Check if any entries are missing day names
    const missingDayNames = cbseDatesheet.entries.filter(e => !e.dayName)
    
    if (missingDayNames.length > 0) {
      console.log(`⚠️  WARNING: ${missingDayNames.length} entries are missing day names`)
    } else {
      console.log(`✅ All ${cbseDatesheet.entries.length} entries have day names`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n👋 Database connection closed')
    process.exit(0)
  }
}

testDayNamesAPI()
