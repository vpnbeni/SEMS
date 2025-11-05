const mongoose = require('mongoose')
require('dotenv').config()

// Import models and utilities
const Calendar = require('./src/models/Calendar')
const { initializeCurrentYearCalendar, getDayNameForDate, addCommonHolidays } = require('./src/utils/calendarSeeder')

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}

// Test calendar functionality
const testCalendar = async () => {
  try {
    console.log('🗓️  Testing Calendar Functionality...\n')
    
    // Initialize current year calendar
    console.log('1. Initializing current year calendar...')
    const calendar = await initializeCurrentYearCalendar()
    console.log(`✅ Calendar created for year ${calendar.year} with ${calendar.dates.length} dates\n`)
    
    // Test getting day for specific dates
    console.log('2. Testing day lookup for specific dates...')
    const testDates = [
      '2024-01-01', // New Year
      '2024-08-15', // Independence Day
      '2024-12-25', // Christmas
      '2024-06-15', // Random date
      '2024-02-29'  // Leap year date (if 2024)
    ]
    
    for (const date of testDates) {
      const dayName = await getDayNameForDate(date)
      console.log(`📅 ${date} -> ${dayName || 'Not found'}`)
    }
    
    console.log('\n3. Adding common holidays...')
    await addCommonHolidays(calendar.year)
    console.log('✅ Holidays added successfully\n')
    
    // Test calendar methods
    console.log('4. Testing calendar methods...')
    const jan1Day = calendar.getDayForDate('2024-01-01')
    console.log(`📅 January 1, 2024 is a ${jan1Day}\n`)
    
    // Show some sample dates from the calendar
    console.log('5. Sample calendar entries:')
    const sampleDates = calendar.dates.slice(0, 10)
    sampleDates.forEach(dateEntry => {
      const date = new Date(dateEntry.date).toLocaleDateString()
      const holiday = dateEntry.isHoliday ? ` (${dateEntry.holidayName})` : ''
      console.log(`📅 ${date} - ${dateEntry.dayName}${holiday}`)
    })
    
    console.log('\n✅ Calendar testing completed successfully!')
    
  } catch (error) {
    console.error('❌ Calendar testing failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('Database connection closed')
  }
}

// Run the test
const runTest = async () => {
  await connectDB()
  await testCalendar()
}

runTest()