import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Medal,
  Plus,
  Scale,
  Search,
  Trash2,
  Trophy,
} from 'lucide-react'
import api from '@/services/api'
import {
  CALENDAR_WEEKDAY_LABELS,
  getCalendarDateTextColor,
  getCalendarWeekdayTextColor,
} from '@/constants/calendarDayMetadata'

type BoardTab = 'overview' | 'calendar' | 'scores' | 'criteria'

type ActivityEvent = {
  _id?: string
  title?: string
  date?: string
  monthKey?: string
  activityType?: string
  scopeType?: string
  houseName?: string
  clubName?: string
  venue?: string
  incharge?: string
  description?: string
  status?: string
  criteriaId?: string
  criteriaTitle?: string
}

type CriteriaRecord = {
  _id?: string
  title?: string
  activityType?: string
  maxMarks?: number
  criteria?: string
  notes?: string
}

type HouseOption = {
  _id?: string
  name?: string
  color?: string
}

type PointsEntry = {
  _id?: string
  title?: string
  date?: string
  houseId?: string
  houseName?: string
  houseColor?: string
  points?: number
  category?: string
  notes?: string
}

type Standing = {
  houseId: string
  houseName: string
  houseColor: string
  totalPoints: number
  entries: number
  rank: number
}

type EventForm = {
  title: string
  date: string
  activityType: string
  scopeType: string
  houseName: string
  clubName: string
  venue: string
  incharge: string
  description: string
  status: string
  criteriaId: string
}

type CriteriaForm = {
  title: string
  activityType: string
  maxMarks: string
  criteria: string
  notes: string
}

type PointsForm = {
  title: string
  date: string
  houseId: string
  points: string
  category: string
  notes: string
  eventId: string
}

const ACTIVITY_TYPES = [
  'General',
  'Debate',
  'Quiz',
  'Sports',
  'Cultural',
  'Literary',
  'Science',
  'Art',
  'Other',
]

const COMPETITION_TYPE_OPTIONS = [
  { value: 'school', label: 'Whole school' },
  { value: 'inter-house', label: 'Inter-House' },
  { value: 'club', label: 'Club' },
]

const normalizeScopeType = (value = '') => {
  const text = String(value || '').trim().toLowerCase()
  if (text === 'house') return 'inter-house'
  if (text === 'club') return 'club'
  return 'school'
}

const allHousesLabel = (houses: HouseOption[]) => {
  const names = houses
    .map((house) => String(house.name || '').trim())
    .filter(Boolean)
  return names.length > 0 ? names.join(', ') : 'All houses'
}

const STATUS_TONE: Record<string, string> = {
  planned: 'bg-sky-50 text-sky-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const textareaClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const emptyEventForm = (date = ''): EventForm => ({
  title: '',
  date,
  activityType: 'General',
  scopeType: 'school',
  houseName: '',
  clubName: '',
  venue: '',
  incharge: '',
  description: '',
  status: 'planned',
  criteriaId: '',
})

const emptyCriteriaForm = (): CriteriaForm => ({
  title: '',
  activityType: 'General',
  maxMarks: '100',
  criteria: '',
  notes: '',
})

const emptyPointsForm = (): PointsForm => ({
  title: '',
  date: new Date().toISOString().slice(0, 10),
  houseId: '',
  points: '',
  category: 'Inter-house',
  notes: '',
  eventId: '',
})

const monthKeyFromDate = (value: string) => {
  if (!value || value.length < 7) return ''
  return value.slice(0, 7)
}

const formatMonthLabel = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })

