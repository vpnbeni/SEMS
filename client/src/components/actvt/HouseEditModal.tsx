import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ImagePlus, Trash2, X } from 'lucide-react'
import api from '@/services/api'
import { ImageCropModal } from '@/components/common/ImageCropModal'

export type HouseEditRecord = {
  _id?: string
  name?: string
  logo?: string
  tagline?: string
  motto?: string
  color?: string
  flag?: string
  teachers?: unknown
  councilMembers?: unknown
}

type HouseEditForm = {
  name: string
  tagline: string
  motto: string
  color: string
}

const isLikelyColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'H'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

type HouseEditModalProps = {
  open: boolean
  house: HouseEditRecord | null
  onClose: () => void
  onSaved: (house: HouseEditRecord) => void
}

export const HouseEditModal: React.FC<HouseEditModalProps> = ({
  open,
  house,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<HouseEditForm>({
    name: '',
    tagline: '',
    motto: '',
    color: '#4f46e5',
  })
  const [logoPreview, setLogoPreview] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [clearLogo, setClearLogo] = useState(false)
  const [cropSource, setCropSource] = useState('')
  const [saving, setSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const cropSourceRef = useRef('')

  useEffect(() => {
    if (!open || !house) return
    setForm({
      name: String(house.name || ''),
      tagline: String(house.tagline || ''),
      motto: String(house.motto || ''),
      color: String(house.color || '#4f46e5'),
    })
    setLogoPreview(String(house.logo || ''))
    setLogoFile(null)
    setClearLogo(false)
    setCropSource('')
    if (logoInputRef.current) logoInputRef.current.value = ''
  }, [open, house])

  useEffect(() => {
    cropSourceRef.current = cropSource
  }, [cropSource])

  useEffect(() => () => {
    if (cropSourceRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(cropSourceRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cropSource) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, cropSource, onClose])

  if (!open || !house?._id) return null

  const clearCropSource = () => {
    if (cropSource.startsWith('blob:')) URL.revokeObjectURL(cropSource)
    setCropSource('')
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
    setCropSource(URL.createObjectURL(file))
  }

  const handleCropped = (file: File, previewUrl: string) => {
    if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    clearCropSource()
    setLogoFile(file)
    setLogoPreview(previewUrl)
    setClearLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleRemoveLogo = () => {
    if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview('')
    setClearLogo(true)
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
      body.append('tagline', form.tagline.trim())
      body.append('motto', form.motto.trim())
      if (logoFile) body.append('logo', logoFile)
      if (clearLogo && !logoFile) body.append('clearLogo', 'true')

      const response = await api.put(`/actvt/houses/${house._id}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('House updated.')
      onSaved((response.data?.data || { ...house, ...form, logo: logoPreview }) as HouseEditRecord)
      onClose()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to update house.'))
    } finally {
      setSaving(false)
    }
  }

  const tone = isLikelyColor(form.color) ? form.color : '#4f46e5'

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="absolute inset-0" onClick={() => !saving && onClose()} />
        <div className="relative z-[1] flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Edit house</h3>
            <button
              type="button"
              onClick={() => !saving && onClose()}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  {logoPreview ? (
                    <img src={logoPreview} alt={form.name || 'House logo'} className="h-full w-full rounded-xl object-contain" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-xl text-2xl font-bold text-white"
                      style={{ backgroundColor: tone }}
                    >
                      {initialsOf(form.name)}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <p className="text-xs font-medium text-slate-500">House logo</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {logoPreview ? 'Replace / Change' : 'Upload logo'}
                    </button>
                    {logoPreview ? (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelected}
                  />
                </div>
              </div>

              <label className="block text-xs">
                <span className="mb-1 block font-medium text-slate-500">House name</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className={inputClass}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Tagline</span>
                  <input
                    value={form.tagline}
                    onChange={(event) => setForm({ ...form, tagline: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Motto</span>
                  <input
                    value={form.motto}
                    onChange={(event) => setForm({ ...form, motto: event.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="block text-xs">
                <span className="mb-1 block font-medium text-slate-500">Colour</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isLikelyColor(form.color) ? form.color : '#4f46e5'}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <input
                    value={form.color}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ImageCropModal
        open={Boolean(cropSource)}
        imageSrc={cropSource}
        title="Crop house logo"
        aspect={1}
        onCancel={() => {
          clearCropSource()
          if (logoInputRef.current) logoInputRef.current.value = ''
        }}
        onCropped={handleCropped}
      />
    </>
  )
}

export default HouseEditModal
