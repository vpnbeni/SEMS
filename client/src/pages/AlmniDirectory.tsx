import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { GraduationCap, Mail, MapPin, Phone, Search, Sparkles } from 'lucide-react'
import almniService, { type AlumniProfile } from '@/services/almniService'

const formatBatch = (session: string) => {
  const [start, end] = String(session || '').split('-')
  if (!start || !end) return session || 'Batch'
  return `${start.slice(-2)}–${end.slice(-2)}`
}

const initialsOf = (name: string) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AL'

const cardTone = (section: string, index: number) => {
  const tones = [
    'from-indigo-500 via-violet-500 to-fuchsia-500',
    'from-amber-500 via-orange-500 to-rose-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-sky-500 via-blue-500 to-indigo-500',
    'from-rose-500 via-pink-500 to-fuchsia-500',
  ]
  const key = `${section}-${index}`
  const hash = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return tones[hash % tones.length]
}

const AlmniDirectory: React.FC = () => {
  const [records, setRecords] = useState<AlumniProfile[]>([])
  const [batches, setBatches] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [currentSession, setCurrentSession] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [loading, setLoading] = useState(false)

  const loadAlumni = async (filters?: { search?: string; batchSession?: string; section?: string }) => {
    setLoading(true)
    try {
      const payload = await almniService.getAlumni(filters)
      setRecords(payload.records || [])
      setBatches(payload.batches || [])
      setSections(payload.sections || [])
      setTotal(payload.total || 0)
      setCurrentSession(payload.currentSession || '')
      if (payload.sync?.added) {
        toast.success(`${payload.sync.added} Class XII student${payload.sync.added === 1 ? '' : 's'} added to alumni.`)
      }
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load alumni.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAlumni({
      search: searchQuery.trim() || undefined,
      batchSession: selectedBatch || undefined,
      section: selectedSection || undefined,
    })
  }, [selectedBatch, selectedSection])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    void loadAlumni({
      search: searchQuery.trim() || undefined,
      batchSession: selectedBatch || undefined,
      section: selectedSection || undefined,
    })
  }

  const latestBatch = batches[0] || ''
  const latestCount = useMemo(
    () => records.filter((item) => item.batchSession === latestBatch).length,
    [records, latestBatch]
  )

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_42%,_#fff7ed_100%)] p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-indigo-100 bg-white/80 shadow-sm backdrop-blur">
          <div className="relative px-6 py-7">
            <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-indigo-200/50 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Visible in every session
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Alumni directory</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Class XII students are added automatically when the school moves to the next session. Their profiles stay here for every year that follows.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatChip label="Alumni" value={total} />
                <StatChip label="Batches" value={batches.length} />
                <StatChip label={latestBatch ? `Batch ${formatBatch(latestBatch)}` : 'Latest'} value={latestCount} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, roll no, or parent"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-indigo-200 focus:bg-white focus:ring-2"
              />
            </div>
            <select
              value={selectedBatch}
              onChange={(event) => setSelectedBatch(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
            >
              <option value="">All batches</option>
              {batches.map((batch) => (
                <option key={batch} value={batch}>
                  Batch {formatBatch(batch)}
                </option>
              ))}
            </select>
            <select
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
            >
              <option value="">All sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Search
            </button>
          </form>
          {currentSession ? (
            <p className="mt-3 text-xs text-slate-500">
              Current session {currentSession}. Class XII of earlier sessions appear here automatically.
            </p>
          ) : null}
        </section>

        {loading && records.length === 0 ? (
          <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
            Loading alumni profiles...
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-indigo-200 bg-white px-6 py-16 text-center shadow-sm">
            <GraduationCap className="mx-auto h-10 w-10 text-indigo-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No alumni yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              When the school opens the next academic session, Class XII students from the previous session will be added here as profile cards.
            </p>
          </div>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {records.map((alumni, index) => (
              <article
                key={alumni._id}
                className="group overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_18px_40px_-24px_rgba(49,46,129,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(49,46,129,0.5)]"
              >
                <div className={`relative h-28 bg-gradient-to-br ${cardTone(alumni.section || '', index)}`}>
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.12\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
                  <div className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    Batch {formatBatch(alumni.batchSession)}
                  </div>
                </div>
                <div className="relative px-5 pb-5">
                  <div className="-mt-10 mb-4 flex items-end gap-3">
                    {alumni.profileImage ? (
                      <img
                        src={alumni.profileImage}
                        alt={alumni.name}
                        className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-900 text-xl font-semibold text-amber-300 shadow-md">
                        {initialsOf(alumni.name)}
                      </div>
                    )}
                    <div className="pb-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">Class XII · {alumni.section || 'Section'}</p>
                      <h3 className="text-lg font-semibold leading-tight text-slate-900">{alumni.name}</h3>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Roll no. {alumni.rollNumber || alumni.classRollNo || '—'}</p>
                    {alumni.fatherName ? <p>S/o {alumni.fatherName}</p> : null}
                    {alumni.occupation || alumni.higherEducation ? (
                      <p className="text-slate-700">{alumni.occupation || alumni.higherEducation}</p>
                    ) : null}
                    {alumni.currentCity ? (
                      <p className="flex items-center gap-2 text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {alumni.currentCity}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {alumni.phone ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        <Phone className="h-3 w-3" />
                        {alumni.phone}
                      </span>
                    ) : null}
                    {alumni.email ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        <Mail className="h-3 w-3" />
                        {alumni.email}
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

const StatChip = ({ label, value }: { label: string; value: number }) => (
  <div className="min-w-[96px] rounded-2xl border border-indigo-100 bg-white/80 px-3 py-2 text-center">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-xl font-bold text-slate-900">{value}</p>
  </div>
)

export default AlmniDirectory
