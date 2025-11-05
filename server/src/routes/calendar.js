const express = require('express')
const router = express.Router()
const calendarController = require('../controllers/calendarController')
const auth = require('../middleware/auth')

// Get current year calendar
router.get('/current', auth, calendarController.getCurrentYearCalendar)

// Get specific year calendar
router.get('/year/:year', auth, calendarController.getYearCalendar)

// Get day name for a specific date
router.get('/day/:date', auth, calendarController.getDayForDate)

// Get days for multiple dates
router.post('/days', auth, calendarController.getDaysForDates)

// Update holidays
router.put('/holidays', auth, calendarController.updateHolidays)

module.exports = router