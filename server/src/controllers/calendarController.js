const Calendar = require('../models/Calendar')

// Get or create calendar for current year
const getCurrentYearCalendar = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear()
    
    let calendar = await Calendar.findOne({ year: currentYear })
    
    if (!calendar) {
      // Generate calendar for current year
      const dates = Calendar.generateYearCalendar(currentYear)
      
      if (!dates || dates.length === 0) {
        throw new Error('Failed to generate calendar dates')
      }
      
      calendar = new Calendar({
        year: currentYear,
        dates
      })
      
      await calendar.save()
      console.log(`📅 Created new calendar for year ${currentYear}`)
    }
    
    res.json({
      success: true,
      data: calendar
    })
  } catch (error) {
    console.error('Error getting current year calendar:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get calendar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
}

// Get calendar for specific year
const getYearCalendar = async (req, res) => {
  try {
    const { year } = req.params
    const yearNum = parseInt(year)
    
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year provided'
      })
    }
    
    let calendar = await Calendar.findOne({ year: yearNum })
    
    if (!calendar) {
      // Generate calendar for requested year
      const dates = Calendar.generateYearCalendar(yearNum)
      
      calendar = new Calendar({
        year: yearNum,
        dates
      })
      
      await calendar.save()
    }
    
    res.json({
      success: true,
      data: calendar
    })
  } catch (error) {
    console.error('Error getting year calendar:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get calendar',
      error: error.message
    })
  }
}

// Get day name for a specific date
const getDayForDate = async (req, res) => {
  try {
    const { date } = req.params
    const targetDate = new Date(date)
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      })
    }
    
    const year = targetDate.getFullYear()
    let calendar = await Calendar.findOne({ year })
    
    if (!calendar) {
      // Generate calendar for the year if it doesn't exist
      const dates = Calendar.generateYearCalendar(year)
      
      calendar = new Calendar({
        year,
        dates
      })
      
      await calendar.save()
    }
    
    const dayName = calendar.getDayForDate(targetDate)
    
    if (!dayName) {
      return res.status(404).json({
        success: false,
        message: 'Date not found in calendar'
      })
    }
    
    res.json({
      success: true,
      data: {
        date: targetDate,
        dayName,
        year
      }
    })
  } catch (error) {
    console.error('Error getting day for date:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get day for date',
      error: error.message
    })
  }
}

// Get multiple days for multiple dates
const getDaysForDates = async (req, res) => {
  try {
    const { dates } = req.body
    
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dates array is required'
      })
    }
    
    const results = []
    const yearCalendars = new Map()
    
    for (const dateStr of dates) {
      const targetDate = new Date(dateStr)
      
      if (isNaN(targetDate.getTime())) {
        results.push({
          date: dateStr,
          dayName: null,
          error: 'Invalid date format'
        })
        continue
      }
      
      const year = targetDate.getFullYear()
      
      // Get or create calendar for this year
      if (!yearCalendars.has(year)) {
        let calendar = await Calendar.findOne({ year })
        
        if (!calendar) {
          const calendarDates = Calendar.generateYearCalendar(year)
          calendar = new Calendar({
            year,
            dates: calendarDates
          })
          await calendar.save()
        }
        
        yearCalendars.set(year, calendar)
      }
      
      const calendar = yearCalendars.get(year)
      const dayName = calendar.getDayForDate(targetDate)
      
      results.push({
        date: targetDate,
        dayName,
        year
      })
    }
    
    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Error getting days for dates:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get days for dates',
      error: error.message
    })
  }
}

// Update holiday information for specific dates
const updateHolidays = async (req, res) => {
  try {
    const { year, holidays } = req.body
    
    if (!year || !Array.isArray(holidays)) {
      return res.status(400).json({
        success: false,
        message: 'Year and holidays array are required'
      })
    }
    
    let calendar = await Calendar.findOne({ year })
    
    if (!calendar) {
      return res.status(404).json({
        success: false,
        message: 'Calendar not found for the specified year'
      })
    }
    
    // Update holiday information
    for (const holiday of holidays) {
      const { date, holidayName, isHoliday = true } = holiday
      const targetDate = new Date(date)
      
      if (isNaN(targetDate.getTime())) continue
      
      targetDate.setHours(0, 0, 0, 0)
      
      const dateEntry = calendar.dates.find(d => {
        const calDate = new Date(d.date)
        calDate.setHours(0, 0, 0, 0)
        return calDate.getTime() === targetDate.getTime()
      })
      
      if (dateEntry) {
        dateEntry.isHoliday = isHoliday
        dateEntry.holidayName = holidayName || null
      }
    }
    
    await calendar.save()
    
    res.json({
      success: true,
      message: 'Holidays updated successfully',
      data: calendar
    })
  } catch (error) {
    console.error('Error updating holidays:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update holidays',
      error: error.message
    })
  }
}

module.exports = {
  getCurrentYearCalendar,
  getYearCalendar,
  getDayForDate,
  getDaysForDates,
  updateHolidays
}