/**
 * Calendar day-of-week display metadata.
 * Sunday is always shown in red across ACTVT calendars.
 */

export const CALENDAR_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export type CalendarWeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** dayIndex: 0 = Sunday … 6 = Saturday (JS Date.getDay()) */
export const CALENDAR_WEEKDAY_TEXT_COLORS: Record<CalendarWeekdayIndex, string> = {
  0: '#dc2626', // Sunday — always red
  1: '#64748b',
  2: '#64748b',
  3: '#64748b',
  4: '#64748b',
  5: '#64748b',
  6: '#64748b',
}

export const SUNDAY_WEEKDAY_INDEX: CalendarWeekdayIndex = 0

export const getCalendarWeekdayTextColor = (dayIndex: number) => {
  const key = (((dayIndex % 7) + 7) % 7) as CalendarWeekdayIndex
  return CALENDAR_WEEKDAY_TEXT_COLORS[key]
}

export const isCalendarSunday = (dayIndex: number) =>
  (((dayIndex % 7) + 7) % 7) === SUNDAY_WEEKDAY_INDEX

/** Prefer dateKey (YYYY-MM-DD) when available; falls back to weekday index. */
export const getCalendarDateTextColor = (dateKey = '', weekdayIndex?: number) => {
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [year, month, day] = dateKey.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    if (!Number.isNaN(date.getTime())) {
      return getCalendarWeekdayTextColor(date.getDay())
    }
  }
  if (typeof weekdayIndex === 'number') {
    return getCalendarWeekdayTextColor(weekdayIndex)
  }
  return CALENDAR_WEEKDAY_TEXT_COLORS[1]
}
