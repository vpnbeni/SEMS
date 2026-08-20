import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import api from '@/services/api'
import {
  CALENDAR_WEEKDAY_LABELS,
  getCalendarDateTextColor,
  getCalendarWeekdayTextColor,
} from '@/constants/calendarDayMetadata'

type ActivityEvent = {
  _id?: string
  title?: string
  date?: string
  monthKey?: string
  scopeType?: string
  houseName?: string
  clubName?: string
  venue?: string
  incharge?: string
  description?: string
  status?: string
}

type EventForm = {
  title: string
  date: string
  scopeType: string
  houseName: string
  clubName: string
  venue: string
  incharge: string
  description: string
  status: string
}

const emptyForm = (date = ''): EventForm => ({
  title: '',
  date,
  scopeType: 'school',
  houseName: '',
  clubName: '',
  venue: '',
  incharge: '',
  description: '',
  status: 'planned',
})

const monthKeyFromDate = (value: string) => {
  if (!value || value.length < 7) return ''
  return value.slice(0, 7)
}

const formatMonthLabel = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const textareaClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const STATUS_TONE: Record<string, string> = {
  planned: 'bg-sky-50 text-sky-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
}

const ActvtCalendar: React.FC = () => {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  )
  const [form, setForm] = useState<EventForm>(emptyForm(selectedDate))
  const [editingId, setEditingId] = useState('')

  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`

  const load = async () => {
    setLoading(true)
    try {
      const response = await api.get('/actvt/events')
      setEvents((response.data?.data || []) as ActivityEvent[])
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load activities.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const monthEvents = useMemo(
    () =>
      events
        .filter((item) => {
          const key = item.monthKey || monthKeyFromDate(String(item.date || ''))
          return key === monthKey
        })
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [events, monthKey]
  )

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>()
    monthEvents.forEach((item) => {
      const key = String(item.date || '')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return map
  }, [monthEvents])

  const calendarCells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const cells: Array<{ day: number | null; dateKey: string }> = []
    for (let i = 0; i < startPad; i += 1) cells.push({ day: null, dateKey: '' })
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`
      cells.push({ day, dateKey })
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, dateKey: '' })
    return cells
  }, [cursor.year, cursor.month, monthKey])

  const resetForm = (date = selectedDate) => {
    setEditingId('')
    setForm(emptyForm(date))
  }

  const handleDayClick = (dateKey: string) => {
    if (!dateKey) return
    setSelectedDate(dateKey)
    resetForm(dateKey)
  }

  const handleEdit = (item: ActivityEvent) => {
    setEditingId(String(item._id || ''))
    setSelectedDate(String(item.date || selectedDate))
    setForm({
      title: String(item.title || ''),
      date: String(item.date || selectedDate),
      scopeType: String(item.scopeType || 'school'),
      houseName: String(item.houseName || ''),
      clubName: String(item.clubName || ''),
      venue: String(item.venue || ''),
      incharge: String(item.incharge || ''),
      description: String(item.description || ''),
      status: String(item.status || 'planned'),
    })
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error('Activity title is required.')
      return
    }
    if (!form.date) {
      toast.error('Please choose a date.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        monthKey: monthKeyFromDate(form.date),
        houseName: form.scopeType === 'house' ? form.houseName.trim() : '',
        clubName: form.scopeType === 'club' ? form.clubName.trim() : '',
      }

      if (editingId) {
        await api.put(`/actvt/events/${editingId}`, payload)
        toast.success('Activity updated.')
      } else {
        await api.post('/actvt/events', payload)
        toast.success('Activity planned.')
      }
      resetForm(form.date)
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save activity.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item: ActivityEvent) => {
    if (!item._id || !window.confirm(`Remove activity "${item.title || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/events/${item._id}`)
      toast.success('Activity removed.')
      if (editingId === item._id) resetForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove activity.'))
    }
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <div className="p-6">
      <div className="mx-auto grid max-w-[1400px] gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">{formatMonthLabel(cursor.year, cursor.month)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shiftMonth(-1)} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Today
              </button>
              <button type="button" onClick={() => shiftMonth(1)} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide">
            {CALENDAR_WEEKDAY_LABELS.map((day, index) => (
              <div key={day} className="py-1" style={{ color: getCalendarWeekdayTextColor(index) }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) => {
              if (!cell.day) return <div key={`empty-${index}`} className="min-h-[78px] rounded-xl bg-slate-50/50" />
              const dayEvents = eventsByDate.get(cell.dateKey) || []
              const selected = cell.dateKey === selectedDate
              const dayTextColor = getCalendarDateTextColor(cell.dateKey, index % 7)
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => handleDayClick(cell.dateKey)}
                  className={`min-h-[78px] rounded-xl border p-2 text-left transition ${
                    selected
                      ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold" style={{ color: dayTextColor }}>{cell.day}</div>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((item) => (
                      <div key={item._id} className="truncate rounded bg-indigo-100 px-1 py-0.5 text-[10px] font-medium text-indigo-700">
                        {item.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 ? (
                      <div className="text-[10px] text-slate-400">+{dayEvents.length - 2} more</div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <div className="space-y-6">
          <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit activity' : 'Plan activity'}</h3>
            </div>

            <div className="grid gap-3">
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Title</span>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Inter-house Debate" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Date</span>
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Status</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Scope</span>
                <select value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })} className={inputClass}>
                  <option value="school">Whole school</option>
                  <option value="house">House</option>
                  <option value="club">Club</option>
                </select>
              </label>
              {form.scopeType === 'house' ? (
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">House</span>
                  <input value={form.houseName} onChange={(e) => setForm({ ...form, houseName: e.target.value })} className={inputClass} placeholder="House name" />
                </label>
              ) : null}
              {form.scopeType === 'club' ? (
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Club</span>
                  <input value={form.clubName} onChange={(e) => setForm({ ...form, clubName: e.target.value })} className={inputClass} placeholder="Club name" />
                </label>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Venue</span>
                  <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={inputClass} />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Incharge</span>
                  <input value={form.incharge} onChange={(e) => setForm({ ...form, incharge: e.target.value })} className={inputClass} />
                </label>
              </div>
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Description</span>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaClass} />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add to calendar'}
                </button>
                {editingId ? (
                  <button type="button" onClick={() => resetForm()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">This month</h3>
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {!loading && monthEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No activities planned for this month yet.</p>
            ) : (
              <div className="space-y-2">
                {monthEvents.map((item) => (
                  <div key={item._id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
                    <button type="button" onClick={() => handleEdit(item)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[item.status || 'planned'] || STATUS_TONE.planned}`}>
                          {item.status || 'planned'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.date || 'No date'}
                        {item.venue ? ` · ${item.venue}` : ''}
                        {item.scopeType === 'house' && item.houseName ? ` · ${item.houseName}` : ''}
                        {item.scopeType === 'club' && item.clubName ? ` · ${item.clubName}` : ''}
                      </p>
                    </button>
                    <button type="button" onClick={() => void handleRemove(item)} className="text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default ActvtCalendar
