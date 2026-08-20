import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Medal, Plus, Trash2, Trophy } from 'lucide-react'
import api from '@/services/api'

type HouseOption = {
  _id?: string
  name?: string
  color?: string
  logo?: string
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
  logo?: string
  totalPoints: number
  entries: number
  rank: number
}

type PointsForm = {
  title: string
  date: string
  houseId: string
  points: string
  category: string
  notes: string
}

const emptyForm = (): PointsForm => ({
  title: '',
  date: new Date().toISOString().slice(0, 10),
  houseId: '',
  points: '',
  category: 'Inter-house',
  notes: '',
})

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const ActvtHouseRanking: React.FC = () => {
  const [houses, setHouses] = useState<HouseOption[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [recent, setRecent] = useState<PointsEntry[]>([])
  const [form, setForm] = useState<PointsForm>(emptyForm())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const houseMap = useMemo(() => {
    const map = new Map<string, HouseOption>()
    houses.forEach((house) => map.set(String(house._id), house))
    return map
  }, [houses])

  const load = async () => {
    setLoading(true)
    try {
      const [housesRes, rankingRes] = await Promise.all([
        api.get('/actvt/houses'),
        api.get('/actvt/ranking'),
      ])
      setHouses((housesRes.data?.data || []) as HouseOption[])
      setStandings((rankingRes.data?.data?.standings || []) as Standing[])
      setRecent((rankingRes.data?.data?.recent || []) as PointsEntry[])
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load ranking.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error('Activity title is required.')
      return
    }
    if (!form.houseId) {
      toast.error('Please select a house.')
      return
    }
    const pointsValue = Number(form.points)
    if (!Number.isFinite(pointsValue)) {
      toast.error('Enter a valid points value.')
      return
    }

    const house = houseMap.get(form.houseId)
    setSaving(true)
    try {
      await api.post('/actvt/points', {
        title: form.title.trim(),
        date: form.date,
        houseId: form.houseId,
        houseName: house?.name || '',
        houseColor: house?.color || '',
        points: pointsValue,
        category: form.category.trim() || 'Inter-house',
        notes: form.notes.trim(),
      })
      toast.success('Points recorded.')
      setForm(emptyForm())
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save points.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item: PointsEntry) => {
    if (!item._id || !window.confirm(`Remove points entry "${item.title || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/points/${item._id}`)
      toast.success('Entry removed.')
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove entry.'))
    }
  }

  const maxPoints = Math.max(...standings.map((item) => item.totalPoints), 1)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">House standings</h2>
          </div>

          {loading ? <p className="text-sm text-slate-500">Loading rankings...</p> : null}

          {!loading && standings.length === 0 ? (
            <p className="text-sm text-slate-500">No house points yet. Record an activity below to begin the leaderboard.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {standings.map((house) => (
                <div key={house.houseId} className="rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: house.houseColor || '#4f46e5' }}
                      >
                        {house.rank}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{house.houseName}</p>
                        <p className="text-[11px] text-slate-500">{house.entries} activit{house.entries === 1 ? 'y' : 'ies'}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{house.totalPoints}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((house.totalPoints / maxPoints) * 100, 4)}%`,
                        backgroundColor: house.houseColor || '#4f46e5',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">Record house points</h3>
            </div>

            <div className="grid gap-3">
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Activity / event</span>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Annual Sports Relay" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Date</span>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Points</span>
                  <input required type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className={inputClass} placeholder="10" />
                </label>
              </div>
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">House</span>
                <select required value={form.houseId} onChange={(e) => setForm({ ...form, houseId: e.target.value })} className={inputClass}>
                  <option value="">Select house</option>
                  {houses.map((house) => (
                    <option key={house._id} value={house._id}>{house.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Category</span>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} placeholder="Inter-house / Cultural / Sports" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Notes</span>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} placeholder="Optional notes" />
              </label>
              <button type="submit" disabled={saving || houses.length === 0} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Add points'}
              </button>
              {houses.length === 0 ? (
                <p className="text-xs text-amber-600">Create houses first to record ranking points.</p>
              ) : null}
            </div>
          </form>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Medal className="h-4 w-4 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">Activity points log</h3>
            </div>

            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No points entries yet.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((item) => (
                  <div key={item._id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {item.houseName || 'House'} · {item.date || 'No date'} · {item.category || 'Inter-house'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900">+{item.points || 0}</span>
                      <button type="button" onClick={() => void handleRemove(item)} className="text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

export default ActvtHouseRanking
