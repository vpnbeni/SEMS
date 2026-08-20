import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Crown,
  Flag,
  Pencil,
  Plus,
  Trash2,
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
  stats: {
    totalStudents: number
    teachersCount: number
    councilCount: number
    genderCounts: Record<string, number>
    byClassSection: Array<{ className: string; section: string; count: number }>
  }
}

const COUNCIL_ROLES = ['Captain', 'Vice Captain', 'Secretary', 'Prefect', 'Sports Captain', 'Member']
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

  const [teacherForm, setTeacherForm] = useState({ name: '', role: 'House Teacher', phone: '', email: '' })
  const [councilForm, setCouncilForm] = useState({
    name: '',
    role: 'Captain',
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

  const filteredStudents = useMemo(() => {
    const students = data?.students || []
    const needle = studentQuery.trim().toLowerCase()
    if (!needle) return students
    return students.filter((student) =>
      `${student.name} ${student.rollNumber || ''} ${student.class || ''} ${student.section || ''} ${student.fatherName || ''}`
        .toLowerCase()
        .includes(needle)
    )
  }, [data?.students, studentQuery])

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
    setCouncilForm({ name: '', role: 'Captain', className: '', section: '', phone: '' })
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
            <div className="mb-4 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-600" />
              <h2 className="text-lg font-semibold text-slate-900">House Council Members</h2>
            </div>

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

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Students ({filteredStudents.length})
              </h2>
            </div>
            <input
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Search students"
              className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {(data?.stats.byClassSection || []).length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {data!.stats.byClassSection.map((row) => (
                <span
                  key={`${row.className}-${row.section}`}
                  className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                >
                  {row.className} {row.section}: {row.count}
                </span>
              ))}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Adm No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Father</th>
                  <th className="px-4 py-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No students assigned to this house yet. Assign houses from STDNT student records.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student._id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">{student.rollNumber || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                      <td className="px-4 py-3 text-slate-700">{student.class || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{student.section || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{student.gender || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{student.fatherName || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{student.phone || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
