import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Award,
  Download,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import api from '@/services/api'

type StudentProfile = {
  student: {
    _id: string
    rollNumber?: string
    classRollNo?: number | null
    name?: string
    class?: string
    section?: string
    gender?: string
    fatherName?: string
    motherName?: string
    house?: string
    houseId?: string
    profileImage?: string
  }
  house?: {
    _id?: string
    name?: string
    color?: string
    logo?: string
    tagline?: string
  } | null
  certificates: Array<{
    _id?: string
    title?: string
    eventTitle?: string
    eventDate?: string
    houseName?: string
    role?: string
    issuedOn?: string
    className?: string
    section?: string
    participantName?: string
  }>
  medals: Array<{
    _id?: string
    title?: string
    eventTitle?: string
    role?: string
    issuedOn?: string
  }>
  activities: Array<{
    _id?: string
    title?: string
    date?: string
    activityType?: string
    status?: string
    venue?: string
    participated?: boolean
    certificateCount?: number
  }>
  metrics: {
    activityScore: number
    diversityScore: number
    activenessScore: number
    participationCount: number
    medalCount: number
    uniqueActivities: number
    uniqueRoles: number
    housePointsTotal: number
  }
}

const isLikelyColor = (value = '') => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

const scoreTone = (value: number) => {
  if (value >= 75) return 'text-emerald-700'
  if (value >= 45) return 'text-amber-700'
  return 'text-slate-700'
}

