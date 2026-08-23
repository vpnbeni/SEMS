import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, MapPin, Pencil, Search, Trash2, Users } from 'lucide-react'
import api from '@/services/api'

type FacilityRecord = {
  _id?: string
  name?: string
  facilityType?: string
  location?: string
  capacity?: string
  color?: string
  description?: string
}

type ActivityRecord = {
  _id?: string
  eventId?: string
  title?: string
  year?: string
  venue?: string
  facilityId?: string
  facilityName?: string
  startDate?: string
  endDate?: string
  events?: string
  results?: string
}

type CalendarActivityEvent = {
  _id?: string
  title?: string
  date?: string
  activityType?: string
  venue?: string
  incharge?: string
  description?: string
  status?: string
}

type SportsActivityItem = {
  eventId: string
  title: string
  plannedDate: string
  venue: string
  incharge: string
  description: string
  detail: ActivityRecord | null
}

type FacilityForm = {
  name: string
  color: string
}

type ActivityForm = {
  eventId: string
  title: string
  plannedDate: string
  year: string
  venue: string
  facilityId: string
  startDate: string
  endDate: string
  events: string
  results: string
}

const DEFAULT_FACILITIES = [
  { name: 'Badminton', facilityType: 'Court', color: '#0f766e' },
  { name: 'Table Tennis', facilityType: 'Court', color: '#1d4ed8' },
  { name: 'Basketball', facilityType: 'Court', color: '#b45309' },
  { name: 'Swimming', facilityType: 'Pool', color: '#0369a1' },
] as const

const FACILITY_TONES = ['#0f766e', '#1d4ed8', '#b45309', '#be123c', '#0369a1', '#7c3aed', '#15803d']

const isLikelyColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const guessFacilityType = (name: string) => {
  const text = name.trim().toLowerCase()
  if (text.includes('swim') || text.includes('pool')) return 'Pool'
  if (text.includes('gym')) return 'Gym'
  if (text.includes('track')) return 'Track'
  if (text.includes('field') || text.includes('football') || text.includes('cricket')) return 'Field'
  if (text.includes('ground')) return 'Ground'
  if (text.includes('hall')) return 'Indoor Hall'
  return 'Court'
}

const emptyFacilityForm = (): FacilityForm => ({
  name: '',
  color: '#0f766e',
})

const emptyActivityForm = (): ActivityForm => ({
  eventId: '',
  title: '',
  plannedDate: '',
  year: '',
  venue: '',
  facilityId: '',
  startDate: '',
  endDate: '',
  events: '',
  results: '',
})

const inputClass =
  'h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400'

