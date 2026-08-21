import React, { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Award, Printer, Trash2 } from 'lucide-react'
import api from '@/services/api'

type HouseOption = {
  _id?: string
  name?: string
}

type ActivityEvent = {
  _id?: string
  title?: string
  date?: string
}

type CertificateRecord = {
  _id?: string
  title?: string
  eventId?: string
  eventTitle?: string
  eventDate?: string
  houseId?: string
  houseName?: string
  participantName?: string
  className?: string
  section?: string
  role?: string
  issuedOn?: string
  status?: string
}

type CertForm = {
  title: string
  eventId: string
  houseId: string
  participants: string
  className: string
  section: string
  role: string
  issuedOn: string
}

const emptyForm = (): CertForm => ({
  title: 'Certificate of Participation',
  eventId: '',
  houseId: '',
  participants: '',
  className: '',
  section: '',
  role: 'Participant',
  issuedOn: new Date().toISOString().slice(0, 10),
})

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const textareaClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const ActvtCertificates: React.FC = () => {
  const printRef = useRef<HTMLDivElement | null>(null)
  const [houses, setHouses] = useState<HouseOption[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [records, setRecords] = useState<CertificateRecord[]>([])
  const [form, setForm] = useState<CertForm>(emptyForm())
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const houseMap = useMemo(() => {
    const map = new Map<string, HouseOption>()
    houses.forEach((house) => map.set(String(house._id), house))
    return map
  }, [houses])

  const eventMap = useMemo(() => {
    const map = new Map<string, ActivityEvent>()
    events.forEach((event) => map.set(String(event._id), event))
    return map
  }, [events])

  const load = async () => {
    setLoading(true)
    try {
      const [housesRes, eventsRes, certsRes] = await Promise.all([
        api.get('/actvt/houses'),
        api.get('/actvt/events'),
        api.get('/actvt/certificates'),
      ])
      setHouses((housesRes.data?.data || []) as HouseOption[])
      setEvents((eventsRes.data?.data || []) as ActivityEvent[])
      setRecords((certsRes.data?.data || []) as CertificateRecord[])
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load certificates.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selectedCertificates = useMemo(
    () => records.filter((item) => item._id && selectedIds.includes(String(item._id))),
    [records, selectedIds]
  )

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault()
    const names = form.participants
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (!form.title.trim()) {
      toast.error('Certificate title is required.')
      return
    }
    if (names.length === 0) {
      toast.error('Add at least one participant name.')
      return
    }

    const selectedEvent = form.eventId ? eventMap.get(form.eventId) : null
    const selectedHouse = form.houseId ? houseMap.get(form.houseId) : null

    setSaving(true)
    try {
      const createdIds: string[] = []
      for (const name of names) {
        const response = await api.post('/actvt/certificates', {
          title: form.title.trim(),
          eventId: form.eventId,
          eventTitle: selectedEvent?.title || '',
          eventDate: selectedEvent?.date || '',
          houseId: form.houseId,
          houseName: selectedHouse?.name || '',
          participantName: name,
          className: form.className.trim(),
          section: form.section.trim(),
          role: form.role.trim() || 'Participant',
          issuedOn: form.issuedOn,
          status: 'issued',
        })
        const id = response.data?.data?._id
        if (id) createdIds.push(String(id))
      }

      toast.success(`Generated ${names.length} certificate${names.length === 1 ? '' : 's'}.`)
      setForm((prev) => ({ ...prev, participants: '' }))
      await load()
      setSelectedIds(createdIds)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to generate certificates.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item: CertificateRecord) => {
    if (!item._id || !window.confirm(`Remove certificate for "${item.participantName}"?`)) return
    try {
      await api.delete(`/actvt/certificates/${item._id}`)
      toast.success('Certificate removed.')
      setSelectedIds((prev) => prev.filter((id) => id !== String(item._id)))
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove certificate.'))
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handlePrint = () => {
    if (selectedCertificates.length === 0) {
      toast.error('Select at least one certificate to print.')
      return
    }
    window.print()
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6 print:max-w-none print:space-y-0 print:p-0">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr] print:hidden">
          <form onSubmit={handleGenerate} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Generate certificates</h2>
            </div>

            <div className="grid gap-3">
              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Certificate title</span>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">House activity (optional)</span>
                <select value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} className={inputClass}>
                  <option value="">Select activity from calendar</option>
                  {events.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.title}{item.date ? ` · ${item.date}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">House (optional)</span>
                <select value={form.houseId} onChange={(e) => setForm({ ...form, houseId: e.target.value })} className={inputClass}>
                  <option value="">Select house</option>
                  {houses.map((house) => (
                    <option key={house._id} value={house._id}>{house.name}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Role</span>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
                    <option>Participant</option>
                    <option>Winner</option>
                    <option>Runner-up</option>
                    <option>Second Runner-up</option>
                    <option>Volunteer</option>
                  </select>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Class</span>
                  <input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className={inputClass} />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-medium text-slate-500">Section</span>
                  <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className={inputClass} />
                </label>
              </div>

              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Issued on</span>
                <input type="date" value={form.issuedOn} onChange={(e) => setForm({ ...form, issuedOn: e.target.value })} className={inputClass} />
              </label>

              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Participants (one name per line)</span>
                <textarea
                  required
                  rows={8}
                  value={form.participants}
                  onChange={(e) => setForm({ ...form, participants: e.target.value })}
                  placeholder={'Aarav Sharma\nIsha Verma\nKabir Singh'}
                  className={textareaClass}
                />
              </label>

              <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Generating...' : 'Generate certificates'}
              </button>
            </div>
          </form>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Issued certificates</h3>
              <button
                type="button"
                onClick={handlePrint}
                disabled={selectedCertificates.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Print selected ({selectedCertificates.length})
              </button>
            </div>

            {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {!loading && records.length === 0 ? (
              <p className="text-sm text-slate-500">No certificates yet. Generate from the form.</p>
            ) : (
              <div className="space-y-2">
                {records.map((item) => {
                  const id = String(item._id || '')
                  const checked = selectedIds.includes(id)
                  return (
                    <div key={id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleSelected(id)} className="mt-1" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{item.participantName}</p>
                          <p className="text-xs text-slate-500">
                            {item.title}
                            {item.eventTitle ? ` · ${item.eventTitle}` : ''}
                            {item.houseName ? ` · ${item.houseName}` : ''}
                            {item.role ? ` · ${item.role}` : ''}
                          </p>
                        </div>
                      </label>
                      <button type="button" onClick={() => void handleRemove(item)} className="text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div ref={printRef} className="hidden print:block">
          {selectedCertificates.map((item) => (
            <div
              key={item._id}
              className="mb-8 flex min-h-[90vh] break-after-page flex-col items-center justify-center border-[10px] border-indigo-700 px-12 py-16 text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-700">CAPABBLE · ACTVT</p>
              <h1 className="mt-6 text-4xl font-bold text-slate-900">{item.title || 'Certificate'}</h1>
              <p className="mt-8 text-base text-slate-600">This is to certify that</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{item.participantName}</p>
              {(item.className || item.section) ? (
                <p className="mt-2 text-sm text-slate-500">
                  Class {item.className || '—'}{item.section ? `-${item.section}` : ''}
                </p>
              ) : null}
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600">
                has participated as <span className="font-semibold text-slate-800">{item.role || 'Participant'}</span>
                {item.eventTitle ? <> in <span className="font-semibold text-slate-800">{item.eventTitle}</span></> : null}
                {item.houseName ? <> representing <span className="font-semibold text-slate-800">{item.houseName}</span></> : null}.
              </p>
              <div className="mt-16 flex w-full max-w-3xl justify-between text-sm text-slate-500">
                <div>
                  <p className="font-semibold text-slate-800">{item.issuedOn || '—'}</p>
                  <p>Date of issue</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Activity Incharge</p>
                  <p>Authorised signatory</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ActvtCertificates
