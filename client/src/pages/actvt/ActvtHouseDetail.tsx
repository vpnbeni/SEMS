import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Crown,
  Flag,
  Medal,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import api from '@/services/api'
import { ImageCropModal } from '@/components/common/ImageCropModal'
import { HouseEditModal } from '@/components/actvt/HouseEditModal'
import { HouseFlagFly } from '@/components/actvt/HouseFlagFly'
import {
  getHouseHeadingTextColor,
  usesDarkHouseHeading,
} from '@/constants/houseColorMetadata'
import { HOUSE_COUNCIL_MEMBER_ROLES } from '@/constants/councilMetadata'

type HouseTeacher = {
  _id?: string
  name: string
  role?: string
  phone?: string
  email?: string
}

type HouseCouncilMember = {
  _id?: string
  name: string
  role?: string
  className?: string
  section?: string
  phone?: string
}

type HouseStudent = {
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

type HouseWallOfFameEntry = {
  _id: string
  name?: string
  class?: string
  section?: string
  participationCount?: number
  medalCount?: number
  highlight?: {
    role?: string
    title?: string
    eventTitle?: string
    issuedOn?: string
  } | null
}

type HouseDetailsPayload = {
  house: {
    _id: string
    name?: string
    logo?: string
    flag?: string
    tagline?: string
    motto?: string
    color?: string
    teachers?: HouseTeacher[]
    councilMembers?: HouseCouncilMember[]
  }
  students: HouseStudent[]
  wallOfFame?: HouseWallOfFameEntry[]
  stats: {
    totalStudents: number
    teachersCount: number
    councilCount: number
    genderCounts: Record<string, number>
    byClassSection: Array<{ className: string; section: string; count: number }>
  }
}

const COUNCIL_ROLES: string[] = [...HOUSE_COUNCIL_MEMBER_ROLES]
const TEACHER_ROLES = ['House Master', 'House Mistress', 'Assistant House Teacher', 'Mentor', 'House Teacher']

const isLikelyColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'H'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const ActvtHouseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<HouseDetailsPayload | null>(null)
  const [studentQuery, setStudentQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [studentSort, setStudentSort] = useState<{ key: StudentSortKey; direction: 'asc' | 'desc' }>({
    key: 'classSectionName',
    direction: 'asc',
  })

  const [teacherForm, setTeacherForm] = useState({ name: '', role: 'House Teacher', phone: '', email: '' })
  const [councilForm, setCouncilForm] = useState<{
    name: string
    role: string
    className: string
    section: string
    phone: string
  }>({
    name: '',
    role: COUNCIL_ROLES[0],
    className: '',
    section: '',
    phone: '',
  })
  const [uploadingFlag, setUploadingFlag] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [flagCropSource, setFlagCropSource] = useState('')
  const flagInputRef = useRef<HTMLInputElement | null>(null)
  const flagCropSourceRef = useRef('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await api.get(`/actvt/houses/${id}/details`)
      setData(response.data?.data || null)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load house details.'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  useEffect(() => {
    flagCropSourceRef.current = flagCropSource
  }, [flagCropSource])

  useEffect(() => () => {
    if (flagCropSourceRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(flagCropSourceRef.current)
    }
  }, [])

  const house = data?.house
  const tone = isLikelyColor(house?.color || '') ? house!.color! : '#4f46e5'
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
  }, [data?.students, studentQuery, classFilter, sectionFilter, studentSort])

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

  const persistMembers = async (
    nextTeachers: HouseTeacher[],
    nextCouncil: HouseCouncilMember[],
    successMessage: string
  ) => {
    if (!id || !house) return
    setSaving(true)
    try {
      const body = new FormData()
      body.append('name', String(house.name || ''))
      body.append('color', String(house.color || ''))
      body.append('tagline', String(house.tagline || ''))
      body.append('motto', String(house.motto || ''))
      body.append('teachers', JSON.stringify(nextTeachers))
      body.append('councilMembers', JSON.stringify(nextCouncil))
      await api.put(`/actvt/houses/${id}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(successMessage)
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to update house.'))
    } finally {
      setSaving(false)
    }
  }

  const handleAddTeacher = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!teacherForm.name.trim()) {
      toast.error('Teacher name is required.')
      return
    }
    const next = [
      ...(house?.teachers || []),
      {
        name: teacherForm.name.trim(),
        role: teacherForm.role,
        phone: teacherForm.phone.trim(),
        email: teacherForm.email.trim(),
      },
    ]
    await persistMembers(next, house?.councilMembers || [], 'Teacher added to house.')
    setTeacherForm({ name: '', role: 'House Teacher', phone: '', email: '' })
  }

  const clearFlagCropSource = () => {
    if (flagCropSource.startsWith('blob:')) URL.revokeObjectURL(flagCropSource)
    setFlagCropSource('')
  }

  const handleFlagSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file for the house flag.')
      event.target.value = ''
      return
    }
    clearFlagCropSource()
    setFlagCropSource(URL.createObjectURL(file))
    event.target.value = ''
  }

  const handleFlagCropCancel = () => {
    clearFlagCropSource()
    if (flagInputRef.current) flagInputRef.current.value = ''
  }

  const handleFlagCropped = async (file: File, previewUrl: string) => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    clearFlagCropSource()
    if (!id || !house) return

    setUploadingFlag(true)
    try {
      const body = new FormData()
      body.append('name', String(house.name || ''))
      body.append('color', String(house.color || ''))
      body.append('tagline', String(house.tagline || ''))
      body.append('motto', String(house.motto || ''))
      body.append('teachers', JSON.stringify(house.teachers || []))
      body.append('councilMembers', JSON.stringify(house.councilMembers || []))
      body.append('flag', file)
      await api.put(`/actvt/houses/${id}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('House flag updated.')
      await load()
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to upload house flag.'))
    } finally {
      setUploadingFlag(false)
      if (flagInputRef.current) flagInputRef.current.value = ''
    }
  }

  const handleRemoveTeacher = async (index: number) => {
    const next = [...(house?.teachers || [])]
    next.splice(index, 1)
    await persistMembers(next, house?.councilMembers || [], 'Teacher removed.')
  }

  const handleAddCouncil = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!councilForm.name.trim()) {
      toast.error('Council member name is required.')
      return
    }
    const next = [
      ...(house?.councilMembers || []),
      {
        name: councilForm.name.trim(),
        role: councilForm.role,
        className: councilForm.className.trim(),
        section: councilForm.section.trim(),
        phone: councilForm.phone.trim(),
      },
    ]
    await persistMembers(house?.teachers || [], next, 'Council member added.')
    setCouncilForm({ name: '', role: COUNCIL_ROLES[0], className: '', section: '', phone: '' })
  }

  const handleRemoveCouncil = async (index: number) => {
    const next = [...(house?.councilMembers || [])]
    next.splice(index, 1)
    await persistMembers(house?.teachers || [], next, 'Council member removed.')
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading house details...</div>
  }

  if (!house) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">House not found.</p>
        <button
          type="button"
          onClick={() => navigate('/actvt/houses')}
          className="mt-3 text-sm font-semibold text-indigo-600"
        >
          Back to Houses
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

            <input
              ref={flagInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFlagSelected}
            />

            <div className="relative z-[1] grid items-stretch gap-6 lg:grid-cols-[180px_1fr_auto]">
              <div className="flex min-h-[168px] flex-col justify-self-start">
                <Link
                  to="/actvt/houses"
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                    darkHeading
                      ? 'bg-black/10 text-black hover:bg-black/15'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  All Houses
                </Link>

                <div className="mt-auto mb-auto flex h-36 w-36 items-center justify-center rounded-[28px] border-4 border-white bg-white p-2 shadow-xl">
                  {house.logo ? (
                    <img src={house.logo} alt={house.name} className="h-full w-full rounded-2xl object-contain" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-2xl text-3xl font-bold"
                      style={{
                        backgroundColor: tone,
                        color: headingText,
                      }}
                    >
                      {initialsOf(house.name)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center self-center text-center" style={{ color: headingText }}>
                <h1 className="text-3xl font-bold">{house.name}</h1>
                <p className="mt-2 text-sm font-semibold opacity-90">{house.tagline || 'No tagline yet'}</p>
                <p className="mt-1 text-sm italic opacity-80">{house.motto ? `“${house.motto}”` : 'No motto yet'}</p>

                <div className="mt-4 inline-flex overflow-hidden rounded-2xl bg-white/95 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit house
                  </button>
                  <button
                    type="button"
                    onClick={() => flagInputRef.current?.click()}
                    disabled={uploadingFlag}
                    className="inline-flex items-center justify-center gap-1.5 border-l border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    title="Upload house flag"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {uploadingFlag
                      ? house.flag
                        ? 'Changing...'
                        : 'Uploading...'
                      : house.flag
                        ? 'Change flag'
                        : 'Upload flag'}
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-self-end pr-2 mr-6 sm:mr-10">
                {house.flag ? (
                  <HouseFlagFly
                    key={house.flag}
                    src={house.flag}
                    alt={`${house.name} flag`}
                    height={72}
                    poleHeight={188}
                    hoist
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => flagInputRef.current?.click()}
                    disabled={uploadingFlag}
                    className="flex h-[188px] w-[130px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/70 bg-white/20 text-white/90 disabled:opacity-60"
                    title="Upload house flag"
                  >
                    <Flag className="h-5 w-5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      {uploadingFlag ? 'Uploading...' : 'Add house flag'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students" value={data?.stats.totalStudents || 0} />
          <StatCard label="Teachers" value={data?.stats.teachersCount || 0} />
          <StatCard label="Council" value={data?.stats.councilCount || 0} />
          <StatCard
            label="Boys / Girls"
            value={`${data?.stats.genderCounts?.Boy || 0} / ${data?.stats.genderCounts?.Girl || 0}`}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Teachers in the house</h2>
            </div>

            <form onSubmit={handleAddTeacher} className="mb-4 grid gap-2 sm:grid-cols-2">
              <input
                value={teacherForm.name}
                onChange={(event) => setTeacherForm({ ...teacherForm, name: event.target.value })}
                placeholder="Teacher name"
                className={inputClass}
              />
              <select
                value={teacherForm.role}
                onChange={(event) => setTeacherForm({ ...teacherForm, role: event.target.value })}
                className={inputClass}
              >
                {TEACHER_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input
                value={teacherForm.phone}
                onChange={(event) => setTeacherForm({ ...teacherForm, phone: event.target.value })}
                placeholder="Phone"
                className={inputClass}
              />
              <div className="flex gap-2">
                <input
                  value={teacherForm.email}
                  onChange={(event) => setTeacherForm({ ...teacherForm, email: event.target.value })}
                  placeholder="Email"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="shrink-0 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {(house.teachers || []).length === 0 ? (
                <p className="text-sm text-slate-500">No teachers assigned yet.</p>
              ) : (
                (house.teachers || []).map((teacher, index) => (
                  <div key={`${teacher.name}-${index}`} className="flex items-start justify-between rounded-2xl border border-slate-100 px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-900">{teacher.name}</p>
                      <p className="text-xs text-indigo-600">{teacher.role || 'House Teacher'}</p>
                      <p className="text-xs text-slate-500">
                        {[teacher.phone, teacher.email].filter(Boolean).join(' · ') || 'No contact'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveTeacher(index)}
                      className="text-xs font-semibold text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <h2 className="text-lg font-semibold text-slate-900">House Council Members</h2>
              </div>
              <Link
                to="/actvt/student-council"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Manage via Student Council →
              </Link>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Members selected from a house council on Student Council appear here automatically.
            </p>

            <form onSubmit={handleAddCouncil} className="mb-4 grid gap-2 sm:grid-cols-2">
              <input
                value={councilForm.name}
                onChange={(event) => setCouncilForm({ ...councilForm, name: event.target.value })}
                placeholder="Member name"
                className={inputClass}
              />
              <select
                value={councilForm.role}
                onChange={(event) => setCouncilForm({ ...councilForm, role: event.target.value })}
                className={inputClass}
              >
                {COUNCIL_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input
                value={councilForm.className}
                onChange={(event) => setCouncilForm({ ...councilForm, className: event.target.value })}
                placeholder="Class"
                className={inputClass}
              />
              <input
                value={councilForm.section}
                onChange={(event) => setCouncilForm({ ...councilForm, section: event.target.value })}
                placeholder="Section"
                className={inputClass}
              />
              <input
                value={councilForm.phone}
                onChange={(event) => setCouncilForm({ ...councilForm, phone: event.target.value })}
                placeholder="Phone"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Add member
              </button>
            </form>

            <div className="space-y-2">
              {(house.councilMembers || []).length === 0 ? (
                <p className="text-sm text-slate-500">No council members added yet.</p>
              ) : (
                (house.councilMembers || []).map((member, index) => (
                  <div key={`${member.name}-${index}`} className="flex items-start justify-between rounded-2xl border border-slate-100 px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-amber-700">{member.role || 'Member'}</p>
                      <p className="text-xs text-slate-500">
                        {[member.className, member.section].filter(Boolean).join(' · ') || 'Class/section not set'}
                        {member.phone ? ` · ${member.phone}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveCouncil(index)}
                      className="text-xs font-semibold text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">House wall of fame</h2>
                <p className="text-xs text-slate-500">
                  Top achievers from medals and activity participation
                </p>
              </div>
            </div>
          </div>

          {(data?.wallOfFame || []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-amber-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
              No wall of fame entries yet. Issue house participation or medal certificates after activities to rank students here.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(data?.wallOfFame || []).map((entry, index) => (
                <button
                  key={entry._id}
                  type="button"
                  onClick={() => navigate(`/actvt/students/${entry._id}`)}
                  className="rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: tone }}
                    >
                      {initialsOf(entry.name || '')}
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">{entry.name || 'Student'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[entry.class, entry.section].filter(Boolean).join('-') || 'Class not set'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      <Medal className="h-3 w-3" />
                      {entry.medalCount || 0} medal{(entry.medalCount || 0) === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {entry.participationCount || 0} cert{(entry.participationCount || 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  {entry.highlight ? (
                    <p className="mt-3 line-clamp-2 text-xs text-slate-600">
                      <span className="font-semibold text-amber-700">{entry.highlight.role || 'Winner'}</span>
                      {' · '}
                      {entry.highlight.eventTitle || entry.highlight.title || 'Activity'}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>

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
                      <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                        No students assigned to this house yet. Assign houses from STDNT student records.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr
                        key={student._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/actvt/students/${student._id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            navigate(`/actvt/students/${student._id}`)
                          }
                        }}
                        className="cursor-pointer border-t border-slate-100 transition hover:bg-indigo-50/60"
                      >
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.rollNumber || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.classRollNo ?? '—'}</td>
                        <td className="truncate px-2 py-3 font-medium text-indigo-700 sm:px-3" title={student.name}>
                          {student.name}
                        </td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3" title={student.fatherName || ''}>
                          {student.fatherName || '—'}
                        </td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3" title={student.motherName || ''}>
                          {student.motherName || '—'}
                        </td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.class || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.section || '—'}</td>
                        <td className="truncate px-2 py-3 text-slate-700 sm:px-3">{student.gender || '—'}</td>
                        <td className="truncate px-2 py-3 font-semibold text-slate-900 sm:px-3">
                          {student.participationCount ?? 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <HouseEditModal
        open={editOpen}
        house={house}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          void load()
        }}
      />

      <ImageCropModal
        open={Boolean(flagCropSource)}
        imageSrc={flagCropSource}
        title="Crop house flag"
        hint="Drag to reposition. In Free mode, drag one edge or corner to resize that side only."
        aspect={3 / 2}
        fileNamePrefix="house-flag"
        onCancel={handleFlagCropCancel}
        onCropped={(file, previewUrl) => {
          void handleFlagCropped(file, previewUrl)
        }}
      />
    </div>
  )
}

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
)

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400'

export default ActvtHouseDetail
