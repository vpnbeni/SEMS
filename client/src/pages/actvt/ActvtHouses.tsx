import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ImagePlus, Pencil, Search, Trash2, Users } from 'lucide-react'
import api from '@/services/api'
import { ImageCropModal } from '@/components/common/ImageCropModal'
import { HouseEditModal, type HouseEditRecord } from '@/components/actvt/HouseEditModal'

type HouseRecord = HouseEditRecord

type HouseFormState = {
  name: string
  color: string
}

type HouseStats = {
  totalStudents: number
  assignedStudents: number
  unassignedStudents: number
  byHouse: Array<{
    houseId: string
    houseName: string
    color: string
    logo?: string
    count: number
  }>
  matrix: Array<{
    className: string
    section: string
    houses: Record<string, number>
    unassigned: number
    total: number
  }>
}

const emptyForm = (): HouseFormState => ({
  name: '',
  color: '#4f46e5',
})

const emptyStats = (): HouseStats => ({
  totalStudents: 0,
  assignedStudents: 0,
  unassignedStudents: 0,
  byHouse: [],
  matrix: [],
})

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'H'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const isLikelyColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

const HouseLogoBadge = ({
  logo,
  name,
  tone,
}: {
  logo?: string
  name?: string
  tone: string
}) => (
  <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-4 border-white bg-white p-2 shadow-md">
    {logo ? (
      <img
        src={logo}
        alt={name || 'House logo'}
        className="h-full w-full rounded-xl object-contain"
      />
    ) : (
      <div
        className="flex h-full w-full items-center justify-center rounded-xl text-lg font-bold text-white"
        style={{ backgroundColor: isLikelyColor(tone) ? tone : '#312e81' }}
      >
        {initialsOf(name)}
      </div>
    )}
  </div>
)