const ActvtSports: React.FC = () => {
  const [facilities, setFacilities] = useState<FacilityRecord[]>([])
  const [activityDetails, setActivityDetails] = useState<ActivityRecord[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarActivityEvent[]>([])
  const [facilityForm, setFacilityForm] = useState<FacilityForm>(emptyFacilityForm)
  const [activityForm, setActivityForm] = useState<ActivityForm>(emptyActivityForm)
  const [editingFacility, setEditingFacility] = useState<FacilityRecord | null>(null)
  const [editingActivity, setEditingActivity] = useState<SportsActivityItem | null>(null)
  const [facilityQuery, setFacilityQuery] = useState('')
  const [activityQuery, setActivityQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingFacility, setSavingFacility] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [facilityRes, activityRes, eventRes] = await Promise.all([
        api.get('/actvt/sports/facilities'),
        api.get('/actvt/sports'),
        api.get('/actvt/events'),
      ])
      let nextFacilities = (facilityRes.data?.data || []) as FacilityRecord[]

      const existingNames = new Set(
        nextFacilities.map((item) => String(item.name || '').trim().toLowerCase()).filter(Boolean)
      )
      const missingDefaults = DEFAULT_FACILITIES.filter(
        (item) => !existingNames.has(item.name.toLowerCase())
      )
      if (missingDefaults.length > 0) {
        await Promise.all(
          missingDefaults.map((item) =>
            api.post('/actvt/sports/facilities', {
              name: item.name,
              facilityType: item.facilityType,
              color: item.color,
              location: '',
              capacity: '',
              description: '',
            })
          )
        )
        const refreshed = await api.get('/actvt/sports/facilities')
        nextFacilities = (refreshed.data?.data || []) as FacilityRecord[]
      }

      setFacilities(nextFacilities)
      setActivityDetails((activityRes.data?.data || []) as ActivityRecord[])
      setCalendarEvents((eventRes.data?.data || []) as CalendarActivityEvent[])
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load sports data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const visibleFacilities = useMemo(() => {
    const needle = facilityQuery.trim().toLowerCase()
    if (!needle) return facilities
    return facilities.filter((item) =>
      `${item.name || ''} ${item.facilityType || ''} ${item.location || ''} ${item.capacity || ''} ${item.description || ''}`
        .toLowerCase()
        .includes(needle)
    )
  }, [facilities, facilityQuery])

  const visibleActivities = useMemo(() => {
    const detailByEventId = new Map<string, ActivityRecord>()
    activityDetails.forEach((item) => {
      const eventId = String(item.eventId || '').trim()
      if (eventId) detailByEventId.set(eventId, item)
    })

    const sportsActivities = calendarEvents
      .filter((item) => String(item.activityType || '').trim().toLowerCase() === 'sports')
      .filter((item) => String(item.status || 'planned').trim().toLowerCase() === 'planned')
      .map((item) => {
        const eventId = String(item._id || '').trim()
        const fallbackDetail = activityDetails.find((detail) =>
          !detail.eventId
          && String(detail.title || '').trim().toLowerCase() === String(item.title || '').trim().toLowerCase()
          && String(detail.startDate || '').trim() === String(item.date || '').trim()
        ) || null
        return {
          eventId,
          title: String(item.title || 'Untitled activity'),
          plannedDate: String(item.date || ''),
          venue: String(item.venue || ''),
          incharge: String(item.incharge || ''),
          description: String(item.description || ''),
          detail: detailByEventId.get(eventId) || fallbackDetail,
        }
      })
      .sort((a, b) => String(a.plannedDate || '').localeCompare(String(b.plannedDate || '')))

    const needle = activityQuery.trim().toLowerCase()
    if (!needle) return sportsActivities
    return sportsActivities.filter((item) =>
      `${item.title || ''} ${item.plannedDate || ''} ${item.venue || ''} ${item.detail?.facilityName || ''} ${item.detail?.events || ''}`
        .toLowerCase()
        .includes(needle)
    )
  }, [activityDetails, activityQuery, calendarEvents])

  const resetFacilityForm = () => {
    setFacilityForm(emptyFacilityForm())
    setEditingFacility(null)
  }

  const resetActivityForm = () => {
    setActivityForm(emptyActivityForm())
    setEditingActivity(null)
  }

  const startEditFacility = (item: FacilityRecord) => {
    setEditingFacility(item)
    setFacilityForm({
      name: String(item.name || ''),
      color: isLikelyColor(item.color || '') ? String(item.color) : '#0f766e',
    })
  }

  const startEditActivity = (item: SportsActivityItem) => {
    setEditingActivity(item)
    setActivityForm({
      eventId: item.eventId,
      title: String(item.title || ''),
      plannedDate: String(item.plannedDate || ''),
      year: String(item.detail?.year || new Date(item.plannedDate || Date.now()).getFullYear() || ''),
      venue: String(item.detail?.venue || item.venue || ''),
      facilityId: String(item.detail?.facilityId || ''),
      startDate: String(item.detail?.startDate || item.plannedDate || ''),
      endDate: String(item.detail?.endDate || item.plannedDate || ''),
      events: String(item.detail?.events || item.description || ''),
      results: String(item.detail?.results || ''),
    })
  }

  const handleSaveFacility = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!facilityForm.name.trim()) {
      toast.error('Facility name is required.')
      return
    }

    setSavingFacility(true)
    try {
      const name = facilityForm.name.trim()
      const payload = {
        name,
        facilityType: editingFacility?.facilityType || guessFacilityType(name),
        location: editingFacility?.location || '',
        capacity: editingFacility?.capacity || '',
        color: facilityForm.color.trim() || '#0f766e',
        description: editingFacility?.description || '',
      }

      if (editingFacility?._id) {
        await api.put(`/actvt/sports/facilities/${editingFacility._id}`, payload)
        toast.success('Facility updated.')
      } else {
        await api.post('/actvt/sports/facilities', payload)
        toast.success('Facility added.')
      }
      resetFacilityForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save facility.'))
    } finally {
      setSavingFacility(false)
    }
  }

  const handleRemoveFacility = async (item: FacilityRecord) => {
    if (!item._id || !window.confirm(`Remove facility "${item.name || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/sports/facilities/${item._id}`)
      toast.success('Facility removed.')
      if (editingFacility?._id === item._id) resetFacilityForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove facility.'))
    }
  }

  const handleSaveActivity = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!activityForm.eventId || !editingActivity) {
      toast.error('Select a planned sports activity first.')
      return
    }

    const matchedFacility = facilities.find((item) => String(item._id) === activityForm.facilityId)

    setSavingActivity(true)
    try {
      const payload = {
        eventId: activityForm.eventId,
        title: activityForm.title.trim(),
        year: activityForm.year.trim(),
        venue: activityForm.venue.trim() || String(matchedFacility?.name || ''),
        facilityId: activityForm.facilityId,
        facilityName: String(matchedFacility?.name || ''),
        startDate: activityForm.startDate,
        endDate: activityForm.endDate,
        events: activityForm.events.trim(),
        results: activityForm.results.trim(),
      }

      if (editingActivity.detail?._id) {
        await api.put(`/actvt/sports/${editingActivity.detail._id}`, payload)
        toast.success('Sports details updated.')
      } else {
        await api.post('/actvt/sports', payload)
        toast.success('Sports details saved.')
      }
      resetActivityForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save activity.'))
    } finally {
      setSavingActivity(false)
    }
  }

  const handleRemoveActivity = async (item: ActivityRecord) => {
    if (!item._id || !window.confirm(`Clear saved details for "${item.title || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/sports/${item._id}`)
      toast.success('Sports details cleared.')
      if (editingActivity?.detail?._id === item._id) resetActivityForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove activity.'))
    }
  }

  const facilityCountLabel = `${visibleFacilities.length} Facilit${visibleFacilities.length === 1 ? 'y' : 'ies'}`
  const activityCountLabel = `${visibleActivities.length} Activit${visibleActivities.length === 1 ? 'y' : 'ies'}`

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <form
            onSubmit={handleSaveFacility}
            className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2"
          >
            <h3 className="shrink-0 text-lg font-semibold text-slate-900">{facilityCountLabel}</h3>

            <div className="relative shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={facilityQuery}
                onChange={(event) => setFacilityQuery(event.target.value)}
                placeholder="Search facilities"
                className="h-9 w-[160px] rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-sm outline-none focus:border-indigo-400 sm:w-[180px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <input
                required
                value={facilityForm.name}
                onChange={(event) => setFacilityForm({ ...facilityForm, name: event.target.value })}
                placeholder="Facility name"
                className={`${inputClass} min-w-[120px] max-w-[180px] flex-1`}
              />

              <div className="flex shrink-0 items-center gap-1.5">
                <input
                  type="color"
                  value={isLikelyColor(facilityForm.color) ? facilityForm.color : '#0f766e'}
                  onChange={(event) => setFacilityForm({ ...facilityForm, color: event.target.value })}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  aria-label="Pick facility colour"
                />
                <input
                  value={facilityForm.color}
                  onChange={(event) => setFacilityForm({ ...facilityForm, color: event.target.value })}
                  placeholder="#0f766e"
                  className={`${inputClass} w-[88px]`}
                />
              </div>

              <button
                type="submit"
                disabled={savingFacility}
                className="h-9 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingFacility ? 'Saving...' : editingFacility ? 'Update' : 'Add'}
              </button>
              {editingFacility ? (
                <button
                  type="button"
                  onClick={resetFacilityForm}
                  className="h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          {loading ? <p className="text-sm text-slate-500">Loading facilities...</p> : null}

          {!loading && visibleFacilities.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">No sports facilities yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Add facilities like Badminton, Table Tennis, Basketball, and Swimming.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visibleFacilities.map((facility, index) => {
                const tone = isLikelyColor(facility.color || '')
                  ? facility.color!
                  : FACILITY_TONES[index % FACILITY_TONES.length]
                return (
                  <article
                    key={facility._id || facility.name}
                    className="flex flex-col overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)]"
                  >
                    <div className="h-20 shrink-0" style={{ backgroundColor: tone }} />
                    <div className="relative z-[1] -mt-10 flex justify-center px-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-md">
                        <div
                          className="flex h-full w-full items-center justify-center rounded-xl text-sm font-bold text-white"
                          style={{ backgroundColor: tone }}
                        >
                          {initialsOf(facility.name)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col px-3 pb-3 pt-2 text-center">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {facility.name || 'Untitled facility'}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-indigo-600">
                        {facility.facilityType || 'Facility'}
                      </p>
                      <p className="mt-2 line-clamp-2 min-h-[32px] text-xs text-slate-500">
                        {facility.location || 'No location set'}
                      </p>
                      {facility.capacity ? (
                        <p className="mt-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600">
                          <Users className="h-3 w-3" />
                          {facility.capacity}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-center gap-3 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => startEditFacility(facility)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveFacility(facility)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2">
            <h3 className="shrink-0 text-lg font-semibold text-slate-900">{activityCountLabel}</h3>

            <div className="relative shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={activityQuery}
                onChange={(event) => setActivityQuery(event.target.value)}
                placeholder="Search activities"
                className="h-9 w-[160px] rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-sm outline-none focus:border-indigo-400 sm:w-[180px]"
              />
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-sm text-slate-600">
              Planned sports activities from the Activity Board calendar appear here automatically. Select one below to assign
              facility, refine scheduling, and capture plan details.
            </p>
          </div>

          {visibleActivities.length > 0 ? (
            <form
              onSubmit={handleSaveActivity}
              className="mb-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Planned sports activity</span>
                  <select
                    value={activityForm.eventId}
                    onChange={(event) => {
                      const selected = visibleActivities.find((item) => item.eventId === event.target.value) || null
                      if (selected) startEditActivity(selected)
                      else resetActivityForm()
                    }}
                    className={inputClass}
                  >
                    <option value="">Select an activity</option>
                    {visibleActivities.map((item) => (
                      <option key={item.eventId} value={item.eventId}>
                        {item.title} {item.plannedDate ? `· ${item.plannedDate}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Calendar date</span>
                  <input value={activityForm.plannedDate} readOnly className={inputClass} placeholder="Select an activity" />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs md:col-span-2">
                  <span className="mb-1 block font-medium text-slate-500">Title</span>
                  <input value={activityForm.title} readOnly className={inputClass} placeholder="Select an activity" />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Year</span>
                  <input
                    value={activityForm.year}
                    onChange={(event) => setActivityForm({ ...activityForm, year: event.target.value })}
                    placeholder="Year"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Facility</span>
                  <select
                    value={activityForm.facilityId}
                    onChange={(event) => setActivityForm({ ...activityForm, facilityId: event.target.value })}
                    className={inputClass}
                  >
                    <option value="">Facility (optional)</option>
                    {facilities.map((facility) => (
                      <option key={facility._id} value={facility._id}>
                        {facility.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Venue</span>
                  <input
                    value={activityForm.venue}
                    onChange={(event) => setActivityForm({ ...activityForm, venue: event.target.value })}
                    placeholder="Venue"
                    className={inputClass}
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Start date</span>
                  <input
                    type="date"
                    value={activityForm.startDate}
                    onChange={(event) => setActivityForm({ ...activityForm, startDate: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">End date</span>
                  <input
                    type="date"
                    value={activityForm.endDate}
                    onChange={(event) => setActivityForm({ ...activityForm, endDate: event.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Activity plan</span>
                  <textarea
                    rows={4}
                    value={activityForm.events}
                    onChange={(event) => setActivityForm({ ...activityForm, events: event.target.value })}
                    placeholder="Describe fixtures, rounds, team flow, or event plan"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Results / notes</span>
                  <textarea
                    rows={4}
                    value={activityForm.results}
                    onChange={(event) => setActivityForm({ ...activityForm, results: event.target.value })}
                    placeholder="Capture outcomes, winners, or execution notes"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={savingActivity || !activityForm.eventId}
                  className="h-9 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingActivity ? 'Saving...' : editingActivity?.detail?._id ? 'Update details' : 'Save details'}
                </button>
                {editingActivity ? (
                  <button
                    type="button"
                    onClick={resetActivityForm}
                    className="h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                ) : null}
                {editingActivity?.detail?._id ? (
                  <button
                    type="button"
                    onClick={() => void handleRemoveActivity(editingActivity.detail!)}
                    className="h-9 shrink-0 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Clear details
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {loading ? <p className="text-sm text-slate-500">Loading activities...</p> : null}

          {!loading && visibleActivities.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">No planned sports activities yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Plan sports activities from the Activity Board calendar first. They will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleActivities.map((activity) => (
                <article
                  key={activity.eventId || activity.title}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {activity.title || 'Untitled activity'}
                      </p>
                      {activity.detail?.year ? (
                        <p className="mt-1 text-[11px] font-medium text-indigo-600">{activity.detail.year}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditActivity(activity)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit details
                      </button>
                      {activity.detail?._id ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (activity.detail) void handleRemoveActivity(activity.detail)
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <p className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {activity.detail?.venue || activity.venue || activity.detail?.facilityName || 'No venue'}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      {activity.detail?.startDate || activity.detail?.endDate
                        ? `${activity.detail?.startDate || '—'} to ${activity.detail?.endDate || '—'}`
                        : activity.plannedDate || 'Dates not set'}
                    </p>
                    {activity.detail?.events ? (
                      <p className="line-clamp-3 rounded-xl bg-slate-50 px-2.5 py-2 text-slate-600">
                        {activity.detail.events}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default ActvtSports
