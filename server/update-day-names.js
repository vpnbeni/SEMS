/**
 * Script to update existing datesheet entries with day names
 * Run this once to fix existing data
 */

const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const CBSEDatesheet = require('./src/models/CBSEDatesheet')

// Function to get day name from date
function getDayName(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dateObj.getDay()]
}

async function updateDayNames() {
  try {
    console.log('🔄 Connecting to database...')
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examination_management_system')
    console.log('✅ Connected to database')

    console.log('\n📄 Fetching CBSE datesheets...')
    const datesheets = await CBSEDatesheet.find({})
    console.log(`Found ${datesheets.length} datesheet(s)`)

    let totalUpdated = 0

    for (const datesheet of datesheets) {
      console.log(`\n📋 Processing datesheet: ${datesheet.title}`)
      console.log(`   Total entries: ${datesheet.entries.length}`)
      
      let updatedCount = 0
      
      // Update each entry with day name
      datesheet.entries.forEach(entry => {
        if (entry.examDate) {
          const dayName = getDayName(entry.examDate)
          if (entry.dayName !== dayName) {
            entry.dayName = dayName
            updatedCount++
          }
        }
      })
      
      if (updatedCount > 0) {
        await datesheet.save()
        console.log(`   ✅ Updated ${updatedCount} entries with day names`)
        totalUpdated += updatedCount
      } else {
        console.log(`   ℹ️  All entries already have day names`)
      }
    }

    console.log(`\n✅ Successfully updated ${totalUpdated} total entries`)
    console.log('\n🔍 Verifying updates...')
    
    // Verify the updates
    const verifyDatesheet = await CBSEDatesheet.findOne({})
    if (verifyDatesheet && verifyDatesheet.entries.length > 0) {
      console.log('\nSample entries:')
      verifyDatesheet.entries.slice(0, 5).forEach((entry, index) => {
        const date = new Date(entry.examDate).toLocaleDateString('en-IN')
        console.log(`   ${index + 1}. ${date} - ${entry.dayName} - ${entry.subject.name}`)
      })
    }

    console.log('\n✅ Update complete!')
    
  } catch (error) {
    console.error('❌ Error updating day names:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n👋 Database connection closed')
    process.exit(0)
  }
}

// Run the update
updateDayNames()
