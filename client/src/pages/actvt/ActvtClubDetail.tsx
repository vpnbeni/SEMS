import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ImagePlus,
  Pencil,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import api from '@/services/api'
import { ImageCropModal } from '@/components/common/ImageCropModal'
import { ClubEditModal } from '@/components/actvt/ClubEditModal'
import {
  getHouseHeadingTextColor,
  usesDarkHouseHeading,
} from '@/constants/houseColorMetadata'

type ClubRecord = {
  _id?: string
  name?: string
  logo?: string
  tagline?: string
  motto?: string
  color?: string
  incharge?: string
  meetingDay?: string
  description?: string
  members?: string
  activities?: string
}

type ClubDetails = {
  club: ClubRecord
  memberLines: string[]
  students: ClubStudent[]
  stats: {
    membersCount: number
    hasIncharge: boolean
    hasMeetingDay: boolean
  }
}

type ClubStudent = {
  _id: string
  rollNumber?: string
  classRollNo?: number | null
  name: string
  class?: string
  section?: string
  gender?: string
  phone?: string
  fatherName?: string
  motherName?: string
  participationCount?: number
}

type StudentSortKey =
  | 'rollNumber'
  | 'classRollNo'
  | 'name'
  | 'fatherName'
  | 'motherName'
  | 'class'
  | 'section'
  | 'gender'
  | 'participationCount'
  | 'classSectionName'

const isLikelyColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'C'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const textareaClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
  </div>
)

const ActvtClubDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ClubDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoViewerOpen, setLogoViewerOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [cropSource, setCropSource] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [studentSort, setStudentSort] = useState<{ key: StudentSortKey; direction: 'asc' | 'desc' }>({
    key: 'classSectionName',
    direction: 'asc',
  })
  const [profileForm, setProfileForm] = useState({
    incharge: '',
    meetingDay: '',
    description: '',
    members: '',
    activities: '',
  })
  const membersRef = useRef<HTMLTextAreaElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const cropSourceRef = useRef('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await api.get(`/actvt/clubs/${id}/details`)
      const payload = (response.data?.data || null) as ClubDetails | null
      setData(payload)
      if (payload?.club) {
        setProfileForm({
          incharge: String(payload.club.incharge || ''),
          meetingDay: String(payload.club.meetingDay || ''),
          description: String(payload.club.description || ''),
          members: String(payload.club.members || ''),
          activities: String(payload.club.activities || ''),
        })
      }
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load club details.'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  useEffect(() => {
    cropSourceRef.current = cropSource
  }, [cropSource])

  useEffect(() => () => {
    if (cropSourceRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(cropSourceRef.current)
    }
  }, [])

  const club = data?.club
  const tone = isLikelyColor(club?.color || '') ? club!.color! : '#4f46e5'
  const headingText = getHouseHeadingTextColor(tone)
  const darkHeading = usesDarkHouseHeading(tone)

  const classOptions = useMemo(() => {
    const values = new Set<string>()
    ;(data?.students || []).forEach((student) => {
      const value = String(student.class || '').trim()
      if (value) values.add(value)
    })
    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [data?.students])

  const sectionOptions = useMemo(() => {
    const values = new Set<string>()
    ;(data?.students || []).forEach((student) => {
      if (classFilter && String(student.class || '').trim() !== classFilter) return
      const value = String(student.section || '').trim()
      if (value) values.add(value)
    })
    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [data?.students, classFilter])

  useEffect(() => {
    if (sectionFilter && !sectionOptions.includes(sectionFilter)) {
      setSectionFilter('')
    }
  }, [sectionFilter, sectionOptions])

  const filteredStudents = useMemo(() => {
    const students = data?.students || []
    const needle = studentQuery.trim().toLowerCase()
    const filtered = students.filter((student) => {
      if (classFilter && String(student.class || '').trim() !== classFilter) return false
      if (sectionFilter && String(student.section || '').trim() !== sectionFilter) return false
      if (!needle) return true
      return `${student.name} ${student.rollNumber || ''} ${student.class || ''} ${student.section || ''} ${student.fatherName || ''} ${student.motherName || ''}`
        .toLowerCase()
        .includes(needle)
    })

    const direction = studentSort.direction === 'asc' ? 1 : -1
    const compareText = (left?: string | number | null, right?: string | number | null) =>
      String(left ?? '').localeCompare(String(right ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })

    return [...filtered].sort((a, b) => {
      if (studentSort.key === 'classSectionName') {
        const classCompare = compareText(a.class, b.class)
        if (classCompare !== 0) return classCompare * direction
        const sectionCompare = compareText(a.section, b.section)
        if (sectionCompare !== 0) return sectionCompare * direction
        return compareText(a.name, b.name) * direction
      }

      if (studentSort.key === 'classRollNo' || studentSort.key === 'participationCount') {
        const left = Number(a[studentSort.key] ?? -1)
        const right = Number(b[studentSort.key] ?? -1)
        if (left !== right) return (left - right) * direction
        return compareText(a.name, b.name)
      }

      const left = a[studentSort.key]
      const right = b[studentSort.key]
      const primary = compareText(left as string | number | null | undefined, right as string | number | null | undefined)
      if (primary !== 0) return primary * direction
      return compareText(a.name, b.name)
    })
  }, [classFilter, data?.students, sectionFilter, studentQuery, studentSort])

  const toggleStudentSort = (key: StudentSortKey) => {
    setStudentSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const SortHeader = ({
    label,
    sortKey,
    className = '',
  }: {
    label: string
    sortKey: StudentSortKey
    className?: string
  }) => {
    const active = studentSort.key === sortKey
    return (
      <th className={`px-2 py-3 sm:px-3 ${className}`}>
        <button
          type="button"
          onClick={() => toggleStudentSort(sortKey)}
          className={`inline-flex max-w-full items-center gap-1 font-semibold uppercase tracking-wide ${
            active ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="truncate">{label}</span>
          {active ? (
            studentSort.direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </button>
      </th>
    )
  }

  const clearCropSource = () => {
    if (cropSource.startsWith('blob:')) URL.revokeObjectURL(cropSource)
    setCropSource('')
  }

  const buildClubFormData = (extra?: (body: FormData) => void) => {
    const body = new FormData()
    body.append('name', String(club?.name || ''))
    body.append('color', String(club?.color || ''))
    body.append('tagline', String(club?.tagline || ''))
    body.append('motto', String(club?.motto || ''))
    body.append('incharge', profileForm.incharge.trim())
    body.append('meetingDay', profileForm.meetingDay.trim())
    body.append('description', profileForm.description.trim())
    body.append('members', profileForm.members.trim())
    body.append('activities', profileForm.activities.trim())
    extra?.(body)
    return body
  }

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id || !club) return
    setSaving(true)
    try {
      await api.put(`/actvt/clubs/${id}`, buildClubFormData(), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Club profile updated.')
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to update club profile.'))
    } finally {
      setSaving(false)
    }
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
    setCropSource(URL.createObjectURL(file))
  }

  const handleCropCancel = () => {
    clearCropSource()
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleCropped = async (file: File) => {
    if (!id || !club) return
    clearCropSource()
    if (logoInputRef.current) logoInputRef.current.value = ''
    setLogoBusy(true)
    try {
      await api.put(
        `/actvt/clubs/${id}`,
        buildClubFormData((body) => {
          body.append('logo', file)
        }),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      toast.success(club.logo ? 'Logo replaced.' : 'Logo uploaded.')
      setLogoViewerOpen(false)
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to update logo.'))
    } finally {
      setLogoBusy(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!id || !club?.logo) return
    if (!window.confirm('Remove this club logo?')) return
    setLogoBusy(true)
    try {
      await api.put(
        `/actvt/clubs/${id}`,
        buildClubFormData((body) => {
          body.append('clearLogo', 'true')
        }),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      toast.success('Logo removed.')
      setLogoViewerOpen(false)
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to remove logo.'))
    } finally {
      setLogoBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Loading club details...</p>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Club not found.</p>
        <button
          type="button"
          onClick={() => navigate('/actvt/clubs')}
          className="mt-3 text-sm font-semibold text-indigo-600"
        >
          Back to Clubs
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div
            className="relative min-h-[220px] overflow-hidden px-6 py-4"
            style={{ background: `linear-gradient(135deg, ${tone}, ${tone}b8)` }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_55%)]" />

            <div className="relative z-[1] grid items-stretch gap-6 lg:grid-cols-[180px_1fr_auto]">
              <div className="flex min-h-[168px] flex-col justify-self-start">
                <Link
                  to="/actvt/clubs"
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                    darkHeading
                      ? 'bg-black/10 text-black hover:bg-black/15'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  All Clubs
                </Link>

                <button
                  type="button"
                  onClick={() => setLogoViewerOpen(true)}
                  className="group relative mt-auto mb-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-[28px] border-4 border-white bg-white p-2 shadow-xl transition hover:scale-[1.02]"
                  title="View or change logo"
                >
                  {club.logo ? (
                    <img src={club.logo} alt={club.name} className="h-full w-full rounded-2xl object-contain" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-2xl text-3xl font-bold"
                      style={{
                        backgroundColor: tone,
                        color: headingText,
                      }}
                    >
                      {initialsOf(club.name)}
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">
                    {club.logo ? 'Change logo' : 'Add logo'}
                  </span>
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelected}
                />
              </div>

              <div className="flex flex-col items-center justify-center self-center text-center" style={{ color: headingText }}>
                <h1 className="text-3xl font-bold">{club.name}</h1>
                <p className="mt-2 text-sm font-semibold opacity-90">{club.tagline || 'No tagline yet'}</p>
                <p className="mt-1 text-sm italic opacity-80">{club.motto ? `“${club.motto}”` : 'No motto yet'}</p>

                <div className="mt-4 inline-flex overflow-hidden rounded-2xl bg-white/95 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit profile
                  </button>
                </div>
              </div>

              <div className="justify-self-end rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Teacher incharge</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{club.incharge || 'Not set'}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Meeting day</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{club.meetingDay || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Members" value={data?.stats.membersCount || 0} />
          <StatCard label="Incharge" value={data?.stats.hasIncharge ? 'Set' : '—'} />
          <StatCard label="Meeting day" value={data?.stats.hasMeetingDay ? 'Set' : '—'} />
        </section>

        <form onSubmit={handleSaveProfile} className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Club details</h2>
            </div>

            <div className="grid gap-3">
              <label className="text-xs">
                <span className="mb-1 flex items-center gap-1.5 font-medium text-slate-500">
                  <UserRound className="h-3.5 w-3.5" />
                  Teacher incharge
                </span>
                <input
                  value={profileForm.incharge}
                  onChange={(event) => setProfileForm({ ...profileForm, incharge: event.target.value })}
                  placeholder="Teacher name"
                  className={inputClass}
                />
              </label>

              <label className="text-xs">
                <span className="mb-1 flex items-center gap-1.5 font-medium text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Meeting day
                </span>
                <input
                  value={profileForm.meetingDay}
                  onChange={(event) => setProfileForm({ ...profileForm, meetingDay: event.target.value })}
                  placeholder="e.g. Friday"
                  className={inputClass}
                />
              </label>

              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Description</span>
                <textarea
                  rows={5}
                  value={profileForm.description}
                  onChange={(event) => setProfileForm({ ...profileForm, description: event.target.value })}
                  placeholder="What this club is about"
                  className={textareaClass}
                />
              </label>

              <label className="text-xs">
                <span className="mb-1 block font-medium text-slate-500">Activities and notes</span>
                <textarea
                  rows={5}
                  value={profileForm.activities}
                  onChange={(event) => setProfileForm({ ...profileForm, activities: event.target.value })}
                  placeholder="Upcoming activities, notes…"
                  className={textareaClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Members</h2>
            </div>

            <label className="text-xs">
              <span className="mb-1 block font-medium text-slate-500">One name per line</span>
              <textarea
                ref={membersRef}
                rows={14}
                value={profileForm.members}
                onChange={(event) => setProfileForm({ ...profileForm, members: event.target.value })}
                placeholder={'Student A\nStudent B\nStudent C'}
                className={textareaClass}
              />
            </label>

            {(data?.memberLines || []).length > 0 ? (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roster preview</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700">
                  {(data?.memberLines || []).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <div className="xl:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save club profile'}
            </button>
          </div>
        </form>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Students ({filteredStudents.length})
              </h2>
              <select
                value={classFilter}
                onChange={(event) => {
                  setClassFilter(event.target.value)
                  setSectionFilter('')
                }}
                className="h-9 min-w-[110px] rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
              >
                <option value="">All classes</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="h-9 min-w-[110px] rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
              >
                <option value="">All sections</option>
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
              {(classFilter || sectionFilter || studentQuery) ? (
                <button
                  type="button"
                  onClick={() => {
                    setClassFilter('')
                    setSectionFilter('')
                    setStudentQuery('')
                  }}
                  className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            <input
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Search students"
              className="h-9 w-[180px] rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
            <div className="max-h-[calc(2.5rem+20*2.75rem)] overflow-y-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[9%]" />
                  <col className="w-[7%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="sticky top-0 z-[1] bg-slate-50 text-left text-xs shadow-sm">
                  <tr>
                    <SortHeader label="Adm No" sortKey="rollNumber" />
                    <SortHeader label="Roll No" sortKey="classRollNo" />
                    <SortHeader label="Student Name" sortKey="name" />
                    <SortHeader label="Father Name" sortKey="fatherName" />
                    <SortHeader label="Mother Name" sortKey="motherName" />
                    <SortHeader label="Class" sortKey="class" />
                    <SortHeader label="Section" sortKey="section" />
                    <SortHeader label="Gender" sortKey="gender" />
                    <SortHeader label="Participation" sortKey="participationCount" />
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        {(data?.memberLines || []).length === 0
                          ? 'No club members added yet. Add member names in the roster above to list students here.'
                          : 'No matching student records found for this club roster in the selected academic session.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className="border-t border-slate-100">
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.rollNumber || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.classRollNo ?? '—'}</td>
                        <td className="truncate px-2 py-3 font-medium text-indigo-600 sm:px-3">{student.name}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.fatherName || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.motherName || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.class || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.section || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.gender || '—'}</td>
                        <td className="truncate px-2 py-3 font-semibold text-slate-900 sm:px-3">{student.participationCount || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {logoViewerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !logoBusy && setLogoViewerOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Club logo</h3>
              <button
                type="button"
                onClick={() => !logoBusy && setLogoViewerOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 px-5 py-6">
              <div
                className="flex h-56 w-56 items-center justify-center rounded-[28px] border border-slate-100 bg-slate-50 p-3 shadow-inner"
                style={club.logo ? undefined : { backgroundColor: tone }}
              >
                {club.logo ? (
                  <img src={club.logo} alt={club.name} className="h-full w-full rounded-2xl object-contain" />
                ) : (
                  <span className="text-5xl font-bold" style={{ color: headingText }}>
                    {initialsOf(club.name)}
                  </span>
                )}
              </div>

              <p className="text-center text-sm text-slate-500">
                {club.logo ? 'Replace, change, or remove this logo.' : 'No logo yet — upload one to brand this club.'}
              </p>

              <div className="flex w-full flex-wrap justify-center gap-2">
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  <ImagePlus className="h-4 w-4" />
                  {logoBusy ? 'Saving...' : club.logo ? 'Replace / Change' : 'Upload logo'}
                </button>
                {club.logo ? (
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={() => void handleRemoveLogo()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ClubEditModal
        open={editOpen}
        club={club}
        onClose={() => setEditOpen(false)}
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
        onCropped={(file) => {
          void handleCropped(file)
        }}
      />
    </div>
  )
}

export default ActvtClubDetail