const ActvtBoard: React.FC = () => {
  const today = new Date()
  const [tab, setTab] = useState<BoardTab>('overview')
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [criteriaList, setCriteriaList] = useState<CriteriaRecord[]>([])
  const [houses, setHouses] = useState<HouseOption[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [recentPoints, setRecentPoints] = useState<PointsEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [filterMonth, setFilterMonth] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [query, setQuery] = useState('')

  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  )
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm(selectedDate))
  const [editingEventId, setEditingEventId] = useState('')
  const [criteriaForm, setCriteriaForm] = useState<CriteriaForm>(emptyCriteriaForm())
  const [editingCriteriaId, setEditingCriteriaId] = useState('')
  const [pointsForm, setPointsForm] = useState<PointsForm>(emptyPointsForm())

  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`

  const load = async () => {
    setLoading(true)
    try {
      const [eventsRes, criteriaRes, housesRes, rankingRes] = await Promise.all([
        api.get('/actvt/events'),
        api.get('/actvt/criteria'),
        api.get('/actvt/houses'),
        api.get('/actvt/ranking'),
      ])
      setEvents((eventsRes.data?.data || []) as ActivityEvent[])
      setCriteriaList((criteriaRes.data?.data || []) as CriteriaRecord[])
      setHouses((housesRes.data?.data || []) as HouseOption[])
      setStandings((rankingRes.data?.data?.standings || []) as Standing[])
      setRecentPoints((rankingRes.data?.data?.recent || []) as PointsEntry[])
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load activity board.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const monthOptions = useMemo(() => {
    const keys = new Set<string>()
    events.forEach((item) => {
      const key = item.monthKey || monthKeyFromDate(String(item.date || ''))
      if (key) keys.add(key)
    })
    keys.add(monthKey)
    return Array.from(keys).sort().reverse()
  }, [events, monthKey])

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return events
      .filter((item) => {
        const key = item.monthKey || monthKeyFromDate(String(item.date || ''))
        if (filterMonth && key !== filterMonth) return false
        if (filterType !== 'all' && String(item.activityType || 'General') !== filterType) return false
        if (filterStatus !== 'all' && String(item.status || 'planned') !== filterStatus) return false
        if (!needle) return true
        return `${item.title || ''} ${item.venue || ''} ${item.houseName || ''} ${item.clubName || ''} ${item.activityType || ''}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  }, [events, filterMonth, filterType, filterStatus, query])

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

  const stats = useMemo(() => {
    const planned = events.filter((item) => (item.status || 'planned') === 'planned').length
    const completed = events.filter((item) => item.status === 'completed').length
    const cancelled = events.filter((item) => item.status === 'cancelled').length
    return { total: events.length, planned, completed, cancelled }
  }, [events])

  const houseMap = useMemo(() => {
    const map = new Map<string, HouseOption>()
    houses.forEach((house) => map.set(String(house._id), house))
    return map
  }, [houses])

  const resetEventForm = (date = selectedDate) => {
    setEditingEventId('')
    setEventForm(emptyEventForm(date))
  }

  const handleDayClick = (dateKey: string) => {
    if (!dateKey) return
    setSelectedDate(dateKey)
    resetEventForm(dateKey)
    setTab('calendar')
  }

  const handleEditEvent = (item: ActivityEvent) => {
    const normalizedScopeType = normalizeScopeType(String(item.scopeType || 'school'))
    setEditingEventId(String(item._id || ''))
    setSelectedDate(String(item.date || selectedDate))
    setEventForm({
      title: String(item.title || ''),
      date: String(item.date || selectedDate),
      activityType: String(item.activityType || 'General'),
      scopeType: normalizedScopeType,
      houseName: normalizedScopeType === 'inter-house' ? allHousesLabel(houses) : String(item.houseName || ''),
      clubName: String(item.clubName || ''),
      venue: String(item.venue || ''),
      incharge: String(item.incharge || ''),
      description: String(item.description || ''),
      status: String(item.status || 'planned'),
      criteriaId: String(item.criteriaId || ''),
    })
    setTab('calendar')
  }

  const handleSaveEvent = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!eventForm.title.trim()) {
      toast.error('Activity title is required.')
      return
    }
    if (!eventForm.date) {
      toast.error('Please choose a date.')
      return
    }

    const matchedCriteria = criteriaList.find((item) => String(item._id) === eventForm.criteriaId)

    setSaving(true)
    try {
      const payload = {
        ...eventForm,
        scopeType: normalizeScopeType(eventForm.scopeType),
        title: eventForm.title.trim(),
        monthKey: monthKeyFromDate(eventForm.date),
        houseName: normalizeScopeType(eventForm.scopeType) === 'inter-house' ? allHousesLabel(houses) : '',
        clubName: eventForm.scopeType === 'club' ? eventForm.clubName.trim() : '',
        criteriaId: eventForm.criteriaId,
        criteriaTitle: matchedCriteria?.title || '',
      }

      if (editingEventId) {
        await api.put(`/actvt/events/${editingEventId}`, payload)
        toast.success('Activity updated.')
      } else {
        await api.post('/actvt/events', payload)
        toast.success('Activity saved.')
      }
      resetEventForm(eventForm.date)
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save activity.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveEvent = async (item: ActivityEvent) => {
    if (!item._id || !window.confirm(`Remove activity "${item.title || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/events/${item._id}`)
      toast.success('Activity removed.')
      if (editingEventId === item._id) resetEventForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove activity.'))
    }
  }

  const handleSaveCriteria = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!criteriaForm.title.trim()) {
      toast.error('Criteria title is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: criteriaForm.title.trim(),
        activityType: criteriaForm.activityType,
        maxMarks: Number(criteriaForm.maxMarks) || 100,
        criteria: criteriaForm.criteria.trim(),
        notes: criteriaForm.notes.trim(),
      }
      if (editingCriteriaId) {
        await api.put(`/actvt/criteria/${editingCriteriaId}`, payload)
        toast.success('Criteria updated.')
      } else {
        await api.post('/actvt/criteria', payload)
        toast.success('Criteria saved.')
      }
      setCriteriaForm(emptyCriteriaForm())
      setEditingCriteriaId('')
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save criteria.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEditCriteria = (item: CriteriaRecord) => {
    setEditingCriteriaId(String(item._id || ''))
    setCriteriaForm({
      title: String(item.title || ''),
      activityType: String(item.activityType || 'General'),
      maxMarks: String(item.maxMarks ?? 100),
      criteria: String(item.criteria || ''),
      notes: String(item.notes || ''),
    })
  }

  const handleRemoveCriteria = async (item: CriteriaRecord) => {
    if (!item._id || !window.confirm(`Remove criteria "${item.title || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/criteria/${item._id}`)
      toast.success('Criteria removed.')
      if (editingCriteriaId === item._id) {
        setEditingCriteriaId('')
        setCriteriaForm(emptyCriteriaForm())
      }
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove criteria.'))
    }
  }

  const handleSavePoints = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!pointsForm.title.trim()) {
      toast.error('Activity title is required.')
      return
    }
    if (!pointsForm.houseId) {
      toast.error('Please select a house.')
      return
    }
    const pointsValue = Number(pointsForm.points)
    if (!Number.isFinite(pointsValue)) {
      toast.error('Enter a valid points value.')
      return
    }

    const house = houseMap.get(pointsForm.houseId)
    setSaving(true)
    try {
      await api.post('/actvt/points', {
        title: pointsForm.title.trim(),
        date: pointsForm.date,
        eventId: pointsForm.eventId,
        houseId: pointsForm.houseId,
        houseName: house?.name || '',
        houseColor: house?.color || '',
        points: pointsValue,
        category: pointsForm.category.trim() || 'Inter-house',
        notes: pointsForm.notes.trim(),
      })
      toast.success('House score recorded.')
      setPointsForm(emptyPointsForm())
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save score.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePoints = async (item: PointsEntry) => {
    if (!item._id || !window.confirm(`Remove score entry "${item.title || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/points/${item._id}`)
      toast.success('Score entry removed.')
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove score.'))
    }
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  const tabs: Array<{ id: BoardTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'scores', label: 'House scores', icon: <Trophy className="h-4 w-4" /> },
    { id: 'criteria', label: 'Judgement criteria', icon: <Scale className="h-4 w-4" /> },
  ]

  const maxPoints = Math.max(...standings.map((item) => item.totalPoints), 1)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'overview' ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="All activities" value={stats.total} />
              <StatCard label="Planned" value={stats.planned} tone="text-sky-700" />
              <StatCard label="Completed" value={stats.completed} tone="text-emerald-700" />
              <StatCard label="Cancelled" value={stats.cancelled} tone="text-rose-700" />
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Activity records</h2>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search"
                      className="h-9 w-[160px] rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  <select
                    value={filterMonth}
                    onChange={(event) => setFilterMonth(event.target.value)}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  >
                    <option value="">All months</option>
                    {monthOptions.map((key) => {
                      const [year, month] = key.split('-')
                      return (
                        <option key={key} value={key}>
                          {formatMonthLabel(Number(year), Number(month) - 1)}
                        </option>
                      )
                    })}
                  </select>
                  <select
                    value={filterType}
                    onChange={(event) => setFilterType(event.target.value)}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  >
                    <option value="all">All types</option>
                    {ACTIVITY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value)}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  >
                    <option value="all">All status</option>
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      resetEventForm(selectedDate)
                      setTab('calendar')
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Plan activity
                  </button>
                </div>
              </div>

              {loading ? <p className="text-sm text-slate-500">Loading activities...</p> : null}
              {!loading && filteredEvents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                  No activities match the current filters.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3"
                    >
                      <button type="button" onClick={() => handleEditEvent(item)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[item.status || 'planned']}`}>
                            {item.status || 'planned'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {item.activityType || 'General'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.date || 'No date'}
                          {item.venue ? ` · ${item.venue}` : ''}
                          {normalizeScopeType(item.scopeType) === 'inter-house' ? ` · Inter-House` : ''}
                          {normalizeScopeType(item.scopeType) === 'club' && item.clubName ? ` · ${item.clubName}` : ''}
                          {item.criteriaTitle ? ` · Criteria: ${item.criteriaTitle}` : ''}
                        </p>
                      </button>
                      <button type="button" onClick={() => void handleRemoveEvent(item)} className="text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        {tab === 'calendar' ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
            <section className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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
                  if (!cell.day) return <div key={`empty-${index}`} className="min-h-[68px] rounded-xl bg-slate-50/50" />
                  const dayEvents = eventsByDate.get(cell.dateKey) || []
                  const selected = cell.dateKey === selectedDate
                  const dayTextColor = getCalendarDateTextColor(cell.dateKey, index % 7)
                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => handleDayClick(cell.dateKey)}
                      className={`min-h-[68px] rounded-xl border p-2 text-left transition ${
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

            <div className="min-w-0 space-y-6 lg:sticky lg:top-4">
              <form onSubmit={handleSaveEvent} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingEventId ? 'Edit activity' : 'Plan activity'}
                  </h3>
                </div>

                <div className="grid gap-3">
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-slate-500">Title</span>
                    <input
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. Inter-house Debate"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Date</span>
                      <input
                        type="date"
                        required
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Status</span>
                      <select
                        value={eventForm.status}
                        onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                        className={inputClass}
                      >
                        <option value="planned">Planned</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Type</span>
                      <select
                        value={eventForm.activityType}
                        onChange={(e) => setEventForm({ ...eventForm, activityType: e.target.value })}
                        className={inputClass}
                      >
                        {ACTIVITY_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Competition type</span>
                      <select
                        value={eventForm.scopeType}
                        onChange={(e) => {
                          const nextScopeType = normalizeScopeType(e.target.value)
                          setEventForm({
                            ...eventForm,
                            scopeType: nextScopeType,
                            houseName: nextScopeType === 'inter-house' ? allHousesLabel(houses) : '',
                            clubName: nextScopeType === 'club' ? eventForm.clubName : '',
                          })
                        }}
                        className={inputClass}
                      >
                        {COMPETITION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {normalizeScopeType(eventForm.scopeType) === 'inter-house' ? (
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Participating houses</span>
                      <input
                        value={eventForm.houseName}
                        className={inputClass}
                        placeholder="All houses"
                        readOnly
                      />
                    </label>
                  ) : null}
                  {normalizeScopeType(eventForm.scopeType) === 'club' ? (
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Club</span>
                      <input
                        value={eventForm.clubName}
                        onChange={(e) => setEventForm({ ...eventForm, clubName: e.target.value })}
                        className={inputClass}
                        placeholder="Club name"
                      />
                    </label>
                  ) : null}
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-slate-500">Judgement criteria</span>
                    <select
                      value={eventForm.criteriaId}
                      onChange={(e) => setEventForm({ ...eventForm, criteriaId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">None</option>
                      {criteriaList.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.title} ({item.activityType})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Venue</span>
                      <input
                        value={eventForm.venue}
                        onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block font-medium text-slate-500">Incharge</span>
                      <input
                        value={eventForm.incharge}
                        onChange={(e) => setEventForm({ ...eventForm, incharge: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-slate-500">Description</span>
                    <textarea
                      rows={3}
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className={textareaClass}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : editingEventId ? 'Update' : 'Add to calendar'}
                    </button>
                    {editingEventId ? (
                      <button
                        type="button"
                        onClick={() => resetEventForm()}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                      >
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
                        <button type="button" onClick={() => handleEditEvent(item)} className="min-w-0 flex-1 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900">{item.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[item.status || 'planned']}`}>
                              {item.status || 'planned'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.date || 'No date'}
                            {item.activityType ? ` · ${item.activityType}` : ''}
                            {item.venue ? ` · ${item.venue}` : ''}
                          </p>
                        </button>
                        <button type="button" onClick={() => void handleRemoveEvent(item)} className="text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {tab === 'scores' ? (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={handleSavePoints} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Medal className="h-4 w-4 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Add house score</h3>
              </div>
              <div className="grid gap-3">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Title</span>
                  <input
                    required
                    value={pointsForm.title}
                    onChange={(e) => setPointsForm({ ...pointsForm, title: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Debate 1st place"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Linked activity</span>
                  <select
                    value={pointsForm.eventId}
                    onChange={(e) => {
                      const eventId = e.target.value
                      const matched = events.find((item) => String(item._id) === eventId)
                      setPointsForm({
                        ...pointsForm,
                        eventId,
                        title: pointsForm.title || String(matched?.title || ''),
                        date: matched?.date || pointsForm.date,
                        category: matched?.activityType || pointsForm.category,
                      })
                    }}
                    className={inputClass}
                  >
                    <option value="">None</option>
                    {events.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.title} · {item.date || 'No date'}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-slate-500">Date</span>
                    <input
                      type="date"
                      value={pointsForm.date}
                      onChange={(e) => setPointsForm({ ...pointsForm, date: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-slate-500">Points</span>
                    <input
                      required
                      type="number"
                      value={pointsForm.points}
                      onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">House</span>
                  <select
                    required
                    value={pointsForm.houseId}
                    onChange={(e) => setPointsForm({ ...pointsForm, houseId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select house</option>
                    {houses.map((house) => (
                      <option key={house._id} value={house._id}>{house.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Category</span>
                  <input
                    value={pointsForm.category}
                    onChange={(e) => setPointsForm({ ...pointsForm, category: e.target.value })}
                    className={inputClass}
                    placeholder="Inter-house / Debate / Sports"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Notes</span>
                  <textarea
                    rows={3}
                    value={pointsForm.notes}
                    onChange={(e) => setPointsForm({ ...pointsForm, notes: e.target.value })}
                    className={textareaClass}
                    placeholder="Performance notes / placement"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Record score'}
                </button>
              </div>
            </form>

            <div className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold text-slate-900">Live standings</h2>
                </div>
                {standings.length === 0 ? (
                  <p className="text-sm text-slate-500">No house scores recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {standings.map((item) => (
                      <div key={item.houseId} className="rounded-2xl border border-slate-100 px-4 py-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.houseColor || '#94a3b8' }}
                            />
                            <p className="font-semibold text-slate-900">
                              #{item.rank} {item.houseName}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{item.totalPoints} pts</p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(6, (item.totalPoints / maxPoints) * 100)}%`,
                              backgroundColor: item.houseColor || '#4f46e5',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Recent score entries</h3>
                {recentPoints.length === 0 ? (
                  <p className="text-sm text-slate-500">No score entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recentPoints.map((item) => (
                      <div key={item._id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
                        <div>
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.houseName} · {item.points} pts · {item.date || 'No date'}
                            {item.category ? ` · ${item.category}` : ''}
                          </p>
                        </div>
                        <button type="button" onClick={() => void handleRemovePoints(item)} className="text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {tab === 'criteria' ? (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={handleSaveCriteria} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingCriteriaId ? 'Edit criteria' : 'Define criteria'}
                </h3>
              </div>
              <div className="grid gap-3">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Title</span>
                  <input
                    required
                    value={criteriaForm.title}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, title: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Debate judging sheet"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-slate-500">Activity type</span>
                    <select
                      value={criteriaForm.activityType}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, activityType: e.target.value })}
                      className={inputClass}
                    >
                      {ACTIVITY_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-slate-500">Max marks</span>
                    <input
                      type="number"
                      value={criteriaForm.maxMarks}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, maxMarks: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Judgement points (one per line)</span>
                  <textarea
                    rows={6}
                    value={criteriaForm.criteria}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, criteria: e.target.value })}
                    className={textareaClass}
                    placeholder={'Content and research\nDelivery and confidence\nRebuttal\nTeamwork'}
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Notes</span>
                  <textarea
                    rows={2}
                    value={criteriaForm.notes}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, notes: e.target.value })}
                    className={textareaClass}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : editingCriteriaId ? 'Update' : 'Save criteria'}
                  </button>
                  {editingCriteriaId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCriteriaId('')
                        setCriteriaForm(emptyCriteriaForm())
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </form>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Saved judgement criteria</h2>
              {criteriaList.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                  Define scoring / judging sheets for debates, sports, cultural events, and more.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {criteriaList.map((item) => {
                    const lines = String(item.criteria || '')
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean)
                    return (
                      <article key={item._id} className="rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.activityType || 'General'} · Max {item.maxMarks ?? 100} marks
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditCriteria(item)}
                              className="text-xs font-semibold text-indigo-600"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRemoveCriteria(item)}
                              className="text-xs font-semibold text-rose-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {lines.length > 0 ? (
                          <ul className="mt-3 space-y-1 text-sm text-slate-600">
                            {lines.map((line) => (
                              <li key={line} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm text-slate-400">No judgement points listed.</p>
                        )}
                        {item.notes ? <p className="mt-3 text-xs text-slate-500">{item.notes}</p> : null}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const StatCard = ({
  label,
  value,
  tone = 'text-slate-900',
}: {
  label: string
  value: number
  tone?: string
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
  </div>
)

export default ActvtBoard
