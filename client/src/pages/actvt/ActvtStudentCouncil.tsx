import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, Crown, Home, Plus, Search, Trash2, Users, X } from 'lucide-react'
import api from '@/services/api'

type HouseOption = { _id?: string; name?: string; color?: string }

type Council = {
  _id?: string
  name?: string
  councilType?: string
  houseId?: string
  houseName?: string
  posts?: CouncilPost[]
}

type CouncilPost = {
  _id?: string
  councilId?: string
  title?: string
  seats?: number
  registrationStatus?: string
  preferredGender?: string
  preferredClasses?: string[]
  pendingCount?: number
  acceptedCount?: number
}

type Registration = {
  _id?: string
  postId?: string
  studentName?: string
  rollNumber?: string
  className?: string
  section?: string
  gender?: string
  houseName?: string
  status?: string
}

type StudentHit = {
  _id?: string
  name?: string
  rollNumber?: string
  class?: string
  section?: string
  gender?: string
  house?: string
  houseId?: string
  phone?: string
}

const GENDER_OPTIONS = ['Boy', 'Girl', 'Other'] as const

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const tone: Record<string, string> = {
  closed: 'bg-slate-100 text-slate-600',
  open: 'bg-emerald-50 text-emerald-700',
  accepting: 'bg-amber-50 text-amber-700',
  pending: 'bg-sky-50 text-sky-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

const normalizeGender = (value?: string) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (['boy', 'male', 'm'].includes(lower)) return 'Boy'
  if (['girl', 'female', 'f'].includes(lower)) return 'Girl'
  if (lower === 'other') return 'Other'
  return raw
}

const isStudentEligible = (post: CouncilPost | null, student: StudentHit) => {
  if (!post) return true
  const preferredGender = normalizeGender(post.preferredGender)
  const studentGender = normalizeGender(student.gender)
  if (preferredGender) {
    if (!studentGender || preferredGender !== studentGender) return false
  }
  const preferredClasses = (post.preferredClasses || [])
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  if (preferredClasses.length) {
    const studentClass = String(student.class || '').trim().toLowerCase()
    if (!studentClass || !preferredClasses.includes(studentClass)) return false
  }
  return true
}

const formatEligibility = (post: CouncilPost) => {
  const parts: string[] = []
  if (post.preferredGender) parts.push(post.preferredGender)
  if (post.preferredClasses?.length) parts.push(`Class ${post.preferredClasses.join(', ')}`)
  return parts.length ? parts.join(' · ') : 'Any gender · Any class'
}

const toggleClassValue = (className: string, current: string[], setter: (next: string[]) => void) => {
  if (current.includes(className)) setter(current.filter((item) => item !== className))
  else setter([...current, className])
}