const ScoreMeter = ({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${scoreTone(value)}`}>{value}</p>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-indigo-500 transition-all"
        style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
      />
    </div>
    <p className="mt-2 text-xs text-slate-500">{hint}</p>
  </div>
)

const ActvtStudentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement | null>(null)
  const [data, setData] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [printCertId, setPrintCertId] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const response = await api.get(`/actvt/students/${id}/profile`)
      setData((response.data?.data || null) as StudentProfile | null)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.message || 'Failed to load student profile.'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const printCertificate = useMemo(
    () => (data?.certificates || []).find((item) => String(item._id) === printCertId) || null,
    [data?.certificates, printCertId]
  )

  useEffect(() => {
    if (!printCertId || !printCertificate) return
    const timer = window.setTimeout(() => {
      window.print()
      setPrintCertId('')
    }, 120)
    return () => window.clearTimeout(timer)
  }, [printCertId, printCertificate])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Loading student activity profile...</p>
      </div>
    )
  }

  if (!data?.student) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Student not found.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 text-sm font-semibold text-indigo-600"
        >
          Go back
        </button>
      </div>
    )
  }

  const student = data.student
  const house = data.house
  const tone = isLikelyColor(house?.color || '') ? house!.color! : '#4f46e5'
  const backTo = house?._id ? `/actvt/houses/${house._id}` : '/actvt/houses'
  const participated = data.activities.filter((item) => item.participated)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1400px] space-y-6 print:hidden">
        <div
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
        >
          <div
            className="relative px-6 py-5"
            style={{ background: `linear-gradient(135deg, ${tone}, ${tone}b8)` }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_55%)]" />
            <div className="relative z-[1] flex flex-wrap items-center gap-5">
              <Link
                to={backTo}
                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-white/30"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to house
              </Link>

              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
                {student.profileImage ? (
                  <img src={student.profileImage} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
                    style={{ backgroundColor: tone }}
                  >
                    {initialsOf(student.name)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-white">
                <h1 className="text-2xl font-bold">{student.name}</h1>
                <p className="mt-1 text-sm opacity-90">
                  Adm {student.rollNumber || '—'}
                  {student.classRollNo != null ? ` · Roll ${student.classRollNo}` : ''}
                  {student.class ? ` · ${student.class}` : ''}
                  {student.section ? `-${student.section}` : ''}
                </p>
                <p className="mt-1 text-sm opacity-80">
                  {house?.name || student.house || 'No house'}
                  {student.gender ? ` · ${student.gender}` : ''}
                  {student.fatherName ? ` · ${student.fatherName}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ScoreMeter
            label="Activity score"
            value={data.metrics.activityScore}
            hint={`${data.metrics.participationCount} certificates · ${data.metrics.medalCount} medals`}
          />
          <ScoreMeter
            label="Diversity"
            value={data.metrics.diversityScore}
            hint={`${data.metrics.uniqueActivities} distinct activities · ${data.metrics.uniqueRoles} roles`}
          />
          <ScoreMeter
            label="Activeness"
            value={data.metrics.activenessScore}
            hint="How consistently they show up across house events"
          />
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">House points</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{data.metrics.housePointsTotal}</p>
            <p className="mt-2 text-xs text-slate-500">Total points for {house?.name || 'their house'}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Wall of fame</h2>
          </div>
          {data.medals.length === 0 && data.certificates.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
              No certificates or medals yet. Generate certificates from ACTVT → Certificates after activities.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(data.medals.length > 0 ? data.medals : data.certificates.slice(0, 6)).map((item) => (
                <article
                  key={item._id}
                  className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Medal className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.role || 'Participant'}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.eventTitle || item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.issuedOn || 'Date not set'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Activities participated ({participated.length})
              </h2>
            </div>
            {participated.length === 0 ? (
              <p className="text-sm text-slate-500">
                No linked participation yet. Certificates tied to this student will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {participated.map((item) => (
                  <div key={item._id} className="rounded-2xl border border-slate-100 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Participated
                      </span>
                      {item.activityType ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.activityType}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.date || 'No date'}
                      {item.venue ? ` · ${item.venue}` : ''}
                      {item.certificateCount ? ` · ${item.certificateCount} certificate(s)` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Certificates ({data.certificates.length})
              </h2>
            </div>
            {data.certificates.length === 0 ? (
              <p className="text-sm text-slate-500">No certificates on record for this student.</p>
            ) : (
              <div className="space-y-2">
                {data.certificates.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.eventTitle || 'Activity'}
                        {item.role ? ` · ${item.role}` : ''}
                        {item.issuedOn ? ` · Issued ${item.issuedOn}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrintCertId(String(item._id || ''))}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Engagement snapshot</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Participations</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{data.metrics.participationCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medals / placements</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{data.metrics.medalCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activity breadth</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{data.metrics.uniqueActivities}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Diversity and activeness scores rise when the student takes part in different kinds of activities
            and earns certificates across the year — not just one event type.
          </p>
        </section>
      </div>

      <div ref={printRef} className="hidden print:block">
        {printCertificate ? (
          <div className="flex min-h-[90vh] flex-col items-center justify-center border-[10px] border-indigo-700 px-12 py-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-700">CAPABBLE · ACTVT</p>
            <h1 className="mt-6 text-4xl font-bold text-slate-900">{printCertificate.title || 'Certificate'}</h1>
            <p className="mt-8 text-base text-slate-600">This is to certify that</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {printCertificate.participantName || student.name}
            </p>
            {(printCertificate.className || printCertificate.section || student.class) ? (
              <p className="mt-2 text-sm text-slate-500">
                Class {printCertificate.className || student.class || '—'}
                {(printCertificate.section || student.section)
                  ? `-${printCertificate.section || student.section}`
                  : ''}
              </p>
            ) : null}
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-slate-600">
              has been awarded this certificate
              {printCertificate.role ? ` as ${printCertificate.role}` : ''}
              {printCertificate.eventTitle ? ` for ${printCertificate.eventTitle}` : ''}
              {printCertificate.houseName ? ` representing ${printCertificate.houseName}` : ''}.
            </p>
            <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-8 text-sm text-slate-600">
              <div>
                <div className="mx-auto mb-2 h-px w-40 bg-slate-300" />
                Date: {printCertificate.issuedOn || printCertificate.eventDate || '—'}
              </div>
              <div>
                <div className="mx-auto mb-2 h-px w-40 bg-slate-300" />
                Authorised Signatory
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ActvtStudentProfile
