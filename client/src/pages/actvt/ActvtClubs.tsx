import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ImagePlus, Pencil, Search, Trash2 } from 'lucide-react'
import api from '@/services/api'
import { ImageCropModal } from '@/components/common/ImageCropModal'
import { ClubEditModal, type ClubEditRecord } from '@/components/actvt/ClubEditModal'

type ClubRecord = ClubEditRecord

type ClubFormState = {
  name: string
  color: string
}

const emptyForm = (): ClubFormState => ({
  name: '',
  color: '#4f46e5',
})

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'C'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const isLikelyColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

const ClubLogoBadge = ({
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
        alt={name || 'Club logo'}
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

const ActvtClubs: React.FC = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState<ClubRecord[]>([])
  const [form, setForm] = useState<ClubFormState>(emptyForm)
  const [editingClub, setEditingClub] = useState<ClubRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [cropSource, setCropSource] = useState('')
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const cropSourceRef = useRef('')

  const load = async () => {
    setLoading(true)
    try {
      const response = await api.get('/actvt/clubs')
      setRecords((response.data?.data || []) as ClubRecord[])
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load clubs.'))
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
      `${item.name || ''} ${item.tagline || ''} ${item.motto || ''} ${item.color || ''} ${item.incharge || ''} ${item.meetingDay || ''}`
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
      toast.error('Please choose an image file for the club logo.')
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
      toast.error('Club name is required.')
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

      await api.post('/actvt/clubs', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Club saved.')
      resetForm()
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to save club.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item: ClubRecord) => {
    if (!item._id || !window.confirm(`Remove club "${item.name || 'Untitled'}"?`)) return
    try {
      await api.delete(`/actvt/clubs/${item._id}`)
      toast.success('Club removed.')
      if (editingClub?._id === item._id) setEditingClub(null)
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove club.'))
    }
  }

  const clubCountLabel = `${visible.length} Club${visible.length === 1 ? '' : 's'}`

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[92px] shrink-0">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">Add club</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex h-9 w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                title="Upload and crop logo"
              >
                {logoPreview ? (
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                  </span>
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
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

            <label className="min-w-[160px] flex-1 text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">Club Name</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Drama Club"
                className={inputClassCompact}
              />
            </label>

            <label className="w-[148px] shrink-0 text-[11px]">
              <span className="mb-1 block font-medium text-slate-500">Colour</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={isLikelyColor(form.color) ? form.color : '#4f46e5'}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  aria-label="Pick club colour"
                />
                <input
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  placeholder="#4f46e5"
                  className={inputClassCompact}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="h-9 shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{clubCountLabel}</h3>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clubs"
                className="w-[220px] rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {loading ? <p className="text-sm text-slate-500">Loading clubs...</p> : null}

          {!loading && visible.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">No clubs yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Add a club with name, colour, and logo. Open a club to manage members and activities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visible.map((club, index) => {
                const tone = isLikelyColor(club.color || '') ? club.color! : PROFILE_TONES[index % PROFILE_TONES.length]
                return (
                  <article
                    key={club._id || club.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => club._id && navigate(`/actvt/clubs/${club._id}`)}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && club._id) {
                        event.preventDefault()
                        navigate(`/actvt/clubs/${club._id}`)
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
                      <ClubLogoBadge logo={club.logo} name={club.name} tone={tone} />
                    </div>

                    <div className="relative flex flex-1 flex-col px-3 pb-3 pt-3">
                      <div className="flex flex-1 flex-col text-center">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                          {club.name || 'Untitled club'}
                        </p>
                        <p className="mt-1 line-clamp-2 min-h-[32px] text-[11px] font-medium text-indigo-600">
                          {club.tagline || 'No tagline'}
                        </p>
                        <p className="mt-2 line-clamp-3 min-h-[48px] text-xs italic leading-relaxed text-slate-600">
                          {club.motto ? `“${club.motto}”` : 'No motto added'}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-slate-200"
                            style={{ backgroundColor: isLikelyColor(tone) ? tone : '#94a3b8' }}
                          />
                          <span className="truncate">{club.color || 'No colour'}</span>
                        </span>
                        <div className="flex shrink-0 gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingClub(club)
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
                              void handleRemove(club)
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
      </div>

      <ClubEditModal
        open={Boolean(editingClub)}
        club={editingClub}
        onClose={() => setEditingClub(null)}
        onSaved={() => {
          void load()
        }}
      />

      <ImageCropModal
        open={Boolean(cropSource)}
        imageSrc={cropSource}
        title="Crop club logo"
        aspect={1}
        onCancel={handleCropCancel}
        onCropped={handleCropped}
      />
    </div>
  )
}

const inputClassCompact =
  'h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400'

const PROFILE_TONES = ['#4f46e5', '#0f766e', '#b45309', '#be123c', '#0369a1', '#7c3aed']

export default ActvtClubs