const ActvtStudentCouncil: React.FC = () => {
  const [houses, setHouses] = useState<HouseOption[]>([])
  const [classOptions, setClassOptions] = useState<string[]>([])
  const [schoolCouncil, setSchoolCouncil] = useState<Council | null>(null)
  const [schoolPosts, setSchoolPosts] = useState<CouncilPost[]>([])
  const [houseCouncils, setHouseCouncils] = useState<Council[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [schoolPostTitle, setSchoolPostTitle] = useState('')
  const [schoolPostSeats, setSchoolPostSeats] = useState('1')
  const [schoolPostGender, setSchoolPostGender] = useState('')
  const [schoolPostClasses, setSchoolPostClasses] = useState<string[]>([])
  const [showSchoolPostForm, setShowSchoolPostForm] = useState(false)

  const [housePostTitle, setHousePostTitle] = useState('')
  const [housePostSeats, setHousePostSeats] = useState('1')
  const [showHousePostForm, setShowHousePostForm] = useState(false)

  const [selectedPostId, setSelectedPostId] = useState('')
  const [editingPostId, setEditingPostId] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editClasses, setEditClasses] = useState<string[]>([])
  const [studentQuery, setStudentQuery] = useState('')
  const [studentHits, setStudentHits] = useState<StudentHit[]>([])
  const [searchingStudents, setSearchingStudents] = useState(false)

  const allPosts = useMemo(
    () => [...schoolPosts, ...houseCouncils.flatMap((council) => council.posts || [])],
    [schoolPosts, houseCouncils]
  )
  const selectedPost = useMemo(
    () => allPosts.find((item) => String(item._id) === selectedPostId) || null,
    [allPosts, selectedPostId]
  )
  const selectedCouncil = useMemo(() => {
    if (!selectedPost?.councilId) return null
    if (schoolCouncil && String(schoolCouncil._id) === String(selectedPost.councilId)) return schoolCouncil
    return houseCouncils.find((item) => String(item._id) === String(selectedPost.councilId)) || null
  }, [selectedPost, schoolCouncil, houseCouncils])
  const postRegistrations = useMemo(
    () => registrations.filter((item) => String(item.postId) === selectedPostId),
    [registrations, selectedPostId]
  )
  const eligibleStudentHits = useMemo(
    () => studentHits.filter((student) => isStudentEligible(selectedPost, student)),
    [studentHits, selectedPost]
  )

  const loadClassOptions = async () => {
    try {
      const response = await api.get('/students/stats')
      const byClass = (response.data?.data?.byClass || []) as Array<{ _id?: string }>
      setClassOptions(
        byClass
          .map((row) => String(row._id || '').trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      )
    } catch {
      setClassOptions([])
    }
  }

  const loadBoard = async () => {
    setLoading(true)
    try {
      const response = await api.get('/actvt/councils/board')
      const data = response.data?.data || {}
      const nextSchoolPosts = (data.schoolPosts || []) as CouncilPost[]
      const nextHouseCouncils = (data.houseCouncils || []) as Council[]
      setHouses((data.houses || []) as HouseOption[])
      setSchoolCouncil((data.schoolCouncil || null) as Council | null)
      setSchoolPosts(nextSchoolPosts)
      setHouseCouncils(nextHouseCouncils)
      setRegistrations((data.registrations || []) as Registration[])
      const postIds = new Set([
        ...nextSchoolPosts.map((item) => String(item._id || '')),
        ...nextHouseCouncils.flatMap((council) => (council.posts || []).map((item) => String(item._id || ''))),
      ])
      setSelectedPostId((prev) => (postIds.has(prev) ? prev : ''))
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load student council.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBoard()
    void loadClassOptions()
  }, [])

  useEffect(() => {
    const needle = studentQuery.trim()
    if (needle.length < 2) {
      setStudentHits([])
      return undefined
    }
    const timer = window.setTimeout(async () => {
      setSearchingStudents(true)
      try {
        const params: Record<string, string | number | boolean> = { search: needle, lite: true, limit: 20 }
        if (selectedPost?.preferredClasses?.length === 1) {
          params.class = selectedPost.preferredClasses[0]
        }
        const response = await api.get('/students', { params })
        setStudentHits((response.data?.data || []) as StudentHit[])
      } catch {
        setStudentHits([])
      } finally {
        setSearchingStudents(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [studentQuery, selectedPost?.preferredClasses])

  const onAddSchoolPost = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!schoolCouncil?._id) {
      toast.error('School council is not ready yet.')
      return
    }
    if (!schoolPostTitle.trim()) {
      toast.error('Post title is required.')
      return
    }
    setSaving(true)
    try {
      await api.post('/actvt/council-posts', {
        councilId: schoolCouncil._id,
        title: schoolPostTitle.trim(),
        seats: Number(schoolPostSeats) || 1,
        preferredGender: schoolPostGender,
        preferredClasses: schoolPostClasses,
      })
      setSchoolPostTitle('')
      setSchoolPostSeats('1')
      setSchoolPostGender('')
      setSchoolPostClasses([])
      setShowSchoolPostForm(false)
      await loadBoard()
    } catch (error: any) {
      // API interceptor already shows the error toast.
    } finally {
      setSaving(false)
    }
  }

  const onStartEditSchoolPost = (post: CouncilPost) => {
    setEditingPostId(String(post._id || ''))
    setEditGender(post.preferredGender || '')
    setEditClasses([...(post.preferredClasses || [])])
  }

  const onSaveSchoolPostEligibility = async (post: CouncilPost) => {
    if (!post._id) return
    setSaving(true)
    try {
      await api.put(`/actvt/council-posts/${post._id}`, {
        preferredGender: editGender,
        preferredClasses: editClasses,
      })
      setEditingPostId('')
      await loadBoard()
    } catch (error: any) {
      // API interceptor already shows the error toast.
    } finally {
      setSaving(false)
    }
  }

  const onAddHousePost = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!houses.length) {
      toast.error('Add a house first to add posts to the house council.')
      return
    }
    if (!housePostTitle.trim()) {
      toast.error('Post title is required.')
      return
    }
    setSaving(true)
    try {
      await api.post('/actvt/council-posts', {
        title: housePostTitle.trim(),
        seats: Number(housePostSeats) || 1,
        applyToAllHouseCouncils: true,
      })
      setHousePostTitle('')
      setHousePostSeats('1')
      setShowHousePostForm(false)
      await loadBoard()
    } catch (error: any) {
      // API interceptor already shows the error toast.
    } finally {
      setSaving(false)
    }
  }

  const onSetPostStatus = async (post: CouncilPost, registrationStatus: 'closed' | 'open' | 'accepting') => {
    if (!post._id) return
    try {
      await api.put(`/actvt/council-posts/${post._id}`, { registrationStatus })
      await loadBoard()
    } catch (error: any) {
      // API interceptor already shows the error toast.
    }
  }

  const onRemovePost = async (post: CouncilPost, acrossAllHouses = false) => {
    if (!post._id) return
    const label = acrossAllHouses
      ? `Remove "${post.title}" from all house councils?`
      : `Remove post "${post.title}"?`
    if (!window.confirm(label)) return
    try {
      await api.delete(`/actvt/council-posts/${post._id}`, {
        params: acrossAllHouses ? { applyToAllHouseCouncils: true } : undefined,
      })
      await loadBoard()
    } catch (error: any) {
      // API interceptor already shows the error toast.
    }
  }

  const onRegisterStudent = async (student: StudentHit) => {
    if (!selectedPostId || !selectedPost) {
      toast.error('Select a post first.')
      return
    }
    if (selectedPost.registrationStatus === 'closed') {
      toast.error('Registrations are closed for this post.')
      return
    }
    if (!isStudentEligible(selectedPost, student)) {
      toast.error(`Only ${formatEligibility(selectedPost)} students can register for this post.`)
      return
    }
    try {
      await api.post('/actvt/council-registrations', {
        postId: selectedPostId,
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        className: student.class,
        section: student.section,
        gender: student.gender,
        houseId: student.houseId || selectedCouncil?.houseId || '',
        houseName: student.house || selectedCouncil?.houseName || '',
        phone: student.phone || '',
      })
      setStudentQuery('')
      setStudentHits([])
      await loadBoard()
    } catch (error: any) {
      // API interceptor already shows the error toast.
    }
  }

  const onUpdateRegistration = async (registration: Registration, status: 'accepted' | 'rejected') => {
    if (!registration._id) return
    try {
      await api.put(`/actvt/council-registrations/${registration._id}`, { status })
      await loadBoard()
    } catch (error: any) {
      // API interceptor already shows the error toast.
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">School Council</h2>
                <p className="text-xs text-slate-500">
                  Set preferred gender and class on each post — only matching students can register
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSchoolPostForm((prev) => !prev)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add post
            </button>
          </div>

          {showSchoolPostForm ? (
            <form
              onSubmit={onAddSchoolPost}
              className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-2.5"
            >
              <input
                required
                value={schoolPostTitle}
                onChange={(event) => setSchoolPostTitle(event.target.value)}
                placeholder="Post title (e.g. Head Boy)"
                className="h-9 min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <input
                type="number"
                min={1}
                value={schoolPostSeats}
                onChange={(event) => setSchoolPostSeats(event.target.value)}
                className="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm outline-none focus:border-indigo-400"
                title="Seats"
              />
              <select
                value={schoolPostGender}
                onChange={(event) => setSchoolPostGender(event.target.value)}
                className="h-9 w-[118px] rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-400"
                title="Preferred gender"
              >
                <option value="">Any gender</option>
                {GENDER_OPTIONS.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
              <div
                className="flex h-9 min-w-[180px] max-w-[320px] flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5"
                title="Preferred class(es) — leave empty for any class"
              >
                {classOptions.length === 0 ? (
                  <span className="px-1 text-xs text-slate-400">No classes</span>
                ) : (
                  classOptions.map((className) => {
                    const active = schoolPostClasses.includes(className)
                    return (
                      <button
                        key={className}
                        type="button"
                        onClick={() => toggleClassValue(className, schoolPostClasses, setSchoolPostClasses)}
                        className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {className}
                      </button>
                    )
                  })
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="h-9 shrink-0 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </form>
          ) : null}

          {loading && !schoolCouncil ? (
            <p className="text-sm text-slate-500">Loading school council...</p>
          ) : schoolPosts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
              No school council posts yet. Click Add post to create roles like Head Boy or Head Girl.
            </p>
          ) : (
            <div className="space-y-2">
              {schoolPosts.map((post) => (
                <div key={post._id} className="space-y-2">
                  <PostRow
                    post={post}
                    showEligibility
                    active={String(post._id) === selectedPostId}
                    onSelect={() => setSelectedPostId(String(post._id || ''))}
                    onSetStatus={onSetPostStatus}
                    onRemove={() => void onRemovePost(post, false)}
                    onEditEligibility={() => onStartEditSchoolPost(post)}
                  />
                  {editingPostId === String(post._id) ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs">
                          <span className="mb-1 block font-medium text-slate-600">Preferred gender</span>
                          <select
                            value={editGender}
                            onChange={(event) => setEditGender(event.target.value)}
                            className={fieldClass}
                          >
                            <option value="">Any gender</option>
                            {GENDER_OPTIONS.map((gender) => (
                              <option key={gender} value={gender}>{gender}</option>
                            ))}
                          </select>
                        </label>
                        <div className="text-xs">
                          <span className="mb-1 block font-medium text-slate-600">Preferred class(es)</span>
                          <div className="flex flex-wrap gap-1.5">
                            {classOptions.map((className) => {
                              const active = editClasses.includes(className)
                              return (
                                <button
                                  key={className}
                                  type="button"
                                  onClick={() => toggleClassValue(className, editClasses, setEditClasses)}
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                                    active
                                      ? 'bg-indigo-600 text-white'
                                      : 'border border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  {className}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void onSaveSchoolPostEligibility(post)}
                          className="h-9 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          Save eligibility
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPostId('')}
                          className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">House Councils</h2>
                <p className="text-xs text-slate-500">
                  Auto-created for each house · posts added here apply to all houses
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!houses.length) {
                  toast.error('Add a house first to add posts to the house council.')
                  return
                }
                setShowHousePostForm((prev) => !prev)
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              Add post
            </button>
          </div>

          {!houses.length ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-8 text-center">
              <p className="text-sm font-medium text-amber-900">Add a house first to add posts to the house council.</p>
              <Link
                to="/actvt/houses"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Go to Houses
              </Link>
            </div>
          ) : (
            <>
              {showHousePostForm ? (
                <form onSubmit={onAddHousePost} className="mb-4 grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                  <input
                    required
                    value={housePostTitle}
                    onChange={(event) => setHousePostTitle(event.target.value)}
                    placeholder="Post title (e.g. House Captain) — added to all houses"
                    className={fieldClass}
                  />
                  <input
                    type="number"
                    min={1}
                    value={housePostSeats}
                    onChange={(event) => setHousePostSeats(event.target.value)}
                    className={fieldClass}
                    title="Seats"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </form>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                {houseCouncils.map((council) => (
                  <div key={council._id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            houses.find((house) => String(house._id) === String(council.houseId))?.color || '#94a3b8',
                        }}
                      />
                      <h3 className="font-semibold text-slate-900">
                        {council.houseName || council.name || 'House'} Council
                      </h3>
                    </div>
                    {(council.posts || []).length === 0 ? (
                      <p className="text-xs text-slate-500">No posts yet for this house.</p>
                    ) : (
                      <div className="space-y-2">
                        {(council.posts || []).map((post) => (
                          <PostRow
                            key={post._id}
                            post={post}
                            compact
                            active={String(post._id) === selectedPostId}
                            onSelect={() => setSelectedPostId(String(post._id || ''))}
                            onSetStatus={onSetPostStatus}
                            onRemove={() => void onRemovePost(post, true)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {selectedPost ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Registrations · {selectedPost.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCouncil?.councilType === 'house'
                    ? `${selectedCouncil.houseName || 'House'} council`
                    : 'School council'}
                  {' · '}Preferred: {formatEligibility(selectedPost)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[selectedPost.registrationStatus || 'closed']}`}>
                {selectedPost.registrationStatus || 'closed'}
              </span>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={studentQuery}
                  onChange={(event) => setStudentQuery(event.target.value)}
                  placeholder="Search students by name..."
                  className={`${fieldClass} pl-9`}
                  disabled={selectedPost.registrationStatus === 'closed'}
                />
              </div>
              {searchingStudents ? <p className="mt-2 text-xs text-slate-500">Searching...</p> : null}
              {studentHits.length > 0 ? (
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-slate-100 p-2">
                  {eligibleStudentHits.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-slate-500">
                      No matching students for this post’s preferred gender/class.
                    </p>
                  ) : (
                    eligibleStudentHits.map((student) => (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => void onRegisterStudent(student)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-500">
                            {student.gender || 'Gender —'}
                            {student.class ? ` · Class ${student.class}` : ''}
                            {student.section ? `-${student.section}` : ''}
                            {student.rollNumber ? ` · ${student.rollNumber}` : ''}
                            {student.house ? ` · ${student.house}` : ''}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-indigo-600">Register</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              {postRegistrations.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
                  No registrations for this post yet.
                </p>
              ) : (
                postRegistrations.map((item) => (
                  <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{item.studentName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone[item.status || 'pending']}`}>
                          {item.status || 'pending'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.gender || 'Gender —'}
                        {item.className ? ` · Class ${item.className}` : ''}
                        {item.section ? `-${item.section}` : ''}
                        {item.rollNumber ? ` · ${item.rollNumber}` : ''}
                        {item.houseName ? ` · ${item.houseName}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => void onUpdateRegistration(item, 'accepted')}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={() => void onUpdateRegistration(item, 'rejected')}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            <Users className="mx-auto mb-2 h-5 w-5 text-slate-400" />
            Select a post above to register students and choose council members.
          </section>
        )}
      </div>
    </div>
  )
}

const PostRow = ({
  post,
  active,
  compact = false,
  showEligibility = false,
  onSelect,
  onSetStatus,
  onRemove,
  onEditEligibility,
}: {
  post: CouncilPost
  active: boolean
  compact?: boolean
  showEligibility?: boolean
  onSelect: () => void
  onSetStatus: (post: CouncilPost, status: 'closed' | 'open' | 'accepting') => void
  onRemove: () => void
  onEditEligibility?: () => void
}) => (
  <div
    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${
      active ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100 bg-white'
    }`}
  >
    <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <p className={`font-semibold text-slate-900 ${compact ? 'text-sm' : ''}`}>{post.title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone[post.registrationStatus || 'closed']}`}>
          {post.registrationStatus || 'closed'}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {post.seats || 1} seat{(post.seats || 1) === 1 ? '' : 's'}
        {' · '}{post.pendingCount || 0} pending
        {' · '}{post.acceptedCount || 0} selected
        {showEligibility ? ` · ${formatEligibility(post)}` : ''}
      </p>
    </button>
    <div className="flex flex-wrap gap-1.5">
      {onEditEligibility ? (
        <button
          type="button"
          onClick={onEditEligibility}
          className="rounded-lg border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          Eligibility
        </button>
      ) : null}
      <button type="button" onClick={() => onSetStatus(post, 'open')} className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">Open</button>
      <button type="button" onClick={() => onSetStatus(post, 'accepting')} className="rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50">Accepting</button>
      <button type="button" onClick={() => onSetStatus(post, 'closed')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Close</button>
      <button type="button" onClick={onRemove} className="rounded-lg border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
)

export default ActvtStudentCouncil
