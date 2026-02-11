const mongoose = require('mongoose')
const createContextModelProxy = require('../tenancy/createContextModelProxy');

const calendarSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true
  },
  dates: [{
    date: {
      type: Date,
      required: true
    },
    dayName: {
      type: String,
      required: true,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    dayNumber: {
      type: Number,
      required: true,
      min: 0,
      max: 6 // 0 = Sunday, 1 = Monday, etc.
    },
    isWeekend: {
      type: Boolean,
      default: false
    },
    isHoliday: {
      type: Boolean,
      default: false
    },
    holidayName: {
      type: String,
      default: null
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Index for faster date lookups
calendarSchema.index({ year: 1, 'dates.date': 1 })

// Method to get day name for a specific date
calendarSchema.methods.getDayForDate = function(date) {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const dateEntry = this.dates.find(d => {
    const calDate = new Date(d.date)
    calDate.setHours(0, 0, 0, 0)
    return calDate.getTime() === targetDate.getTime()
  })
  
  return dateEntry ? dateEntry.dayName : null
}

// Static method to generate calendar for a year
calendarSchema.statics.generateYearCalendar = function(year) {
  const dates = []
  const startDate = new Date(year, 0, 1) // January 1st
  const endDate = new Date(year, 11, 31) // December 31st
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayNumber = date.getDay()
    const dayName = dayNames[dayNumber]
    const isWeekend = dayNumber === 0 || dayNumber === 6 // Sunday or Saturday
    
    dates.push({
      date: new Date(date),
      dayName,
      dayNumber,
      isWeekend
    })
  }
  
  return dates
}

module.exports = createContextModelProxy('Calendar', calendarSchema)