const ActvtHouses: React.FC = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState<HouseRecord[]>([])
  const [stats, setStats] = useState<HouseStats>(emptyStats)
  const [form, setForm] = useState<HouseFormState>(emptyForm)
  const [editingHouse, setEditingHouse] = useState<HouseRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [cropSource, setCropSource] = useState('')
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const cropSourceRef = useRef('')

  const loadStats = async () => {
    try {
      const response = await api.get('/actvt/houses/stats')
      setStats((response.data?.data || emptyStats()) as HouseStats)
    } catch {
      setStats(emptyStats())
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const response = await api.get('/actvt/houses')
      setRecords((response.data?.data || []) as HouseRecord[])
      await loadStats()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load houses.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    cropSourceRef.current = cropSource
  }, [cropSource])

  useEffect(() => () => {
    if (cropSourceRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(cropSourceRef.current)
    }
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return records
    return records.filter((item) =>
      `${item.name || ''} ${item.tagline || ''} ${item.motto || ''} ${item.color || ''}`
        .toLowerCase()
        .includes(needle)
    )
  }, [query, records])

  const clearCropSource = () => {
    if (cropSource.startsWith('blob:')) URL.revokeObjectURL(cropSource)
    setCropSource('')
  }

  const resetForm = () => {
    if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setForm(emptyForm())
    setLogoFile(null)
    setLogoPreview('')
    clearCropSource()
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleLogoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file for the house logo.')
      event.target.value = ''
      return
    }

    clearCropSource()
    const objectUrl = URL.createObjectURL(file)
    setCropSource(objectUrl)
  }

  const handleCropCancel = () => {
    clearCropSource()
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleCropped = (file: File, previewUrl: string) => {
    if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    clearCropSource()
    setLogoFile(file)
    setLogoPreview(previewUrl)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('House name is required.')
      return
    }

    setSaving(true)
    try {
      const body = new FormData()
      body.append('name', form.name.trim())
      body.append('color', form.color.trim())
      body.append('tagline', '')
      body.append('motto', '')
      if (logoFile) body.append('logo', logoFile)

      await api.post('/actvt/houses', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('House saved.')
      resetForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save house.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item: HouseRecord) => {
    if (!item._id || !window.confirm(`Remove house "${item.name || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/houses/${item._id}`)
      toast.success('House removed.')
      if (editingHouse?._id === item._id) setEditingHouse(null)
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove house.'))
    }
  }

  const houseCountLabel = `${visible.length} House${visible.length === 1 ? '' : 's'}`

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-[88px] shrink-0">
              <p className="mb-1 text-xs font-semibold text-slate-500">Add house</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                title="Upload and crop logo"
              >
                {logoPreview ? (
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                  </span>
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                <span className="truncate">Logo</span>
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelected}
                className="hidden"
              />
            </div>

            <label className="min-w-0 flex-1 text-xs">
              <span className="mb-1 block font-medium text-slate-500">House Name</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Ashoka"
                className={inputClassCompact}
              />
            </label>

            <label className="w-full shrink-0 text-xs sm:w-[148px]">
              <span className="mb-1 block font-medium text-slate-500">Colour</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={isLikelyColor(form.color) ? form.color : '#4f46e5'}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  aria-label="Pick house colour"
                />
                <input
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  placeholder="#4f46e5"
                  className={inputClassCompact}
                />
              </div>
            </label>

            <div className="flex shrink-0 gap-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Use Edit on a house card to update logo, tagline, motto, and colour.
          </p>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">House student stats</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="All students" value={stats.totalStudents} tone="bg-slate-900 text-white" />
            <StatPill label="Assigned" value={stats.assignedStudents} tone="bg-emerald-50 text-emerald-700" />
            <StatPill label="Not assigned" value={stats.unassignedStudents} tone="bg-amber-50 text-amber-700" />
            {stats.byHouse.map((house) => (
              <StatPill
                key={house.houseId}
                label={house.houseName}
                value={house.count}
                tone="bg-slate-50 text-slate-700"
                dot={house.color}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{houseCountLabel}</h3>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search houses"
                className="w-[220px] rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {loading ? <p className="text-sm text-slate-500">Loading houses...</p> : null}

          {!loading && visible.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">No houses yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Add a house with name, colour, and logo. Tagline and motto can be edited later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visible.map((house, index) => {
                const tone = isLikelyColor(house.color || '') ? house.color! : PROFILE_TONES[index % PROFILE_TONES.length]
                return (
                  <article
                    key={house._id || house.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => house._id && navigate(`/actvt/houses/${house._id}`)}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && house._id) {
                        event.preventDefault()
                        navigate(`/actvt/houses/${house._id}`)
                      }
                    }}
                    className="flex cursor-pointer flex-col overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-20px_rgba(15,23,42,0.5)]"
                  >
                    <div
                      className="h-36 shrink-0"
                      style={{
                        backgroundColor: isLikelyColor(tone) ? tone : '#312e81',
                      }}
                    />

                    <div className="relative z-[1] -mt-24 px-4">
                      <HouseLogoBadge logo={house.logo} name={house.name} tone={tone} />
                    </div>

                    <div className="relative flex flex-1 flex-col px-3 pb-3 pt-3">
                      <div className="flex flex-1 flex-col text-center">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                          {house.name || 'Untitled house'}
                        </p>
                        <p className="mt-1 line-clamp-2 min-h-[32px] text-[11px] font-medium text-indigo-600">
                          {house.tagline || 'No tagline'}
                        </p>
                        <p className="mt-2 line-clamp-3 min-h-[48px] text-xs italic leading-relaxed text-slate-600">
                          {house.motto ? `“${house.motto}”` : 'No motto added'}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-slate-200"
                            style={{ backgroundColor: isLikelyColor(tone) ? tone : '#94a3b8' }}
                          />
                          <span className="truncate">{house.color || 'No colour'}</span>
                        </span>
                        <div className="flex shrink-0 gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingHouse(house)
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRemove(house)
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Class · Section · House count</h3>
            <p className="mt-1 text-sm text-slate-500">
              Student distribution across houses for each class and section.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-semibold">Class</th>
                  <th className="sticky left-[72px] z-10 bg-slate-50 px-4 py-3 font-semibold">Section</th>
                  {records.map((house) => (
                    <th key={house._id} className="whitespace-nowrap px-4 py-3 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: isLikelyColor(house.color || '') ? house.color : '#94a3b8' }}
                        />
                        {house.name}
                      </span>
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-amber-700">Not assigned</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.matrix.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(4, records.length + 4)}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No student class/section data available yet.
                    </td>
                  </tr>
                ) : (
                  stats.matrix.map((row) => (
                    <tr key={`${row.className}-${row.section}`} className="border-t border-slate-100">
                      <td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-900">{row.className}</td>
                      <td className="sticky left-[72px] bg-white px-4 py-3 text-slate-700">{row.section}</td>
                      {records.map((house) => {
                        const houseId = String(house._id || '')
                        const count = row.houses[houseId] || 0
                        return (
                          <td key={houseId} className="px-4 py-3 text-slate-700">
                            {count || '—'}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 font-medium text-amber-700">{row.unassigned || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <HouseEditModal
        open={Boolean(editingHouse)}
        house={editingHouse}
        onClose={() => setEditingHouse(null)}
        onSaved={() => {
          void load()
        }}
      />

      <ImageCropModal
        open={Boolean(cropSource)}
        imageSrc={cropSource}
        title="Crop house logo"
        aspect={1}
        onCancel={handleCropCancel}
        onCropped={handleCropped}
      />
    </div>
  )
}

const StatPill = ({
  label,
  value,
  tone,
  dot,
}: {
  label: string
  value: number
  tone: string
  dot?: string
}) => (
  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${tone}`}>
    {dot ? (
      <span
        className="h-2 w-2 rounded-full border border-white/40"
        style={{ backgroundColor: isLikelyColor(dot) ? dot : '#94a3b8' }}
      />
    ) : null}
    <span>{label}</span>
    <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px]">{value}</span>
  </div>
)

const PROFILE_TONES = [
  'linear-gradient(135deg, #4f46e5, #7c3aed)',
  'linear-gradient(135deg, #0f766e, #14b8a6)',
  'linear-gradient(135deg, #b45309, #f59e0b)',
  'linear-gradient(135deg, #be123c, #fb7185)',
  'linear-gradient(135deg, #1d4ed8, #38bdf8)',
]

const inputClassCompact =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400'

export default ActvtHouses
