const Calendar = require('../models/Calendar')

/**
 * Initialize calendar for current year if it doesn't exist
 */
const initializeCurrentYearCalendar = async () => {
  try {
    const currentYear = new Date().getFullYear()
    
    // Check if Calendar model is available
    if (!Calendar) {
      throw new Error('Calendar model not available')
    }
    
    // Check if calendar already exists for current year
    const existingCalendar = await Calendar.findOne({ year: currentYear })
    
    if (existingCalendar) {
      console.log(`📅 Calendar for year ${currentYear} already exists (${existingCalendar.dates.length} dates)`)
      return existingCalendar
    }
    
    console.log(`📅 Generating calendar for year ${currentYear}...`)
    
    // Generate calendar dates for the year
    const dates = Calendar.generateYearCalendar(currentYear)
    
    if (!dates || dates.length === 0) {
      throw new Error('Failed to generate calendar dates')
    }
    
    // Create new calendar
    const calendar = new Calendar({
      year: currentYear,
      dates
    })
    
    await calendar.save()
    
    console.log(`📅 Calendar for year ${currentYear} created successfully with ${dates.length} dates`)
    return calendar
    
  } catch (error) {
    console.error('❌ Error initializing calendar:', error.message)
    // Don't throw the error, just log it to prevent server crash
    return null
  }
}

/**
 * Initialize calendars for multiple years
 */
const initializeMultipleYears = async (startYear, endYear) => {
  try {
    const results = []
    
    for (let year = startYear; year <= endYear; year++) {
      const existingCalendar = await Calendar.findOne({ year })
      
      if (!existingCalendar) {
        console.log(`Generating calendar for year ${year}...`)
        
        const dates = Calendar.generateYearCalendar(year)
        const calendar = new Calendar({
          year,
          dates
        })
        
        await calendar.save()
        results.push(calendar)
        console.log(`Calendar for year ${year} created successfully`)
      } else {
        console.log(`Calendar for year ${year} already exists`)
        results.push(existingCalendar)
      }
    }
    
    return results
  } catch (error) {
    console.error('Error initializing multiple year calendars:', error)
    throw error
  }
}

/**
 * Add common holidays to a calendar
 */
const addCommonHolidays = async (year, holidays = []) => {
  try {
    const calendar = await Calendar.findOne({ year })
    
    if (!calendar) {
      throw new Error(`Calendar for year ${year} not found`)
    }
    
    // Default holidays (can be customized)
    const defaultHolidays = [
      { month: 0, day: 1, name: "New Year's Day" }, // January 1
      { month: 7, day: 15, name: "Independence Day" }, // August 15
      { month: 9, day: 2, name: "Gandhi Jayanti" }, // October 2
      { month: 11, day: 25, name: "Christmas Day" }, // December 25
      ...holidays
    ]
    
    for (const holiday of defaultHolidays) {
      const holidayDate = new Date(year, holiday.month, holiday.day)
      holidayDate.setHours(0, 0, 0, 0)
      
      const dateEntry = calendar.dates.find(d => {
        const calDate = new Date(d.date)
        calDate.setHours(0, 0, 0, 0)
        return calDate.getTime() === holidayDate.getTime()
      })
      
      if (dateEntry) {
        dateEntry.isHoliday = true
        dateEntry.holidayName = holiday.name
      }
    }
    
    await calendar.save()
    console.log(`Added ${defaultHolidays.length} holidays to calendar for year ${year}`)
    
    return calendar
  } catch (error) {
    console.error('Error adding holidays:', error)
    throw error
  }
}

/**
 * Get day name for a date (utility function)
 */
const getDayNameForDate = async (date) => {
  try {
    const targetDate = new Date(date)
    const year = targetDate.getFullYear()
    
    let calendar = await Calendar.findOne({ year })
    
    if (!calendar) {
      // Auto-generate calendar if it doesn't exist
      const dates = Calendar.generateYearCalendar(year)
      calendar = new Calendar({
        year,
        dates
      })
      await calendar.save()
    }
    
    return calendar.getDayForDate(targetDate)
  } catch (error) {
    console.error('Error getting day name for date:', error)
    return null
  }
}

module.exports = {
  initializeCurrentYearCalendar,
  initializeMultipleYears,
  addCommonHolidays,
  getDayNameForDate
}