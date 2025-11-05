import api from './api'

interface CalendarDate {
  date: string
  dayName: string
  dayNumber: number
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
}

interface Calendar {
  _id: string
  year: number
  dates: CalendarDate[]
  createdAt: string
  updatedAt: string
}

interface DayResponse {
  date: string
  dayName: string
  year: number
}

class CalendarService {
  // Get current year calendar
  async getCurrentYearCalendar(): Promise<Calendar> {
    const response = await api.get('/calendar/current')
    return response.data.data
  }

  // Get specific year calendar
  async getYearCalendar(year: number): Promise<Calendar> {
    const response = await api.get(`/calendar/year/${year}`)
    return response.data.data
  }

  // Get day name for a specific date
  async getDayForDate(date: string): Promise<DayResponse> {
    const response = await api.get(`/calendar/day/${date}`)
    return response.data.data
  }

  // Get days for multiple dates
  async getDaysForDates(dates: string[]): Promise<DayResponse[]> {
    const response = await api.post('/calendar/days', { dates })
    return response.data.data
  }

  // Update holidays for a year
  async updateHolidays(year: number, holidays: Array<{
    date: string
    holidayName?: string
    isHoliday?: boolean
  }>): Promise<Calendar> {
    const response = await api.put('/calendar/holidays', { year, holidays })
    return response.data.data
  }

  // Utility function to get day name from date string (client-side fallback)
  getDayNameFromDate(dateString: string): string {
    const date = new Date(dateString)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[date.getDay()]
  }

  // Format date for API calls
  formatDateForAPI(date: Date | string): string {
    const d = new Date(date)
    return d.toISOString().split('T')[0] // Returns YYYY-MM-DD format
  }

  // Check if a date is weekend
  isWeekend(dateString: string): boolean {
    const date = new Date(dateString)
    const day = date.getDay()
    return day === 0 || day === 6 // Sunday or Saturday
  }

  // Get dates for a month
  getMonthDates(year: number, month: number): string[] {
    const dates: string[] = []
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      dates.push(this.formatDateForAPI(date))
    }
    
    return dates
  }

  // Get working days between two dates (excluding weekends)
  getWorkingDaysBetween(startDate: string, endDate: string): string[] {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const workingDays: string[] = []
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (!this.isWeekend(this.formatDateForAPI(date))) {
        workingDays.push(this.formatDateForAPI(date))
      }
    }
    
    return workingDays
  }
}

export default new CalendarService()